import { constants } from '../index.js';

const generateXenditDnoRequest = (dnoXenditRequest = {}) => {
  const {
    type = null,
    channelCode,
    productName = null,
    eWallet = null,
    reusability = 'ONE_TIME_USE',
    paymentMethodId = null,
    customerUuid = null,
    directDebit = null,
  } = dnoXenditRequest;

  const xenditRequest = {
    type,
    productName,
    reusability,
    paymentMethodId,
    customerUuid,
    eWallet: eWallet ? generateEWallet(eWallet) : null,
    directDebit: directDebit ? generateDirectDebit(directDebit) : null,
  };

  // Only include channelCode when it is a non-empty string.
  // Downstream PAYO validation rejects `channelCode: null`.
  if (typeof channelCode === 'string' && channelCode.trim().length > 0) {
    xenditRequest.channelCode = channelCode;
  }

  return xenditRequest;
};

const generateEWallet = (eWallet = {}) => {
  const { cancelUrl, failureUrl, successUrl } = eWallet;

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
    channelCode,
    productName = null,
    eWallet = {},
    reusability = null,
    paymentMethodId = null,
    customerUuid = null,
    directDebit = {},
    budgetProtect = null,
    oonaSkus = [],
  } = request;

  // Build common shape first
  const baseRequest = {
    type,
    reusability,
    paymentMethodId,
    customerUuid,
    budgetProtect,
    oonaSkus,
  };

  // Only include channelCode when it is a non-empty string.
  // For some Xendit types (e.g., CC_DC), channelCode is not applicable.
  if (typeof channelCode === 'string' && channelCode.trim().length > 0) {
    baseRequest.channelCode = channelCode;
  }

  // Only include productName when it is a non-empty string.
  // Downstream PAYO validation rejects `productName: null`.
  if (typeof productName === 'string' && productName.trim().length > 0) {
    baseRequest.productName = productName;
  }

  // For DIRECT_DEBIT, do NOT attach eWallet, only directDebit
  if (
    typeof type === 'string' &&
    type.toUpperCase() === constants.XENDIT_PAYMENT_METHODS.TYPE_DIRECT_DEBIT
  ) {
    return {
      ...baseRequest,
      // Legacy alignment: paymentMethodId must NOT be present for Direct Debit
      paymentMethodId: null,
      directDebit: {
        failureUrl: directDebit?.failureUrl ?? null,
        successUrl: directDebit?.successUrl ?? null,
      },
      // omit eWallet entirely for DIRECT_DEBIT (PAYO rejects null)
    };
  }

  // For CC_DC, do NOT attach directDebit / eWallet objects at all.
  // Our validator (`xenditUtil.validateXenditRequest`) rejects presence of
  // these objects for card payments, and including `{ failureUrl: null }` is
  // still "truthy" and triggers an InvalidRequestParameter.
  if (
    typeof type === 'string' &&
    type.toUpperCase() === constants.XENDIT_PAYMENT_METHODS.TYPE_CC_DC
  ) {
    return {
      ...baseRequest,
      // omit eWallet/directDebit entirely
    };
  }

  // For all other types (EWALLET, etc.), keep existing behavior
  return {
    ...baseRequest,
    eWallet: {
      cancelUrl: eWallet?.cancelUrl,
      failureUrl: eWallet?.failureUrl,
      successUrl: eWallet?.successUrl,
    },
    directDebit: {
      failureUrl: directDebit?.failureUrl ?? null,
      successUrl: directDebit?.successUrl ?? null,
    },
  };
};

const generateXenditBasePaymentInfo = (cxsRequest, xenditRequest) => {
  const {
    PAYMENT_TYPES: { XENDIT },
  } = constants;

  const gatewayProcessor = 'generic';

  // NOTE: Downstream Payment Service expects `paymentMethod` to be one of:
  // [dropin, card, paybylink, gcash].
  // Xendit flows are processed under the generic gateway, and Payment Service
  // uses `type/channelCode/...` to interpret the Xendit branch.
  //
  // IMPORTANT: For legacy compatibility with PAYO, `productName` was not
  // always sent. Recent PAYO validation rejects empty values, so we must
  // avoid sending `productName: null/''`. Only include it when we have a
  // non-empty string; otherwise, omit the field entirely.
  const paymentInfo = {
    // Legacy alignment: Xendit-specific command expects paymentMethod = "xendit".
    // This avoids PAYO applying card validation rules (like remark enum).
    paymentMethod: 'xendit',
    currency: cxsRequest?.currency ?? null,
    type: xenditRequest?.type ?? null,
    // Only include eWallet when it is a real object.
    // PAYO rejects `eWallet: null` with: "eWallet" must be of type object
    ...(xenditRequest?.eWallet && typeof xenditRequest.eWallet === 'object'
      ? { eWallet: xenditRequest.eWallet }
      : {}),
    reusability: xenditRequest?.reusability ?? null,
  };

  // Only include channelCode when it is a non-empty string.
  // PAYO rejects `channelCode: null` with: "channelCode" is not allowed to be empty
  const rawChannelCode = xenditRequest?.channelCode;
  if (typeof rawChannelCode === 'string' && rawChannelCode.trim().length > 0) {
    paymentInfo.channelCode = rawChannelCode;
  }

  const rawProductName = xenditRequest?.productName;
  if (typeof rawProductName === 'string' && rawProductName.trim().length > 0) {
    paymentInfo.productName = rawProductName;
  }

  return { gatewayProcessor, paymentInfo };
};

export {
  generateXenditBasePaymentInfo,
  generateXenditDnoRequest,
  generateXenditRequest,
};
