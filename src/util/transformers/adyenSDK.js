import logger from '@globetel/cxs-core/core/logger/logger.js';
import { constants } from '../index.js';

const generateAdyenSDKRequest = (request = {}) => {
  const {
    allowedPaymentMethods = [],
    blockedPaymentMethods = [],
    tokenSDK = null,
    platform = null,
    returnUrl = null,
    origin = null,
    shopperLocale = null,
    browserInformation = {},
    captureDelayHours = null,
    configuration = {},
    dccQuote = {},
    enableOneClick = null,
    enablePayOut = null,
    enableRecurring = null,
    entityType = null,
    fraudOffset = null,
    lineItems = [],
    mcc = null,
    merchantData = null,
    merchantOrderReference = null,
    metadata = null,
    orderReference = null,
    customer = {},
    splitList = [],
    trustedShopper = null,
    deliveryDate = null,
  } = request;

  return {
    allowedPaymentMethods,
    blockedPaymentMethods,
    tokenSDK,
    platform,
    returnUrl,
    origin,
    shopperLocale,
    browserInformation: {
      acceptHeader: browserInformation?.acceptHeader ?? null,
      colorDepth: browserInformation?.colorDepth ?? null,
      javaEnabled: browserInformation?.javaEnabled ?? null,
      language: browserInformation?.language ?? null,
      screenHeight: browserInformation?.screenHeight ?? null,
      screenWidth: browserInformation?.screenWidth ?? null,
      timeZoneOffset: browserInformation?.timeZoneOffset ?? null,
      userAgent: browserInformation?.userAgent ?? null,
    },
    captureDelayHours,
    configuration,
    dccQuote,
    enableOneClick,
    enablePayOut,
    enableRecurring,
    entityType,
    fraudOffset,
    lineItems,
    mcc,
    merchantData,
    merchantOrderReference,
    metadata,
    orderReference,
    customer,
    splitList,
    trustedShopper,
    deliveryDate,
  };
};

const generateAdyenPaymentServiceRequest = (cxsRequest, cxsAdyenRequest) => {
  logger.debug('Generating Adyen Payment Service Request');

  const {
    PAYMENT_TYPES: { ADYEN },
  } = constants;

  const gatewayProcessor = ADYEN.toLowerCase();

  const adyenPaymentInfo = {
    countryCode: cxsRequest.countryCode || null,
    amountCurrency: cxsRequest.currency || null,
    returnUrl: cxsAdyenRequest.returnUrl || null,
    origin: cxsAdyenRequest.origin || null,
  };

  if (cxsAdyenRequest?.browserInformation) {
    const browserInformation = cxsAdyenRequest.browserInformation;
    adyenPaymentInfo.browserInfo = {
      acceptHeader: browserInformation.acceptHeader || null,
      colorDepth: browserInformation.colorDepth ?? null,
      javaEnabled: browserInformation.javaEnabled ?? null,
      language: browserInformation.language || null,
      screenHeight: browserInformation.screenHeight ?? null,
      screenWidth: browserInformation.screenWidth ?? null,
      timeZoneOffset: browserInformation.timeZoneOffset ?? null,
      userAgent: browserInformation.userAgent || null,
    };
  }

  if (cxsAdyenRequest?.entityType?.trim()) {
    adyenPaymentInfo.entityType = cxsAdyenRequest.entityType.trim();
  }

  if (cxsAdyenRequest?.shopperLocale?.trim()) {
    adyenPaymentInfo.shopperLocale = cxsAdyenRequest.shopperLocale.trim();
  }

  if (cxsAdyenRequest?.orderReference?.trim()) {
    adyenPaymentInfo.orderReference = cxsAdyenRequest.orderReference.trim();
  }

  if (cxsAdyenRequest?.metadata?.trim()) {
    adyenPaymentInfo.metadata = cxsAdyenRequest.metadata.trim();
  }

  if (cxsAdyenRequest?.platform?.trim()) {
    adyenPaymentInfo.platform = cxsAdyenRequest.platform.trim();
  }

  if (cxsAdyenRequest?.browserInformation?.language?.trim()) {
    adyenPaymentInfo.lang = cxsAdyenRequest.browserInformation.language.trim();
  }

  logger.debug('Adyen Payment Info constructed', adyenPaymentInfo);

  return {
    gatewayProcessor,
    adyenPaymentInfo,
  };
};

export { generateAdyenPaymentServiceRequest, generateAdyenSDKRequest };
