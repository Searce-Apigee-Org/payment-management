import { logger } from '@globetel/cxs-core/core/logger/index.js';

const generateEntityDetailList = (installmentDetails) => {
  const entityDetails = {};
  let entityDetailList = [];

  entityDetails.bank = installmentDetails.bank;
  entityDetails.term = installmentDetails.term;
  entityDetails.interval = installmentDetails.interval;
  entityDetails.percentage = installmentDetails.percentage;
  entityDetails.cardType = installmentDetails.cardType;
  entityDetails.cardBrand = installmentDetails.cardBrand;

  entityDetailList.push(entityDetails);

  logger.info('ENTITY_DETAIL_LIST', entityDetailList);

  return entityDetailList;
};

const buyLoadRequest = (transaction, tokenPaymentId, mobileNumber) => {
  const buyLoadRequest = {
    mobileNumber,
    keyword: transaction.keyword,
    wallet: transaction.wallet,
    amount: transaction.amount.toString(),
    tokenPaymentId,
    agentName: transaction.agentName ?? null,
    externalTransactionId: transaction.externalTransactionId ?? null,
  };

  return buyLoadRequest;
};

const purchasePromoRequest = (t, mobileNumber) => {
  const request = {
    keyword: t.keyword,
    mobileNumber,
    serviceID: t.serviceId,
    price: t.amount.toString(),
    param: t.param,
  };

  return request;
};

const ecPayRequest = (t) => {
  const req = {
    partnerReferenceNumber: t.partnerReferenceNumber,
    billerName: t.billerName,
    accountNumber: t.accountNumber,
    accountIdentifier: t.accountIdentifier,
    amountToPay: t.amountToPay.toString(),
    serviceCharge: t.serviceCharge.toString(),
    totalAmount: t.totalAmount.toString(),
  };

  return req;
};

const buyRoamingRequest = (
  t,
  tokenPaymentId,
  mobileNumber,
  channelName,
  paymentType
) => {
  const req = {
    mobileNumber,
    prsId: t.serviceId,
    denomination: t.param.toString(),
    activationDate: t.activationDate,
    targetDestination: t.targetDestination,
    originatingChannel: channelName,
    tokenPaymentId,
    paymentType,
  };

  return req;
};

const buyVoucherRequest = (t, s, tokenPaymentId, vouchers) => {
  return {
    tokenPaymentId,
    serviceNumber: t.serviceNumber,
    mobileNumber: s.mobileNumber,
    accountNumber: s.accountNumber,
    vouchers,
  };
};

const createOrderExternalRequest = (identityValue, paymentId, orders) => {
  return {
    identityType: 'ACCOUNT_ID',
    identityValue,
    paymentId,
    orders,
  };
};

const globeOnlineCallbackRequest = (notificationPayload, channelId) => {
  return {
    channelId,
    tokenPaymentId: notificationPayload.paymentId,
    paymentStatusRemarks: notificationPayload.accounts?.[0]?.refusalReasonRaw,
    paymentAccounts: (notificationPayload.accounts || []).map((a) => ({
      paymentStatus: notificationPayload.accounts?.[0]?.status,
      accountNumber: a.accountNumber,
    })),
  };
};

const globeOnlineCallbackCardRequest = (
  notificationPayload,
  channelId,
  accountsList,
  installment
) => {
  const req = {
    channelId,
    tokenPaymentId: notificationPayload.paymentId,
    paymentStatusRemarks: notificationPayload.status,
    paymentAccounts: (accountsList || []).map((a) => ({
      accountNumber: a,
      paymentStatus: notificationPayload.status,
    })),
  };

  if (installment?.installmentDetails?.length) {
    const detail = installment.installmentDetails[0];

    req.installmentDetails = {
      bank: detail.bank,
      term: detail.term,
      interval: detail.interval,
      percentage: detail.percentage,
      cardType: detail.cardType,
      cardBrand: detail.cardBrand,
    };
  }

  return req;
};

export {
  buyLoadRequest,
  buyRoamingRequest,
  buyVoucherRequest,
  createOrderExternalRequest,
  ecPayRequest,
  generateEntityDetailList,
  globeOnlineCallbackCardRequest,
  globeOnlineCallbackRequest,
  purchasePromoRequest,
};
