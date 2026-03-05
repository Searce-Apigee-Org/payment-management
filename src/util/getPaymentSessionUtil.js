import { constants } from './index.js';

const checkXendit = (paymentDetails) => {
  return !(
    paymentDetails.paymentType &&
    paymentDetails.paymentType === constants.PAYMENT_TYPES.XENDIT &&
    paymentDetails.settlementDetails?.[0]?.refund
  );
};

const filterPaymentDetails = (settlementDetail) => {
  let finalTransactions = [];
  if (
    settlementDetail.transactions &&
    settlementDetail.transactions.length > 0
  ) {
    for (let transaction of settlementDetail.transactions) {
      if (
        settlementDetail.requestType === constants.PAYMENT_REQUEST_TYPES.ECPAY
      ) {
        transaction.transactionId = transaction.transactionId ?? '';
        transaction.processingFee = null;
      }

      transaction.questFlag = null;
      finalTransactions.push(transaction);
    }

    settlementDetail.transactions = finalTransactions;
  }

  if (
    (settlementDetail.requestType ===
      constants.PAYMENT_REQUEST_TYPES.BBPREPAIDPROMO ||
      settlementDetail.requestType ===
        constants.PAYMENT_REQUEST_TYPES.BBPREPAIDREPAIR) &&
    settlementDetail.status === 'GCASH_AUTHORISED'
  ) {
    let transaction = {};
    const coer = {
      orderId: settlementDetail.orderId ?? '',
      status:
        settlementDetail.orderId === null
          ? constants.PAYMENT_STATUS.FAILED
          : constants.PAYMENT_STATUS.SUCCESS,
    };

    transaction.createOrderExternal = coer;

    if (
      settlementDetail.requestType ===
      constants.PAYMENT_REQUEST_TYPES.BBPREPAIDREPAIR
    ) {
      const abr = {
        appointmentId: settlementDetail.appointmentId ?? '',
        status:
          settlementDetail.appointmentId === null
            ? constants.PAYMENT_STATUS.FAILED
            : constants.PAYMENT_STATUS.SUCCESS,
      };

      transaction.appointmentBooking = abr;
    }

    finalTransactions.push(transaction);
    settlementDetail.transactions = finalTransactions;
  }
};

export { checkXendit, filterPaymentDetails };
