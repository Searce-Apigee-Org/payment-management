import logger from '@globetel/cxs-core/core/logger/logger.js';
import Decimal from 'decimal.js';
import { constants, stringUtil } from './index.js';

const isRefund = (notificationPayload) => {
  let counter = 0;
  const { transactionId, status, refundAmount } = notificationPayload;

  if (transactionId) counter++;
  if (status) counter++;
  if (refundAmount) counter++;

  if (counter === 3) return true;

  return false;
};

const shouldRecomputeRefund = (paymentDetails, notificationPayload) => {
  const { paymentType } = paymentDetails;
  const { status } = notificationPayload;

  const {
    PAYMENT_TYPES: { XENDIT, CARD },
  } = constants;

  const isEligible =
    stringUtil.compareLowerCase(paymentType, XENDIT) ||
    stringUtil.compareLowerCase(paymentType, CARD);

  const includesStatus =
    status?.includes('FOR_REQUEST') ||
    status?.includes('REQUESTED') ||
    status?.includes('REFUND_FAILED');

  return isEligible && includesStatus;
};

const shouldHandleStatus = (notificationPayload, paymentDetails, isRefund) => {
  if (isRefund) return false;

  logger.info('shouldHandleStatus - paymentDetails:', paymentDetails);
  logger.info('shouldHandleStatus - notificationPayload:', notificationPayload);

  const {
    PAYMENT_TYPES: { CARD },
  } = constants;

  let hasAccounts = false;
  let isCard = false;
  let hasStatus = false;

  if (notificationPayload.accounts) {
    hasAccounts = true;
  }

  if (stringUtil.compareLowerCase(paymentDetails?.paymentType, CARD)) {
    logger.info('Payment type is CARD, setting isCard to true');
    isCard = true;
  }

  if (notificationPayload?.status) {
    logger.info('Notification payload has status:', notificationPayload.status);
    hasStatus = true;
  }

  return hasAccounts || (isCard && hasStatus);
};

const setXenditRefundStatus = (notificationPayload, paymentDetails) => {
  try {
    const {
      PAYMENT_STATUS: { FAILED, REFUND_FAILED },
    } = constants;

    const errorObject = notificationPayload.error;
    paymentDetails.createPaymentSessionError = errorObject.message;

    paymentDetails.settlementDetails?.forEach((settlement) => {
      const failedTxn = settlement.transactions?.find((txn) =>
        stringUtil.compareLowerCase(txn.provisionStatus, FAILED)
      );

      if (failedTxn) {
        settlement.refund = {
          amount: new Decimal(failedTxn.amount),
          status: REFUND_FAILED,
        };
      }
    });
  } catch (error) {
    logger.error('PAYLOAD_ERROR_INVALID', error);
  }
};

const setErrorMessage = (notificationPayload, paymentDetails) => {
  const {
    PAYMENT_SESSIONS: { CREATE_FAILED },
    PAYMENT_TYPES: { XENDIT },
    PAYMENT_SESSION_STATUS: { XENDIT_REFUSED },
  } = constants;

  const { paymentType } = paymentDetails;

  paymentDetails.createPaymentSessionError = CREATE_FAILED;

  try {
    const error = notificationPayload?.error;

    if (typeof error === 'string') {
      paymentDetails.createPaymentSessionError = error;
    } else if (Array.isArray(error)) {
      paymentDetails.createPaymentSessionError =
        error
          .map((e) => e?.message)
          .filter(Boolean)
          .join(' | ') || CREATE_FAILED;
    } else if (typeof error === 'object' && error !== null) {
      paymentDetails.createPaymentSessionError = error.message || CREATE_FAILED;

      if (stringUtil.compareLowerCase(paymentType, XENDIT)) {
        return {
          shouldUpdateStatus: true,
          status: XENDIT_REFUSED,
          refusalReason: error.error_code ?? null,
        };
      }
    }
  } catch (err) {
    logger.error('PAYLOAD_ERROR_INVALID', err);
  }

  if (paymentType && !stringUtil.compareLowerCase(paymentType, XENDIT)) {
    return {
      shouldUpdateStatus: true,
      status: CREATE_FAILED,
      refusalReason: null,
    };
  }

  return { shouldUpdateStatus: false };
};

const setPaymentChannelCS = (paymentEntity) => {
  const {
    PAYMENT_TYPES: { XENDIT: PAYMENT_TYPE_XENDIT, CARD: PAYMENT_TYPE_CARD },
    PAYMENT_MODES: {
      DIRECT_DEBIT: TYPE_DIRECT_DEBIT,
      EWALLET: TYPE_EWALLET,
      CC_DC: TYPE_CC_DC,
    },
  } = constants;

  let paymentChannel = paymentEntity.paymentType;

  try {
    if (
      paymentEntity.paymentType === PAYMENT_TYPE_XENDIT ||
      paymentEntity.paymentType === PAYMENT_TYPE_CARD
    ) {
      const paymentInformation = paymentEntity.paymentInformation;

      if (!paymentInformation || typeof paymentInformation !== 'object') {
        return paymentChannel;
      }

      const { type, channelCode } = paymentInformation;

      if (
        type &&
        channelCode &&
        (stringUtil.compareLowerCase(type, TYPE_DIRECT_DEBIT) ||
          stringUtil.compareLowerCase(type, TYPE_EWALLET))
      ) {
        paymentChannel = `${type} - ${channelCode}`;
      }

      if (type && stringUtil.compareLowerCase(type, TYPE_CC_DC)) {
        paymentChannel = TYPE_CC_DC;
      }
    }
  } catch (err) {
    logger.error('PAYMENT_CHANNEL_CS: Error parsing data', err);
  }

  return paymentChannel;
};

const setRefundStatus = (notificationPayload, paymentDetails) => {
  const {
    PAYMENT_TYPES: { XENDIT: PAYMENT_TYPE_XENDIT, CARD: PAYMENT_TYPE_CARD },
    PAYMENT_REQUEST_TYPES: { BUY_PROMO },
    PAYMENT_STATUS: {
      REFUND_REQUESTED,
      REFUND_SUCCESS,
      REFUND_FAILED,
      APPROVED,
    },
  } = constants;

  const refundStatus = notificationPayload.status?.toUpperCase();

  let refundAmount = new Decimal(0);

  logger.info('REFUND AMOUNT RECEIVED', notificationPayload.refundAmount);

  if (paymentDetails.paymentDetails) {
    refundAmount = new Decimal(paymentDetails.paymentDetails.paymentAmount);

    for (const settlement of paymentDetails.settlementDetails || []) {
      if (settlement.requestType === BUY_PROMO) {
        const firstTxn = settlement.transactions?.[0];

        if (firstTxn?.provisionStatus === 'SUCCESS') {
          refundAmount = settlement.transactions
            .filter((txn) => txn.provisionStatus !== 'SUCCESS')
            .reduce(
              (sum, txn) => sum.plus(new Decimal(txn.amount)),
              new Decimal(0)
            );
        }
      }
    }
  }

  logger.info('REFUND AMOUNT FROM FILTER', refundAmount.toString());

  const requestRefundAmount = new Decimal(notificationPayload.refundAmount);

  const isXenditOrCard =
    stringUtil.compareLowerCase(
      paymentDetails.paymentType,
      PAYMENT_TYPE_XENDIT
    ) ||
    stringUtil.compareLowerCase(paymentDetails.paymentType, PAYMENT_TYPE_CARD);

  if (isXenditOrCard) {
    refundAmount = refundAmount.gt(0) ? refundAmount : requestRefundAmount;
  } else {
    refundAmount = refundAmount.gt(0)
      ? refundAmount
      : notificationPayload.refundAmount.includes('.')
        ? requestRefundAmount
        : requestRefundAmount.div(100);
  }

  const firstSettlement = paymentDetails.settlementDetails?.[0];

  if (!firstSettlement) return;

  const isRequested =
    refundStatus?.includes('REQUESTED') ||
    refundStatus?.includes('FOR_REQUEST');

  if (isXenditOrCard && isRequested) {
    firstSettlement.refund = {
      amount: refundAmount,
      status: REFUND_REQUESTED,
    };
  } else {
    firstSettlement.refund = {
      amount: refundAmount,
      status: refundStatus?.includes(APPROVED) ? REFUND_SUCCESS : REFUND_FAILED,
    };
  }
};

const deriveStatusFields = (notificationPayload, paymentDetails) => {
  const {
    PAYMENT_TYPES: { CARD },
  } = constants;

  if (
    stringUtil.compareLowerCase(paymentDetails.paymentType, CARD) &&
    notificationPayload.status
  ) {
    return {
      status: notificationPayload.status,
      description: notificationPayload.description,
      refusalReasonRaw: null,
    };
  }

  const acc = notificationPayload?.accounts?.[0] || {};

  return {
    status: acc.status,
    description: acc.description,
    refusalReasonRaw: acc.refusalReasonRaw,
  };
};

const applyStatusRemarks = (paymentDetails, description) => {
  const {
    PAYMENT_TYPES: { XENDIT, CARD },
  } = constants;

  if (
    !description ||
    ![XENDIT, CARD].some((t) =>
      stringUtil.compareLowerCase(paymentDetails.paymentType, t)
    )
  )
    return;

  (paymentDetails.settlementDetails || []).forEach(
    (a) => (a.statusRemarks = description)
  );
};

const getEsimEmailInvocationContext = (paymentDetails, req) => {
  const { headers } = req;
  const { ESIM_REQUEST_TYPES: esimRequestTypes } = constants;

  const firstSettlement = paymentDetails?.settlementDetails?.[0];
  const requestType = firstSettlement?.requestType;

  if (!requestType || !esimRequestTypes.includes(requestType.toUpperCase())) {
    return { shouldSendEmail: false };
  }

  let ipAddress =
    headers?.['true-client-ip'] ||
    headers?.['cf-connecting-ip'] ||
    headers?.['x-forwarded-for'];

  if (typeof ipAddress === 'string' && ipAddress.includes(',')) {
    ipAddress = ipAddress.split(',')[0];
  }

  return {
    shouldSendEmail: true,
    ipAddress: ipAddress || null,
  };
};

const handleStatusUnauthorised = (
  paymentDetails,
  ecPayTransactionDetails,
  isECPayTransaction
) => {
  const { FAILED, CANCELLED } = constants;

  const settlement = paymentDetails?.settlementDetails?.[0];
  const transactions = settlement?.transactions;

  if (Array.isArray(transactions)) {
    transactions.forEach((t) => {
      t.provisionStatus = CANCELLED;
    });

    if (isECPayTransaction) {
      ecPayTransactionDetails.paymentStatus = FAILED;
    }
  }
};

export {
  applyStatusRemarks,
  deriveStatusFields,
  getEsimEmailInvocationContext,
  handleStatusUnauthorised,
  isRefund,
  setErrorMessage,
  setPaymentChannelCS,
  setRefundStatus,
  setXenditRefundStatus,
  shouldHandleStatus,
  shouldRecomputeRefund,
};
