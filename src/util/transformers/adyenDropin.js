import * as constants from '../constants.js';

const generateAdyenDropinRequest = (request) => {
  const {
    platform = null,
    shopperLocale,
    browserInformation = {},
    responseUrl = null,
    entityType = null,
    shopperReference = null,
  } = request;

  return {
    platform,
    shopperLocale,
    browserInformation,
    responseUrl,
    entityType,
    shopperReference,
  };
};

const generateDropinPaymentServiceRequest = (cxsRequest, dropinRequest) => {
  //TODO - add in consts
  const gatewayProcessor = 'generic';
  let paymentInfo = {
    currency: cxsRequest.currency || null,
    countryCode: cxsRequest.countryCode || null,
    shopperLocale: dropinRequest.shopperLocale || null,
    platform: dropinRequest.platform?.trim() || null,
    responseURL: dropinRequest.responseUrl?.trim() || null,
    paymentMethod: constants.PAYMENT_TYPES.DROPIN.toLowerCase(),
  };

  if (dropinRequest.browserInformation) {
    paymentInfo.browserInfo = {};
    paymentInfo.browserInfo.userAgent =
      dropinRequest.browserInformation.userAgent?.trim() || null;
    paymentInfo.browserInfo.acceptHeader =
      dropinRequest.browserInformation.acceptHeader;
  }

  if (dropinRequest.entityType) {
    paymentInfo.entityType = dropinRequest.entityType.trim() || null;
  }

  if (dropinRequest.shopperReference) {
    paymentInfo.shopperReference = dropinRequest.shopperReference;
  }

  return { gatewayProcessor, paymentInfo };
};

export { generateAdyenDropinRequest, generateDropinPaymentServiceRequest };
