import decodeUserJWT from '@globetel/cxs-core/core/jwt/decodeUserJWT.js';
import logger from '@globetel/cxs-core/core/logger/logger.js';
import {
  constants,
  paymentsUtil,
  stringUtil,
  transformers,
  validationUtil,
  xenditUtil,
} from '../../util/index.js';

const createPaymentServiceRequest = async (paymentInfoRequest, req) => {
  logger.debug('CREATE_PAYMENT_SERVICE_REQUEST_START', {
    paymentType: req?.cxsRequest?.paymentType,
    requestType: req?.cxsRequest?.settlementInformation?.[0]?.requestType,
  });

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
    PAYMENT_REQUEST_TYPES: { BUY_PROMO, BUY_ROAMING, PAY_BILLS },
    XENDIT_PAYMENT_METHODS: { TYPE_CC_DC, TYPE_DIRECT_DEBIT },
  } = constants;

  if (stringUtil.compareLowerCase(paymentType, DROPIN)) {
    paymentSessionType = GENERIC;
    logger.debug('CREATE_PAYMENT_SERVICE_REQUEST_ROUTE', {
      paymentType,
      paymentSessionType,
    });
    const payload =
      transformers.adyenDropin.generateDropinPaymentServiceRequest(
        cxsRequest,
        paymentInfoRequest
      );

    ({ paymentInfo: paymentInfo, gatewayProcessor: gatewayProcessor } =
      payload);
  } else if (stringUtil.compareLowerCase(paymentType, GCASH)) {
    paymentSessionType = CREATE;
    logger.debug('CREATE_PAYMENT_SERVICE_REQUEST_ROUTE', {
      paymentType,
      paymentSessionType,
    });
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
      (hasBudgetProtect === false || hasBudgetProtect === null) &&
      hasBudgetProtectProfile
    ) {
      throw {
        type: 'InvalidRequestValidateException',
        message: 'The request parameters failed in validation.',
      };
    }
  } else if (stringUtil.compareLowerCase(paymentType, ADYEN)) {
    paymentSessionType = CREATE;
    logger.debug('CREATE_PAYMENT_SERVICE_REQUEST_ROUTE', {
      paymentType,
      paymentSessionType,
    });

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
    // Legacy alignment: Xendit should use a dedicated command name so PAYO
    // interprets the payload correctly (and does not require card-style remark values).
    paymentSessionType = XENDIT_SESSION;
    logger.debug('CREATE_PAYMENT_SERVICE_REQUEST_ROUTE', {
      paymentType,
      paymentSessionType,
    });
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
      // Needed for MID resolution for PayBills (based on accountType)
      let accountType = null;

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

      // Enrich account info ONLY for PayBills.
      // For BuyLoad / other requestTypes, HIP is not called (response is undefined)
      // and we must NOT fail validation.
      if (stringUtil.compareLowerCase(cxsRequestType, PAY_BILLS)) {
        const status = response?.hipResponse?.Status;

        if (status !== '00') {
          throw {
            type: 'InvalidParameter',
          };
        }

        accountType = response?.hipResponse?.AccountType ?? '';
        const accountName = response?.hipResponse?.AccountName ?? '';
        const accountNumber = response?.hipResponse?.AccountNumber ?? '';

        cxsRequest.settlementInformation[0].accountType = Buffer.from(
          accountType || ''
        ).toString('base64');
        cxsRequest.settlementInformation[0].accountName = Buffer.from(
          accountName || ''
        ).toString('base64');

        if (settlement.landlineNumber?.trim()) {
          cxsRequest.settlementInformation[0].accountNumber = accountNumber;
        }
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

      // IMPORTANT: PAYO rejects keys that exist but are null/empty.
      // Only set midLabel if it is a non-empty string.
      if (typeof mid === 'string' && mid.trim().length > 0) {
        paymentInfo.midLabel = mid;
      }
    } else if (stringUtil.compareLowerCase(type, TYPE_DIRECT_DEBIT)) {
      const userHeader = headers?.['user-token'];

      let uuid = null;
      if (typeof userHeader === 'string') {
        // Legacy behavior: decode Bearer token string
        const decodedToken = decodeUserJWT(userHeader);
        uuid = decodedToken?.userJWT?.uuid ?? null;
      } else if (userHeader && typeof userHeader === 'object') {
        // New behavior: header was already parsed upstream
        uuid = userHeader.uuid ?? null;
      }

      // Legacy Java removes hyphens so PAYO receives a 32-char UUID.
      // Example: d96ca979-a50d-43dc-8862-19c61c6e6743 -> d96ca979a50d43dc886219c61c6e6743
      const normalizedUuid =
        typeof uuid === 'string' ? uuid.replace(/-/g, '') : uuid;

      const directDebitInfo = {
        customerUuid: normalizedUuid,
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
      (hasBudgetProtect === false || hasBudgetProtect === null) &&
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
    // Validate the original settlement (including transactions[])
    // BEFORE building the outbound settlementInfos payload, to match legacy Java.
    await validationService.validateTransactions(req, settlement);

    // IMPORTANT: Payment Service rejects keys that exist but are null/empty.
    // Align with legacy behavior by omitting missing optional keys.
    const newSettlementInfoObj = paymentsUtil.removeNullDeep({
      accountNumber: settlement.accountNumber ?? null,
      mobileNumber: settlement.mobileNumber ?? null,
      landlineNumber: settlement.landlineNumber ?? null,
      emailAddress: settlement.emailAddress?.trim() || null,
      transactionType: settlement.transactionType ?? null,
      requestType: settlement.requestType ?? null,
      amount: settlement.amount ?? null,
      referralCode: settlement.referralCode ?? null,
      accountName: settlement.accountName ?? null,
      accountType: settlement.accountType ?? null,
      billsType: settlement.billsType ?? null,
    });
    settlementInfos.push(newSettlementInfoObj);
  }

  logger.debug('CREATE_PAYMENT_SERVICE_REQUEST_SETTLEMENTS_OK', {
    count: settlementInfos.length,
  });

  await validationService.validateCheckConvenienceFee(req);

  const requestType = settlementInformation[0].requestType;

  if (
    (stringUtil.compareLowerCase(requestType, BUY_PROMO) ||
      stringUtil.compareLowerCase(requestType, BUY_ROAMING)) &&
    paymentInfoRequest?.oonaSkus?.length
  ) {
    if (stringUtil.compareLowerCase(paymentType, GCASH)) {
      gcashPaymentInfo.miscellaneous = await oonaService.applyOonaPricing(
        req,
        paymentInfoRequest.oonaSkus
      );
    } else if (stringUtil.compareLowerCase(paymentType, XENDIT)) {
      paymentInfo.miscellaneous = await oonaService.applyOonaPricing(
        req,
        paymentInfoRequest.oonaSkus
      );
    }
  }

  return {
    command: {
      name: paymentSessionType,
      payload: {
        // Align with Payment Service/PAYO validation rules:
        // omit any keys that would otherwise be present but null/empty.
        ...paymentsUtil.removeNullDeep({
          gatewayProcessor,
          paymentInfo,
          gcashPaymentInfo,
          adyenPaymentInfo,
          settlementInfos,
        }),
      },
    },
  };
};

const preProcessPaymentInfo = async (req) => {
  logger.debug('PREPROCESS_PAYMENT_INFO_START', {
    channel: req?.app?.channel,
    paymentType: req?.app?.cxsRequest?.paymentType,
    requestType: req?.app?.cxsRequest?.settlementInformation?.[0]?.requestType,
  });

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
    logger.debug('PREPROCESS_PAYMENT_INFO_EMAIL_PRESENT', {
      hasEmail: Boolean(email),
    });
    if (email && !validationUtil.isValidEmail(email)) {
      throw {
        type: 'InvalidParameter',
      };
    }
  }

  if (paymentType.toLowerCase() === DROPIN.toLowerCase()) {
    logger.debug('PREPROCESS_PAYMENT_INFO_ROUTE', {
      paymentType,
      path: 'DROPIN',
    });
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
    logger.debug('PREPROCESS_PAYMENT_INFO_ROUTE', {
      paymentType,
      path: 'GCASH',
    });
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
    logger.debug('PREPROCESS_PAYMENT_INFO_ROUTE', {
      paymentType,
      path: 'XENDIT',
      channel,
    });
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
    logger.debug('PREPROCESS_PAYMENT_INFO_ROUTE', {
      paymentType,
      path: 'ADYEN_SDK',
    });
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
