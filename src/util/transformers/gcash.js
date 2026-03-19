import { constants } from '../index.js';

// Align with legacy Java behavior (StringUtils.isBlank -> null)
const undefinedIfBlank = (value) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') return value;
  return value.trim() === '' ? undefined : value;
};

const generateGcashRequest = (payload) => {
  const {
    notificationUrls = [],
    signAgreementPay = null,
    extendedInformation = null,
    environmentInformation = {},
    productCode = null,
    subMerchantId = null,
    subMerchantName = null,
    order = {},
    bindingRequestID = null,
    budgetProtect = null,
    oonaSkus = [],
  } = payload;

  return {
    notificationUrls,
    signAgreementPay,
    extendedInformation,
    environmentInformation,
    productCode,
    subMerchantId,
    subMerchantName,
    order,
    bindingRequestID,
    budgetProtect,
    oonaSkus,
  };
};

const generateGcashPaymentServiceRequest = (cxsRequest, gcashRequest) => {
  const gatewayProcessor = constants.PAYMENT_TYPES.GCASH.toLowerCase();

  const gcashPaymentInfo = {
    notificationUrls: gcashRequest?.notificationUrls ?? [],
    signAgreementPay: gcashRequest?.signAgreementPay ?? null,
    extendedInfo: undefinedIfBlank(gcashRequest?.extendedInformation),
    subMerchantName: undefinedIfBlank(gcashRequest?.subMerchantName),

    envInfo: {
      orderTerminalType:
        gcashRequest?.environmentInformation?.orderTerminalType ?? null,
      terminalType: gcashRequest?.environmentInformation?.terminalType ?? null,
      appVersion: undefinedIfBlank(
        gcashRequest?.environmentInformation?.appVersion
      ),
      osType: undefinedIfBlank(gcashRequest?.environmentInformation?.osType),
      clientIp: undefinedIfBlank(
        gcashRequest?.environmentInformation?.clientIp
      ),
      merchantTerminalId: undefinedIfBlank(
        gcashRequest?.environmentInformation?.merchantTerminalId
      ),
      merchantIp: undefinedIfBlank(
        gcashRequest?.environmentInformation?.merchantIp
      ),
      extendedInfo: undefinedIfBlank(
        gcashRequest?.environmentInformation?.extendedInfo
      ),
    },

    order: {
      orderTitle: gcashRequest?.order?.orderTitle ?? null,
      merchantTransId: undefinedIfBlank(gcashRequest?.order?.merchantTransId),
      merchantTransType: undefinedIfBlank(
        gcashRequest?.order?.merchantTransType
      ),
      orderMemo: undefinedIfBlank(gcashRequest?.order?.orderMemo),
    },

    buyer: gcashRequest?.order?.buyer ?? null,
    seller: gcashRequest?.order?.seller ?? null,
    // Legacy only sets these after validateBindingId() succeeds.
    // Use undefined so JSON serialization omits them unless explicitly set.
    bindingRequestID: undefined,
    uuid: undefined,
  };

  return { gatewayProcessor, gcashPaymentInfo };
};

export { generateGcashPaymentServiceRequest, generateGcashRequest };
