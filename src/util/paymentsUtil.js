import constants from '@globetel/cxs-core/core/constants/index.js';
import logger from '@globetel/cxs-core/core/logger/logger.js';
import Decimal from 'decimal.js';
import { constants as localConstants, stringUtil } from './index.js';

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
    paymentType?.toLowerCase() !==
    localConstants.PAYMENT_TYPES.XENDIT.toLowerCase()
  ) {
    return false;
  }

  logger.info(
    `Checking valid channel for payment type XENDIT (channel=${channel}, optionalCondition=${optionalCondition})`,
    { channel, optionalCondition }
  );

  const {
    CHANNELS: { NG1, GO, GOMO, GOR, DNO, CXS }, //remove cxs after testing
    PAYMENT_REQUEST_TYPES: { NON_BILL },
  } = localConstants;

  let validChannels = [NG1, GO, GOMO, GOR, CXS, 'cxs-devs']; // Added 'cxs-devs' for XENDIT

  if (optionalCondition?.toLowerCase() === NON_BILL.toLowerCase()) {
    validChannels = [GO, GOMO, GOR, DNO, CXS, 'cxs-devs']; // Added 'cxs-devs'
  } else if (optionalCondition === 'SAME_AS_GO') {
    validChannels = [GO, GOR, CXS, 'cxs-devs']; // Added 'cxs-devs'
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

// Build a minimal, legacy-aligned snapshot of the payment entity
// for storage in Dynamo for CreatePaymentSession flows.
// This keeps Mongo documents rich while ensuring Dynamo only
// contains the legacy fields required by downstream consumers.
const buildLegacyCreatePaymentSnapshot = (entity) => {
  if (!entity) return entity;

  logger.debug('PAYMENTS_UTIL_BUILD_LEGACY_CREATE_PAYMENT_SNAPSHOT_START', {
    tokenPaymentId: entity?.tokenPaymentId,
    settlementCount: Array.isArray(entity?.settlementDetails)
      ? entity.settlementDetails.length
      : 0,
    hasBudgetProtectProfile: Boolean(entity?.budgetProtectProfile),
  });

  const snapshot = {
    tokenPaymentId: entity.tokenPaymentId,
    channelId: entity.channelId,
    checkoutUrl: entity.checkoutUrl,
    clientReadStatus: entity.clientReadStatus,
    createdDate: entity.createdDate ?? entity.createDate,
    deviceId: entity.deviceId,
    lastUpdatedDate: entity.lastUpdatedDate ?? entity.createDate,
    paymentInformation: entity.paymentInformation,
    paymentSession: entity.paymentSession,
    paymentType: entity.paymentType,
    userToken: entity.userToken,
  };

  // Include budgetProtectProfile only if present in the entity/request
  if (entity.budgetProtectProfile) {
    snapshot.budgetProtectProfile = entity.budgetProtectProfile;
  }

  // Normalize settlementDetails to legacy shape
  if (Array.isArray(entity.settlementDetails)) {
    snapshot.settlementDetails = entity.settlementDetails.map((s) => {
      const normalized = {
        amount: (() => {
          const amt = s?.amount;
          if (amt === null || amt === undefined) return undefined;
          if (typeof amt === 'object' && '$numberDecimal' in amt) {
            return Number(amt.$numberDecimal);
          }
          return Number(amt);
        })(),
        emailAddress: s.emailAddress,
        mobileNumber: s.mobileNumber,
        requestType: s.requestType,
        status: s.status || 'PROCESSING',
        transactionType: s.transactionType,
        oona: s.oona ?? [],
        metadata: s.metadata ?? {},
      };

      if (Array.isArray(s.transactions)) {
        normalized.transactions = s.transactions.map((t) => ({
          ...t,
          amount: (() => {
            const amt = t?.amount;
            if (amt === null || amt === undefined) return undefined;
            if (typeof amt === 'object' && '$numberDecimal' in amt) {
              return Number(amt.$numberDecimal);
            }
            return Number(amt);
          })(),
          serviceId: t.serviceId,
          param: t.param ?? t.parameterName,
          parameterName: t.param ?? t.parameterName,
          keyword: t.keyword,
          wallet: t.wallet,
          provisionStatus: t.provisionStatus || 'PROCESSING',
          transactionId:
            t.transactionId === null || t.transactionId === undefined
              ? ' '
              : t.transactionId,
        }));
      }

      return normalized;
    });
  }

  logger.debug('PAYMENTS_UTIL_BUILD_LEGACY_CREATE_PAYMENT_SNAPSHOT_OK', {
    tokenPaymentId: snapshot?.tokenPaymentId,
  });

  return snapshot;
};

const buildPaymentEntity = async (
  tokenPaymentId,
  cxsRequest,
  headers,
  channelId,
  paymentServiceRequest
) => {
  logger.debug('PAYMENTS_UTIL_BUILD_PAYMENT_ENTITY_START', {
    tokenPaymentId,
    channelId,
    paymentType: cxsRequest?.paymentType,
    requestType: cxsRequest?.settlementInformation?.[0]?.requestType,
  });

  const {
    PAYMENT_TYPES: { XENDIT, GCASH, ECPAY },
    PAYMENT_STATUS: { PROCESSING },
  } = localConstants;

  const nowIso = new Date().toISOString();

  const paymentEntity = {
    // Core identifiers
    tokenPaymentId,
    channelId,

    // Legacy-aligned session / URL defaults
    checkoutUrl: ' ',
    paymentSession: ' ',

    // Type information
    paymentType: cxsRequest.paymentType,

    // Legacy-style audit fields (for Dynamo & future Mongo migration)
    createdDate: nowIso,
    lastUpdatedDate: nowIso,
    clientReadStatus: 0,

    // Existing field kept for backward compatibility with Mongo logic
    createDate: nowIso,

    userToken: headers['user-token'],
    // Use a space as legacy-style default instead of null/undefined
    deviceId: headers['DeviceId'] ?? ' ',

    settlementDetails: [],
  };

  // Some clients (e.g., SuperApp/GCASH) send Oona SKUs under
  // `paymentInformation.oonaSkus` (not per-transaction). Persist them
  // in each transaction record as well so downstream consumers that
  // read from `settlementDetails[].transactions[].oonaSkus` (Dynamo/Mongo)
  // can reliably access them.
  const paymentInfoOonaSkus = Array.isArray(
    cxsRequest?.paymentInformation?.oonaSkus
  )
    ? cxsRequest.paymentInformation.oonaSkus
    : [];

  if (cxsRequest.paymentType === XENDIT) {
    logger.debug('PAYMENTS_UTIL_BUILD_PAYMENT_ENTITY_PATH', {
      paymentType: cxsRequest?.paymentType,
      path: 'XENDIT',
    });
    if (cxsRequest.paymentInformation) {
      paymentEntity.paymentInformation = JSON.stringify(
        cxsRequest.paymentInformation
      );

      try {
        const paymentInfoNode =
          paymentServiceRequest?.command?.payload?.paymentInfo ?? null;

        const paymentInfoObject = JSON.parse(paymentEntity.paymentInformation);

        if (paymentInfoNode?.midLabel) {
          paymentInfoObject.midLabel = paymentInfoNode.midLabel;
        }

        if (paymentInfoNode?.miscellaneous) {
          paymentInfoObject.miscellaneous = paymentInfoNode.miscellaneous;
        }

        paymentEntity.paymentInformation = JSON.stringify(paymentInfoObject);
      } catch (err) {
        logger.error('PARSING_ERROR', err);
      }
    }
  }

  for (const s of cxsRequest.settlementInformation ?? []) {
    const normalizedTransactions = Array.isArray(s.transactions)
      ? s.transactions.map((t) => ({
          ...t,
          amount:
            t?.amount !== undefined && t?.amount !== null
              ? Number(t.amount)
              : undefined,
          serviceId: t.serviceId ?? null,
          param: t.param ?? t.parameterName ?? null,
          parameterName: t.param ?? t.parameterName ?? null,
          keyword: t.keyword ?? null,
          wallet: t.wallet ?? null,
          transactionId:
            t.transactionId === null || t.transactionId === undefined
              ? ' '
              : t.transactionId,
          provisionStatus: PROCESSING,
        }))
      : undefined;

    paymentEntity.settlementDetails.push({
      ...s,
      amount:
        s?.amount !== undefined && s?.amount !== null
          ? Number(s.amount)
          : undefined,
      // Force legacy-style uppercase status for initial state
      status: PROCESSING,
      metadata:
        s?.metadata && typeof s.metadata === 'object'
          ? {
              ...s.metadata,
              startDate: s.metadata.startDate
                ? new Date(s.metadata.startDate).toISOString().split('T')[0]
                : undefined,
              endDate: s.metadata.endDate
                ? new Date(s.metadata.endDate).toISOString().split('T')[0]
                : undefined,
            }
          : {},
      transactions: normalizedTransactions,
      oona: [
        {
          oonaSku:
            Array.isArray(s.oonaSkus) && s.oonaSkus.length
              ? s.oonaSkus
              : paymentInfoOonaSkus,
        },
      ],
    });
  }

  if (cxsRequest.budgetProtectProfile) {
    logger.debug('PAYMENTS_UTIL_BUILD_PAYMENT_ENTITY_BUDGET_PROTECT_PROFILE');
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
    logger.debug('PAYMENTS_UTIL_BUILD_PAYMENT_ENTITY_PATH', {
      paymentType: cxsRequest?.paymentType,
      path: 'GCASH',
    });
    try {
      if (cxsRequest.paymentInformation) {
        // Mongo schema expects paymentInformation as a STRING
        let paymentInfoObject = { ...cxsRequest.paymentInformation };

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

        paymentEntity.paymentInformation = JSON.stringify(paymentInfoObject);
      }
    } catch (err) {
      logger.error('PARSING_ERROR', err);
    }
  }

  if (cxsRequest.paymentType === ECPAY) {
    logger.debug('PAYMENTS_UTIL_BUILD_PAYMENT_ENTITY_PATH', {
      paymentType: cxsRequest?.paymentType,
      path: 'ECPAY',
    });
    try {
      if (cxsRequest.paymentInformation) {
        paymentEntity.paymentInformation = JSON.stringify(
          cxsRequest.paymentInformation
        );
      }
    } catch (err) {
      logger.error('PARSING_ERROR', err);
    }
  }

  logger.debug('PAYMENTS_UTIL_BUILD_PAYMENT_ENTITY_OK', {
    tokenPaymentId,
    settlementCount: Array.isArray(paymentEntity?.settlementDetails)
      ? paymentEntity.settlementDetails.length
      : 0,
  });

  return paymentEntity;
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

const identifySourceChannel = (tokenPaymentId) => {
  const source = Object.entries(
    constants.promos.TRANSACTION_PREFIX_CHANNEL_EQV
  ).find(([key]) => tokenPaymentId.startsWith(key));
  return source?.[0];
};
const removeNullDeep = (value) => {
  if (value === null || value === undefined) return undefined;

  if (Array.isArray(value)) {
    const cleaned = value
      .map((v) => removeNullDeep(v))
      .filter((v) => v !== undefined);
    return cleaned.length ? cleaned : undefined;
  }

  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const cleaned = removeNullDeep(v);
      if (cleaned !== undefined) out[k] = cleaned;
    }
    return Object.keys(out).length ? out : undefined;
  }

  return value;
};

const isPaymentEligibleForRefund = (data) => {
  return data.settlementDetails.some((detail) => {
    const { status, transactions, refund } = detail;
    const provisionStatus = transactions[0]?.provisionStatus;

    console.log({ status, transactions, refund, provisionStatus });

    return (
      (status === 'GCASH_AUTHORISED' || status === 'XENDIT_AUTHORISED') &&
      provisionStatus === 'FAILED' &&
      !refund
    );
  });
};

const getChannelConfig = (tokenPaymentId, requestType, config) => {
  console.log({ tokenPaymentId, requestType, config });
  const prefix = tokenPaymentId.substring(0, 3);
  const channelConfig = config.find((channel) => channel.prefix === prefix);
  console.log({ channelConfig });
  if (!channelConfig) return false;

  const product = channelConfig.products.find((p) => p.type === requestType);
  logger.info(`REQUEST_TYPE CONFIG`, channelConfig);
  return product || false;
};

export {
  buildLegacyCreatePaymentSnapshot,
  buildPaymentEntity,
  calculateVoucherAmount,
  checkMaxVoucherAllowed,
  checkValidChannel,
  filterPayments,
  formatAmount,
  formatPayments,
  getChannelConfig,
  getRequestClientId,
  identifySourceChannel,
  isPaymentEligibleForRefund,
  removeNullDeep,
  validateTokenSDK,
};
