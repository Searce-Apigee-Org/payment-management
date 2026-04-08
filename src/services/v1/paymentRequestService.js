import decodeUserJWT from '@globetel/cxs-core/core/jwt/decodeUserJWT.js';
import {
  constants,
  paymentsUtil,
  stringUtil,
  transformers,
  validationUtil,
  xenditUtil,
} from '../../util/index.js';

const createPaymentServiceRequest = async (paymentInfoRequest, req) => {
  const {
    validationService,
    cxsRequest,
    oonaService,
    headers,
    secret,
    secretManager,
    serviceHelpers,
    accountInfoService,
  } = req;

  // Defensive check for cxsRequest
  if (!cxsRequest || typeof cxsRequest !== 'object') {
    throw {
      type: 'InvalidRequest',
      message: 'Missing or invalid cxsRequest in request object.',
    };
  }

  let paymentSessionType;
  let gcashPaymentInfo;
  let paymentInfo;
  let gatewayProcessor;
  let adyenPaymentInfo;

  const { paymentType, settlementInformation } = cxsRequest;

  const {
    PAYMENT_TYPES: { DROPIN, GCASH, XENDIT, ADYEN },
    PAYMENT_SESSIONS: { GENERIC, CREATE, XENDIT: XENDIT_SESSION },
    PAYMENT_REQUEST_TYPES: { BUY_PROMO, PAY_BILLS },
    XENDIT_PAYMENT_METHODS: { TYPE_CC_DC, TYPE_DIRECT_DEBIT },
  } = constants;

  if (stringUtil.compareLowerCase(paymentType, DROPIN)) {
    paymentSessionType = GENERIC;
    const payload =
      transformers.adyenDropin.generateDropinPaymentServiceRequest(
        cxsRequest,
        paymentInfoRequest
      );

    ({ paymentInfo: paymentInfo, gatewayProcessor: gatewayProcessor } =
      payload);
  } else if (stringUtil.compareLowerCase(paymentType, GCASH)) {
    paymentSessionType = CREATE;
    const payload = transformers.gcash.generateGcashPaymentServiceRequest(
      cxsRequest,
      paymentInfoRequest
    );
    ({
      gcashPaymentInfo: gcashPaymentInfo,
      gatewayProcessor: gatewayProcessor,
    } = payload);

    const map = await serviceHelpers.gcash.validateBindingId(
      req,
      paymentInfoRequest
    );
    if (map) {
      gcashPaymentInfo.bindingRequestID = map.bindingId;
      gcashPaymentInfo.uuid = map.uuid;
    }

    const hasBudgetProtect = paymentInfoRequest?.budgetProtect ?? null;
    const hasBudgetProtectProfile = cxsRequest?.budgetProtectProfile ?? null;

    if (hasBudgetProtect && hasBudgetProtectProfile) {
      gcashPaymentInfo.miscellaneous =
        validationService.validateBudgetProtect(req);
    } else if (
      // eslint-disable-next-line eqeqeq
      (hasBudgetProtect === false || hasBudgetProtect == null) &&
      hasBudgetProtectProfile
    ) {
      throw {
        type: 'InvalidRequestValidateException',
        message: 'The request parameters failed in validation.',
      };
    }
  } else if (stringUtil.compareLowerCase(paymentType, ADYEN)) {
    paymentSessionType = CREATE;

    const payload = transformers.adyenSDK.generateAdyenPaymentServiceRequest(
      cxsRequest,
      paymentInfoRequest
    );

    ({
      adyenPaymentInfo: adyenPaymentInfo,
      gatewayProcessor: gatewayProcessor,
    } = payload);
  } //XENDIT
  else {
    paymentSessionType = GENERIC;
    let xenditPayload = transformers.xendit.generateXenditBasePaymentInfo(
      cxsRequest,
      paymentInfoRequest
    );
    ({ paymentInfo, gatewayProcessor } = xenditPayload);

    const { type } = paymentInfo;
    const cxsRequestType =
      cxsRequest?.settlementInformation?.[0]?.requestType?.trim() ?? null;

    if (stringUtil.compareLowerCase(type, TYPE_CC_DC)) {
      paymentInfo = {
        ...paymentInfo,
        paymentMethodId: paymentInfoRequest?.paymentMethodId ?? null,
        midLabel: null,
      };

      const apiconfig = await secretManager.apiConfigRepository.getApiConfig(
        secret,
        constants.API_NUMBERS.CREATE_PAYMENT_SESSION,
        constants.API_VERSIONS.V1,
        constants.SECRET_ENTITY.API_CONFIG
      );

      const configArray = apiconfig.config;

      const settlement = cxsRequest.settlementInformation?.[0] ?? {};
      const getAccountInfoRequest = {};

      if (settlement.mobileNumber?.trim())
        getAccountInfoRequest.msisdn = settlement.mobileNumber.trim();
      if (settlement.accountNumber?.trim())
        getAccountInfoRequest.accountNumber = settlement.accountNumber.trim();
      if (settlement.landlineNumber?.trim())
        getAccountInfoRequest.serviceNumber = settlement.landlineNumber.trim();

      let response;
      if (stringUtil.compareLowerCase(cxsRequestType, PAY_BILLS)) {
        response = await accountInfoService.getInfo(req, getAccountInfoRequest);
        if (response.statusCode.toString().includes('40002')) {
          throw {
            type: 'InvalidParameter',
          };
        }
        if (!response || response.statusCode !== 200) {
          throw {
            type: 'OperationFailed',
          };
        }
      }

      const status = response?.hipResponse?.status;

      if (status !== '00') {
        throw {
          type: 'InvalidParameter',
        };
      }

      const accountType = response?.hipResponse?.accountType ?? null;
      const accountName = response?.hipResponse?.accountName ?? null;
      const accountNumber = response?.hipResponse?.accountNumber ?? null;

      cxsRequest.settlementInformation[0].accountType = Buffer.from(
        accountType || ''
      ).toString('base64');
      cxsRequest.settlementInformation[0].accountName = Buffer.from(
        accountName || ''
      ).toString('base64');

      if (settlement.landlineNumber?.trim()) {
        cxsRequest.settlementInformation[0].accountNumber = accountNumber;
      }

      let mid = null;

      for (const configNode of configArray) {
        const requestTypeArray = configNode.requestType ?? [];
        for (const requestTypeData of requestTypeArray) {
          if (
            stringUtil.compareLowerCase(cxsRequestType, PAY_BILLS) &&
            stringUtil.compareLowerCase(requestTypeData, PAY_BILLS)
          ) {
            const accountTypeArray = configNode.accountType ?? [];
            for (const accountTypeData of accountTypeArray) {
              if (stringUtil.compareLowerCase(accountTypeData, accountType)) {
                mid = configNode.value;
                break;
              }
            }
            break;
          }

          if (stringUtil.compareLowerCase(cxsRequestType, requestTypeData)) {
            mid = configNode.value;
            break;
          }
        }
      }

      paymentInfo.midLabel = mid ?? null;
    } else if (stringUtil.compareLowerCase(type, TYPE_DIRECT_DEBIT)) {
      const userToken = headers['user-token'];
      const decodedToken = decodeUserJWT(userToken);
      const uuid = decodedToken?.userJWT?.uuid;

      const directDebitInfo = {
        customerUuid: uuid ?? null,
        directDebit: paymentInfoRequest?.directDebit ?? null,
      };

      paymentInfo = { ...paymentInfo, ...directDebitInfo };
    }

    const hasBudgetProtect = paymentInfoRequest?.budgetProtect ?? null;
    const hasBudgetProtectProfile = cxsRequest?.budgetProtectProfile ?? null;

    if (hasBudgetProtect && hasBudgetProtectProfile) {
      paymentInfo = { ...paymentInfo, miscellaneous: null };

      paymentInfo.miscellaneous =
        await validationService.validateBudgetProtect(req);
    } else if (
      // eslint-disable-next-line eqeqeq
      (hasBudgetProtect === false || hasBudgetProtect == null) &&
      hasBudgetProtectProfile
    ) {
      throw {
        type: 'InvalidRequestValidateException',
        message: 'The request parameters failed in validation.',
      };
    }
  }

  let settlementInfos = [];
  for (const settlement of settlementInformation) {
    const newSettlementInfoObj = {};
    newSettlementInfoObj.accountNumber = settlement.accountNumber ?? null;
    newSettlementInfoObj.mobileNumber = settlement.mobileNumber ?? null;
    newSettlementInfoObj.landlineNumber = settlement.landlineNumber ?? null;
    newSettlementInfoObj.emailAddress = settlement.emailAddress?.trim() || null;
    newSettlementInfoObj.transactionType = settlement.transactionType ?? null;
    newSettlementInfoObj.requestType = settlement.requestType ?? null;
    newSettlementInfoObj.amount = settlement.amount ?? null;
    newSettlementInfoObj.referralCode = settlement.referralCode ?? null;
    newSettlementInfoObj.accountName = settlement.accountName ?? null;
    newSettlementInfoObj.accountType = settlement.accountType ?? null;
    newSettlementInfoObj.billsType = settlement.billsType ?? null;
    await validationService.validateTransactions(req, newSettlementInfoObj);
    settlementInfos.push(newSettlementInfoObj);
  }

  await validationService.validateCheckConvenienceFee(req);

  const requestType = settlementInformation[0].requestType;

  if (
    stringUtil.compareLowerCase(requestType, BUY_PROMO) &&
    paymentInfoRequest?.oonaSkus?.length
  ) {
    if (stringUtil.compareLowerCase(paymentType, GCASH)) {
      gcashPaymentInfo.miscellaneous = await oonaService.applyOonaPricing(
        req,
        paymentInfoRequest.oonaSkus
      );
    } else if (stringUtil.compareLowerCase(paymentType, XENDIT)) {
      paymentInfo = await oonaService.applyOonaPricing(
        req,
        paymentInfoRequest.oonaSkus
      );
    }
  }

  return {
    command: {
      name: paymentSessionType,
      payload: {
        gatewayProcessor,
        paymentInfo,
        gcashPaymentInfo,
        adyenPaymentInfo,
        settlementInfos,
      },
    },
  };
};

const preProcessPaymentInfo = async (req) => {
  const {
    app: { cxsRequest, channel },
    paymentTypeModels,
    paymentRequestService,
  } = req;

  // Defensive check for cxsRequest
  if (!cxsRequest || typeof cxsRequest !== 'object') {
    throw {
      type: 'InvalidRequest',
      message: 'Missing or invalid cxsRequest in request.app object.',
    };
  }

  const { settlementInformation, paymentInformation, paymentType } = cxsRequest;
  req.app.additionalParams ??= {};
  req.app.additionalParams.paymentType = paymentType;

  const {
    PAYMENT_TYPES: { DROPIN, GCASH, XENDIT },
    CHANNELS: { DNO },
  } = constants;

  if (
    settlementInformation &&
    settlementInformation.length &&
    settlementInformation[0].emailAddress
  ) {
    let email = settlementInformation[0].emailAddress;
    if (email && !validationUtil.isValidEmail(email)) {
      throw {
        type: 'InvalidParameter',
      };
    }
  }

  if (paymentType.toLowerCase() === DROPIN.toLowerCase()) {
    const paymentRequest =
      paymentTypeModels.AdyenDropinRequestType.validateAdyenDropinRequest(
        paymentInformation
      );

    const adyenDropinRequest =
      transformers.adyenDropin.generateAdyenDropinRequest(paymentRequest);

    validationUtil.validateShopperReference(adyenDropinRequest, req);

    return await paymentRequestService.createPaymentServiceRequest(
      adyenDropinRequest,
      req
    );
  } else if (stringUtil.compareLowerCase(GCASH, paymentType)) {
    const paymentRequest =
      paymentTypeModels.GcashRequestType.validateGcashRequest(
        paymentInformation
      );

    const gcashRequest =
      transformers.gcash.generateGcashRequest(paymentRequest);

    return await paymentRequestService.createPaymentServiceRequest(
      gcashRequest,
      req
    );
  } else if (stringUtil.compareLowerCase(XENDIT, paymentType)) {
    if (stringUtil.compareLowerCase(channel, DNO)) {
      const paymentRequest =
        paymentTypeModels.DnoXenditRequestType.validateDnoXenditRequest(
          paymentInformation
        );

      const xenditRequest =
        transformers.xendit.generateXenditRequest(paymentRequest);

      xenditUtil.validateXenditRequest(req, xenditRequest);

      return await paymentRequestService.createPaymentServiceRequest(
        xenditRequest,
        req
      );
    } else {
      const paymentRequest =
        paymentTypeModels.XenditRequestType.validateXenditRequest(
          paymentInformation
        );

      const xenditRequest =
        transformers.xendit.generateXenditRequest(paymentRequest);

      xenditUtil.validateXenditRequest(req, xenditRequest);

      return await paymentRequestService.createPaymentServiceRequest(
        xenditRequest,
        req
      );
    }
  } else {
    const paymentRequest =
      paymentTypeModels.AdyenSDK.validateAdyenSDKPaymentInfo(
        paymentInformation
      );

    const adyenSDKRequest =
      transformers.adyenSDK.generateAdyenSDKRequest(paymentRequest);

    paymentsUtil.validateTokenSDK(adyenSDKRequest);

    return await paymentRequestService.createPaymentServiceRequest(
      adyenSDKRequest,
      req
    );
  }
};

export { createPaymentServiceRequest, preProcessPaymentInfo };
