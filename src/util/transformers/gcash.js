import { constants } from '../index.js';

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
    extendedInfo: gcashRequest?.extendedInformation ?? null,
    subMerchantName: gcashRequest?.subMerchantName ?? null,

    envInfo: {
      orderTerminalType:
        gcashRequest?.environmentInformation?.orderTerminalType ?? null,
      terminalType: gcashRequest?.environmentInformation?.terminalType ?? null,
      appVersion: gcashRequest?.environmentInformation?.appVersion ?? null,
      osType: gcashRequest?.environmentInformation?.osType ?? null,
      clientIp: gcashRequest?.environmentInformation?.clientIp ?? null,
      merchantTerminalId:
        gcashRequest?.environmentInformation?.merchantTerminalId ?? null,
      merchantIp: gcashRequest?.environmentInformation?.merchantIp ?? null,
      extendedInfo: gcashRequest?.environmentInformation?.extendedInfo ?? null,
    },

    order: {
      orderTitle: gcashRequest?.order?.orderTitle ?? null,
      merchantTransId: gcashRequest?.order?.merchantTransId ?? null,
      merchantTransType: gcashRequest?.order?.merchantTransType ?? null,
      orderMemo: gcashRequest?.order?.orderMemo ?? null,
    },

    buyer: gcashRequest?.order?.buyer ?? null,
    seller: gcashRequest?.order?.seller ?? null,
    bindingRequestID: null,
    uuid: null,
  };

  return { gatewayProcessor, gcashPaymentInfo };
};

export { generateGcashPaymentServiceRequest, generateGcashRequest };
