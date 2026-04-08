import logger from '@globetel/cxs-core/core/logger/logger.js';
import Decimal from 'decimal.js';
import { CustomerPaymentModel } from '../models/mongo/CustomerPaymentModel.js';
import { constants, stringUtil } from './index.js';

const getRequestClientId = (req) => {
  const reqClientId = req.server.app.principalId;

  logger.info('PrincipalId: ', reqClientId);

  if (!reqClientId) {
    throw { type: 'CredentialsNotFound' };
  }

  return reqClientId;
};

const checkValidChannel = (channel, paymentType, optionalCondition) => {
  if (
    paymentType?.toLowerCase() !== constants.PAYMENT_TYPES.XENDIT.toLowerCase()
  ) {
    return false;
  }

  const {
    CHANNELS: { NG1, GO, GOMO, GOR, DNO, CXS }, //remove cxs after testing
    PAYMENT_REQUEST_TYPES: { NON_BILL },
  } = constants;

  let validChannels = [NG1, GO, GOMO, GOR, CXS]; //remove cxs after testing

  if (optionalCondition?.toLowerCase() === NON_BILL.toLowerCase()) {
    validChannels = [GO, GOMO, GOR, DNO, CXS]; //remove cxs after testing
  } else if (optionalCondition === 'SAME_AS_GO') {
    validChannels = [GO, GOR, CXS]; //remove cxs after testing
  }

  return validChannels.some((c) => c.toLowerCase() === channel?.toLowerCase());
};

const formatAmount = (amount) => {
  const truncated = Math.floor(Number(amount) * 100) / 100;
  let s = truncated.toString();
  if (s.includes('.')) s = s.replace(/\.?0+$/, '');
  return s;
};

const calculateVoucherAmount = (
  voucher,
  totalTransaction,
  settlementAmount,
  requestType,
  settlementInformation
) => {
  const PERCENT = 'percentage';
  const FIXED = 'fixed amount';

  const productsMap = Array.isArray(voucher.product)
    ? voucher.product
    : [voucher.product];

  if (!productsMap.includes(requestType)) {
    throw {
      type: 'InvalidOutboundRequest',
      details: 'The voucher is invalid',
    };
  }

  let calculatedDiscount = new Decimal(0);

  if (voucher.type === PERCENT) {
    const totalDec = new Decimal(totalTransaction);
    const discountDec = new Decimal(voucher.discount_amount);
    calculatedDiscount = totalDec
      .times(new Decimal(1).minus(discountDec.div(100)))
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  } else if (voucher.type === FIXED) {
    let sum = new Decimal(0);
    settlementInformation.transactions.forEach((transaction, idx) => {
      const amt = new Decimal(transaction.amount || 0);
      if (idx === 0) {
        sum = amt.minus(voucher.discount_amount);
      } else {
        sum = sum.plus(amt);
      }
    });
    calculatedDiscount = sum.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  const settlementDec = new Decimal(settlementAmount);

  if (!calculatedDiscount.equals(settlementDec)) {
    throw {
      type: 'InvalidOutboundRequest',
      details: 'The voucher calculation mismatch with settlement amount',
    };
  }

  return calculatedDiscount.toNumber();
};

//TODO - check error throw type with legacy
const checkMaxVoucherAllowed = (
  maxDiscount,
  totalTransAmt,
  calculatedVoucherDiscount
) => {
  const calcMaxDiscount =
    Math.round(totalTransAmt * (1 - maxDiscount / 100) * 100) / 100;

  if (calculatedVoucherDiscount > calcMaxDiscount) {
    throw {
      type: 'InvalidOutboundRequest',
      details: 'The amount is invalid',
    };
  }

  return calcMaxDiscount;
};

const validateTokenSDK = (adyenSDKRequest) => {
  if (stringUtil.compareLowerCase(adyenSDKRequest?.platform, 'WEB')) {
    if (!adyenSDKRequest?.tokenSDK) {
      throw {
        type: 'InsufficientParameter',
        message: 'tokenSDK is missing but is required.',
      };
    }

    if (!adyenSDKRequest.tokenSDK.trim()) {
      throw {
        type: 'InvalidParameter',
        message: 'Invalid tokenSDK.',
      };
    }
  }
};

const buildPaymentEntity = async (
  tokenPaymentId,
  cxsRequest,
  headers,
  channelId,
  paymentServiceRequest
) => {
  const {
    PAYMENT_TYPES: { XENDIT, GCASH, ECPAY },
    PAYMENT_STATUS: { PROCESSING },
  } = constants;

  const paymentEntity = {
    checkoutUrl: ' ',
    paymentSession: ' ',
    tokenPaymentId,
    channelId,
    paymentType: cxsRequest.paymentType,
    createdDate: new Date().toISOString(),
    userToken: headers['user-token'],
    deviceId: headers['DeviceId'],
    settlementDetails: [],
  };

  if (cxsRequest.paymentType === XENDIT) {
    if (cxsRequest.paymentInformation) {
      paymentEntity.paymentInformation = cxsRequest.paymentInformation;

      try {
        const paymentInfoNode =
          paymentServiceRequest?.command?.payload?.paymentInfo ?? null;

        const paymentInfoObject = paymentEntity.paymentInformation;

        if (paymentInfoNode?.midLabel) {
          paymentInfoObject.midLabel = paymentInfoNode.midLabel;
        }

        if (paymentInfoNode?.miscellaneous) {
          paymentInfoObject.miscellaneous = paymentInfoNode.miscellaneous;
        }

        paymentEntity.paymentInformation = paymentInfoObject;
      } catch (err) {
        logger.error('PARSING_ERROR', err);
      }
    }
  }

  for (const s of cxsRequest.settlementInformation ?? []) {
    paymentEntity.settlementDetails.push({
      ...s,
      status: PROCESSING,
    });
  }

  if (cxsRequest.budgetProtectProfile) {
    const p = cxsRequest.budgetProtectProfile;
    paymentEntity.budgetProtectProfile = {
      lastName: p.lastName,
      firstName: p.firstName,
      middleName: p.middleName,
      dateOfBirth: p.dateOfBirth,
      gender: p.gender,
      email: p.email,
      chargeAmount: p.chargeAmount,
      chargeRate: p.chargeRate,
      chargeType: p.chargeType,
      active: true,
      status: 'PENDING',
      remarks: ' ',
      message: ' ',
    };
  }

  if (cxsRequest.paymentType === GCASH) {
    try {
      if (cxsRequest.paymentInformation) {
        let paymentInfoObject = cxsRequest.paymentInformation;

        const bindingRequestId = paymentInfoObject.bindingRequestID ?? null;
        logger.info('bindingRequestId', bindingRequestId);

        if (bindingRequestId) {
          paymentInfoObject.bindingRequestID = bindingRequestId;
        }

        const gcashInfo =
          paymentServiceRequest?.command?.payload?.gcashPaymentInfo ?? null;

        if (gcashInfo?.miscellaneous) {
          paymentInfoObject.miscellaneous = gcashInfo.miscellaneous;
        }

        paymentEntity.paymentInformation = paymentInfoObject;
      }
    } catch (err) {
      logger.error('PARSING_ERROR', err);
    }
  }

  if (cxsRequest.paymentType === ECPAY) {
    try {
      if (cxsRequest.paymentInformation) {
        paymentEntity.paymentInformation = cxsRequest.paymentInformation;
      }
    } catch (err) {
      logger.error('PARSING_ERROR', err);
    }
  }

  return new CustomerPaymentModel(paymentEntity);
};

const formatPaymentDate = (paymentDate) => {
  if (!paymentDate || paymentDate.length !== 8) {
    throw new Error('Invalid payment date format. Expected YYYYMMDD');
  }

  return `${paymentDate.slice(0, 4)}-${paymentDate.slice(4, 6)}-${paymentDate.slice(6, 8)}`;
};

const formatPayments = (payments, token) => {
  const sanitizedPayments = payments.map((payment) => {
    const {
      printable,
      notified,
      paymentAmount,
      paymentDate,
      accountId,
      msisdn,
      orId,
      paymentSourceId,
      loadTime,
      ...rest
    } = payment;

    return {
      amount: paymentAmount,
      date: formatPaymentDate(paymentDate),
      accountNumber: accountId,
      mobileNumber: msisdn,
      receiptId: orId,
      sourceId: paymentSourceId,
      printable: Boolean(Number(printable)),
      notified: Boolean(Number(notified)),
      loadTime: loadTime.replace(' ', 'T'),
      ...rest,
    };
  });

  return { payments: sanitizedPayments, token };
};

const filterPayments = (payments, startDate, endDate) => {
  const startDateValue = startDate.replace(/-/g, '');
  const endDateValue = endDate.replace(/-/g, '');

  return payments.filter(
    (payment) =>
      payment.paymentDate >= startDateValue &&
      payment.paymentDate <= endDateValue
  );
};

export {
  buildPaymentEntity,
  calculateVoucherAmount,
  checkMaxVoucherAllowed,
  checkValidChannel,
  filterPayments,
  formatAmount,
  formatPayments,
  getRequestClientId,
  validateTokenSDK,
};
