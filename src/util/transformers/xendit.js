import { constants } from '../index.js';

const generateXenditDnoRequest = (dnoXenditRequest = {}) => {
  const {
    type = null,
    channelCode = null,
    productName = null,
    eWallet = null,
    reusability = 'ONE_TIME_USE',
    paymentMethodId = null,
    customerUuid = null,
    directDebit = null,
  } = dnoXenditRequest;

  const xenditRequest = {
    type,
    channelCode,
    productName,
    reusability,
    paymentMethodId,
    customerUuid,
    eWallet: eWallet ? generateEWallet(eWallet) : null,
    directDebit: directDebit ? generateDirectDebit(directDebit) : null,
  };

  return xenditRequest;
};

const generateEWallet = (eWallet = {}) => {
  const { cancelUrl = null, failureUrl = null, successUrl = null } = eWallet;

  return {
    cancelUrl,
    failureUrl,
    successUrl,
  };
};

const generateDirectDebit = (directDebit = {}) => {
  const { failureUrl = null, successUrl = null } = directDebit;

  return {
    failureUrl,
    successUrl,
  };
};

const generateXenditRequest = (request) => {
  const {
    type = null,
    channelCode = null,
    productName = null,
    eWallet = {},
    reusability = null,
    paymentMethodId = null,
    customerUuid = null,
    directDebit = {},
    budgetProtect = null,
    oonaSkus = [],
  } = request;

  return {
    type,
    channelCode,
    productName,
    eWallet: {
      cancelUrl: eWallet?.cancelUrl ?? null,
      failureUrl: eWallet?.failureUrl ?? null,
      successUrl: eWallet?.successUrl ?? null,
    },
    reusability,
    paymentMethodId,
    customerUuid,
    directDebit: {
      failureUrl: directDebit?.failureUrl ?? null,
      successUrl: directDebit?.successUrl ?? null,
    },
    budgetProtect,
    oonaSkus,
  };
};

const generateXenditBasePaymentInfo = (cxsRequest, xenditRequest) => {
  const {
    PAYMENT_TYPES: { XENDIT },
  } = constants;

  const gatewayProcessor = 'generic';

  const paymentInfo = {
    paymentMethod: XENDIT.toLowerCase(),
    type: xenditRequest?.type ?? null,
    channelCode: xenditRequest?.channelCode ?? null,
    productName: xenditRequest?.productName ?? null,
    eWallet: xenditRequest?.eWallet ?? null,
    reusability: xenditRequest?.reusability ?? null,
  };

  return { gatewayProcessor, paymentInfo };
};

export {
  generateXenditBasePaymentInfo,
  generateXenditDnoRequest,
  generateXenditRequest,
};
