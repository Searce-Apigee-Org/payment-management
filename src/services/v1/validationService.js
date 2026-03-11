import { decodeB64, decodeUserJWT } from '@globetel/cxs-core/core/jwt/index.js';
import { msisdnFormatter } from '@globetel/cxs-core/core/utils/string/index.js';
import Decimal from 'decimal.js';
import { buildLegacyCatalogKey } from '../../util/catalogKeyUtil.js';
import {
  constants,
  dateTimeUtil,
  paymentsUtil,
  stringUtil,
  validationUtil,
} from '../../util/index.js';

import logger from '@globetel/cxs-core/core/logger/logger.js';
import { config } from '../../../convict/config.js';

const validateAccountBrand = async (mobileNumber, req) => {
  const { accountInfoService } = req;
  if (!mobileNumber) {
    return constants.PAYMENT_ENTITY_TYPES.ENTITY_PROMO;
  }

  const formattedMobileNumber = msisdnFormatter(mobileNumber, '0');

  // Use `accountInfoService.getInfo` in its GetDetailsByMSISDN mode.
  // IMPORTANT: `accountInfoService.getInfo` expects *camelCase* keys
  // (`msisdn`, `primaryResourceType`) and it will map them to the
  // PascalCase tags required by HIP.
  const getDetailsRequest = {
    msisdn: formattedMobileNumber,
    primaryResourceType: 'C',
  };

  const accountInfoResponse = await accountInfoService.getInfo(
    req,
    getDetailsRequest
  );

  // Legacy parity (PaymentRequestValidator.validateAccountBrand):
  // - if response is empty OR hipResponse is null/empty => OutboundOperationFailed
  if (!accountInfoResponse) {
    throw { type: 'OutboundOperationFailed' };
  }

  const hipResponse = accountInfoResponse.hipResponse;

  if (
    !hipResponse ||
    (typeof hipResponse === 'object' && Object.keys(hipResponse).length === 0)
  ) {
    throw { type: 'OutboundOperationFailed' };
  }

  const attributesInfoList =
    hipResponse?.UnifiedResourceDetails?.AttributesInfoList?.AttributesInfo;

  // Legacy parity: only treat BRAND == "GHP" as postpaid.
  if (Array.isArray(attributesInfoList)) {
    const brandAttr = attributesInfoList.find(
      (attr) => attr?.AttrName === 'BRAND'
    );
    const brand = (brandAttr?.AttrValue ?? '').toString().toUpperCase();

    if (brand === 'GHP') {
      return constants.PAYMENT_ENTITY_TYPES.ENTITY_PTPROMO;
    }
  }

  // Legacy default
  return constants.PAYMENT_ENTITY_TYPES.ENTITY_PROMO;
};

const validatePaymentInformation = async (req) => {
  logger.debug('VALIDATE_PAYMENT_INFORMATION_START', {
    channel: req?.app?.channel,
    paymentType: req?.app?.cxsRequest?.paymentType,
    settlementRequestType:
      req?.app?.cxsRequest?.settlementInformation?.[0]?.requestType,
  });

  // Defensive validation for required fields
  if (
    !req.app ||
    !req.app.cxsRequest ||
    typeof req.app.cxsRequest !== 'object' ||
    !req.app.cxsRequest.paymentType ||
    !req.app.cxsRequest.settlementInformation
  ) {
    throw {
      type: 'InvalidRequest',
      message:
        'Missing or invalid cxsRequest. Required fields: paymentType, settlementInformation.',
    };
  }

  const {
    headers,
    app: {
      channel,
      cxsRequest: { paymentInformation, paymentType, settlementInformation },
    } = {},
    paymentTypeModels,
  } = req;

  const {
    CHANNELS: { NG1, DNO },
    PAYMENT_TYPES: { XENDIT, DROPIN, GCASH },
    PAYMENT_REQUEST_TYPES: { NON_BILL },
  } = constants;

  if (!channel) return;

  // Treat any channel that starts with "superapp" as NG1 (e.g., "superapp", "superapp-devs")
  // `channel` is guaranteed truthy here due to the early return above.
  const normalizedChannel = String(channel).toLowerCase();
  const isNg1Channel = normalizedChannel.startsWith(NG1.toLowerCase());

  if (isNg1Channel) {
    logger.debug('VALIDATE_PAYMENT_INFORMATION_CHANNEL', {
      channel,
      normalizedChannel,
      path: 'NG1',
    });
    const userToken = headers['user-token'] ?? headers['user_token'];
    if (!userToken) {
      throw {
        type: 'InsufficientParameters',
        details: "Missing required header 'user-token' for NG1 channel",
      };
    }

    for (const settlement of settlementInformation) {
      switch (paymentType.toLowerCase()) {
        case DROPIN.toLowerCase():
          logger.debug('VALIDATE_PAYMENT_INFORMATION_PROCESSOR', {
            paymentType,
            requestType: settlement?.requestType,
            processor: 'AdyenDropinRequestType',
          });
          await paymentTypeModels.AdyenDropinRequestType.validateAdyenDropinRequest(
            paymentInformation
          );
          await paymentTypeModels.AdyenDropinRequestType.processAdyenDropinRequest(
            paymentInformation,
            settlement,
            req
          );
          break;
        case GCASH.toLowerCase():
          logger.debug('VALIDATE_PAYMENT_INFORMATION_PROCESSOR', {
            paymentType,
            requestType: settlement?.requestType,
            processor: 'GcashRequestType',
          });
          await paymentTypeModels.GcashRequestType.validateGcashRequest(
            paymentInformation
          );
          await paymentTypeModels.GcashRequestType.processGcashRequest(
            paymentInformation,
            settlement,
            req
          );
          break;
        case XENDIT.toLowerCase():
          logger.debug('VALIDATE_PAYMENT_INFORMATION_PROCESSOR', {
            paymentType,
            requestType: settlement?.requestType,
            processor: 'XenditRequestType',
          });
          await paymentTypeModels.XenditRequestType.validateXenditRequest(
            paymentInformation
          );
          await paymentTypeModels.XenditRequestType.processXenditRequest(
            paymentInformation,
            settlement,
            req
          );
          break;
      }
    }
  } else if (
    channel &&
    paymentsUtil.checkValidChannel(channel, paymentType, NON_BILL)
  ) {
    logger.debug('VALIDATE_PAYMENT_INFORMATION_CHANNEL', {
      channel,
      path: 'OTHER_CHANNELS',
      paymentType,
    });
    for (const settlement of settlementInformation) {
      if (paymentType.toLowerCase() === XENDIT.toLowerCase()) {
        const reqType = settlement.requestType;
        if (
          channel.toLowerCase() === DNO.toLowerCase() &&
          reqType.toLowerCase() === NON_BILL.toLowerCase()
        ) {
          logger.debug('VALIDATE_PAYMENT_INFORMATION_PROCESSOR', {
            paymentType,
            requestType: reqType,
            processor: 'DnoXenditRequestType',
          });
          await paymentTypeModels.DnoXenditRequestType.validateDnoXenditRequest(
            paymentInformation
          );

          paymentTypeModels.DnoXenditRequestType.processDnoXenditRequest(
            paymentInformation,
            settlement
          );
        } else {
          logger.debug('VALIDATE_PAYMENT_INFORMATION_PROCESSOR', {
            paymentType,
            requestType: reqType,
            processor: 'XenditRequestTypeForOtherChannels',
            channel,
          });
          await paymentTypeModels.XenditRequestType.validateXenditRequest(
            paymentInformation
          );

          paymentTypeModels.XenditRequestType.processXenditRequestForOtherChannels(
            paymentInformation,
            settlement,
            channel
          );
        }
      }
    }
  }

  logger.debug('VALIDATE_PAYMENT_INFORMATION_OK');
};

const validateTransactions = async (req, target) => {
  const {
    app: { principalId, channel },
    mongo,
    headers,
    priceValidationService,
    validationService,
    channelConfig,
  } = req;
  let isVoucherDiscount = false;
  const {
    app: {
      additionalParams: { OVERRIDE_DISCOUNT },
    },
    paymentTypeModels,
  } = req;

  // `target` is the *settlement object being validated*.
  // IMPORTANT: `req.cxsRequest.settlementInformation` is an array in normal
  // CreatePaymentSession flows, so we must not destructure it as if it were a
  // single object.
  const settlementObject = target || {};

  const { requestType, transactions, mobileNumber } = settlementObject || {};

  // Defensive: Ensure requestType is a string before using .toLowerCase()
  const safeRequestType = typeof requestType === 'string' ? requestType : '';
  const safeChannel = typeof channel === 'string' ? channel : '';
  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  const {
    PAYMENT_REQUEST_TYPES: {
      BUY_PROMO,
      BUY_LOAD,
      BUY_VOUCHER,
      BUY_ROAMING,
      VOLUME_BOOST,
      BUYBBCONTENT,
      ECPAY,
      BBPREPAIDPROMO,
      BBPREPAIDREPAIR,
      PAY_BILLS,
      CHANGE_SIM,
    },
    CHANNELS: { NG1 },
  } = constants;

  if (OVERRIDE_DISCOUNT) {
    isVoucherDiscount = true;
  }

  // Persist payment entity via migratedTables-aware repository (injected under `channelConfig`)
  let buyLoadChannelConfigRepository =
    await channelConfig.buyLoadChannelConfigRepository.findOneById(
      principalId,
      req
    );

  if (stringUtil.compareLowerCase(BUY_PROMO, safeRequestType)) {
    paymentTypeModels.PurchasePromoRequestType.validatePurchasePromoRequest(
      safeTransactions
    );
    if (!mobileNumber) {
      throw {
        type: 'InsufficientParameters',
      };
    }

    await priceValidationService.validateServiceIdPrice(
      settlementObject,
      req,
      BUY_PROMO
    );
    validationUtil.validateReferalCheck(settlementObject);

    if (!isVoucherDiscount) {
      validationUtil.validateSettlementAmount(settlementObject);
    } else {
      await priceValidationService.validateSettlementAmountVoucher(
        settlementObject,
        req
      );
    }
  } else if (stringUtil.compareLowerCase(BUY_LOAD, safeRequestType)) {
    paymentTypeModels.BuyLoad.validateBuyLoadRequestType(safeTransactions);

    if (!mobileNumber) {
      throw {
        type: 'InsufficientParameters',
      };
    }

    await validationService.validateSecurityLimits(settlementObject, req);

    if (!isVoucherDiscount) {
      await validationService.validateSettlementAmountDiscount(
        settlementObject,
        buyLoadChannelConfigRepository,
        req
      );
    } else {
      await priceValidationService.validateSettlementAmountVoucher(
        settlementObject,
        req
      );
    }
  } else if (stringUtil.compareLowerCase(BUY_VOUCHER, safeRequestType)) {
    paymentTypeModels.BuyVoucher.validateBuyVoucherRequest(safeTransactions);

    validationUtil.validateServiceNumber(settlementObject);
    await priceValidationService.validateServiceIdPrice(
      settlementObject,
      req,
      BUY_VOUCHER
    );
    validationUtil.validateSettlementAmount(settlementObject);
  } else if (stringUtil.compareLowerCase(BUY_ROAMING, safeRequestType)) {
    // Legacy: BuyRoaming is a transaction-based request type similar to BuyLoad/BuyPromo.
    // It allows transactions[] and requires settlement.amount == sum(txn.amount).
    if (!safeTransactions.length) {
      throw {
        type: 'InvalidParameter',
        displayMessage: 'Transactions should not be empty.',
      };
    }

    // Require at least one identity field on settlement.
    if (!settlementObject.mobileNumber && !settlementObject.accountNumber) {
      throw {
        type: 'InsufficientParameters',
      };
    }

    // Schema enforces this, but keep runtime parity.
    if (!stringUtil.compareLowerCase(settlementObject.transactionType, 'N')) {
      throw {
        type: 'InvalidRequestValidateException',
        displayMessage: 'The transaction type is invalid.',
      };
    }

    validationUtil.validateSettlementAmount(settlementObject);

    // Transaction rules:
    // - amount required
    // - either keyword OR serviceId (XOR)
    // - when keyword is used, serviceId/param must not be present
    // - optional activationDate/targetDestination must not be blank
    // - activationDate must match yyyy-MM-dd'T'HH:mm:ss
    const activationDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;

    for (const t of safeTransactions) {
      const amount = t?.amount;
      const keyword = typeof t?.keyword === 'string' ? t.keyword.trim() : '';
      const serviceId =
        typeof t?.serviceId === 'string' ? t.serviceId.trim() : '';
      const param = typeof t?.param === 'string' ? t.param.trim() : '';
      const activationDate =
        typeof t?.activationDate === 'string' ? t.activationDate.trim() : '';
      const targetDestination =
        typeof t?.targetDestination === 'string'
          ? t.targetDestination.trim()
          : '';

      if (amount === null || amount === undefined) {
        throw {
          type: 'InsufficientParameters',
        };
      }

      const hasKeyword = Boolean(keyword);
      const hasServiceId = Boolean(serviceId);

      if (!hasKeyword && !hasServiceId) {
        throw {
          type: 'InvalidParameter',
          displayMessage:
            'serviceId or keyword is required when requestType is BuyRoaming',
        };
      }

      if (hasKeyword && hasServiceId) {
        throw {
          type: 'InvalidParameter',
          displayMessage:
            'keyword must not coexist with serviceId for BuyRoaming',
        };
      }

      if (hasKeyword && (param || hasServiceId)) {
        throw {
          type: 'InvalidParameter',
          displayMessage:
            'keyword must not coexist with serviceId/param for BuyRoaming',
        };
      }

      if (hasServiceId && !/^\d+$/.test(serviceId)) {
        throw {
          type: 'InvalidParameter',
          displayMessage: 'serviceId must be numeric for BuyRoaming',
        };
      }

      if (t?.activationDate !== undefined && t?.activationDate !== null) {
        if (!activationDate) {
          throw {
            type: 'InvalidParameter',
            displayMessage: 'activationDate should not empty or null',
          };
        }

        if (!activationDateRegex.test(activationDate)) {
          throw {
            type: 'InvalidParameter',
            displayMessage:
              "activationDate must match format yyyy-MM-dd'T'HH:mm:ss",
          };
        }
      }

      if (t?.targetDestination !== undefined && t?.targetDestination !== null) {
        if (!targetDestination) {
          throw {
            type: 'InvalidParameter',
            displayMessage: 'targetDestination should not empty or null',
          };
        }
      }
    }
  } else if (stringUtil.compareLowerCase(VOLUME_BOOST, safeRequestType)) {
    paymentTypeModels.volumeBoost.validateVolumeBoostRequest(safeTransactions);
    validateVerificationToken(settlementObject);
  } else if (stringUtil.compareLowerCase(BUYBBCONTENT, safeRequestType)) {
    // Legacy: BuyBBContent is a transaction-based request type.
    // It allows transactions[] and requires settlement.amount == sum(txn.amount).
    if (!safeTransactions.length) {
      throw {
        type: 'InvalidParameter',
        displayMessage: 'Transactions should not be empty.',
      };
    }

    validationUtil.validateSettlementAmount(settlementObject);

    // Validate minimal required fields on each transaction.
    for (const t of safeTransactions) {
      const missing =
        !t ||
        !t.productCode ||
        !t.identityType ||
        !t.requestDate ||
        !t.provisioningServiceProvider ||
        !t.identityValue ||
        t.amount === null ||
        t.amount === undefined;

      if (missing) {
        throw {
          type: 'InvalidParameter',
          displayMessage: 'The request parameter is invalid.',
        };
      }
    }
  } else if (stringUtil.compareLowerCase(ECPAY, safeRequestType)) {
    // ECPay requests are expected to provide the bill-payment breakdown under
    // `settlementInformation[].transactions` (partnerReferenceNumber, billerName,
    // accountIdentifier, etc.). This is required for BOTH NG1 (SuperApp) and
    // other channels because we validate the PRNs against the ECPay table.
    paymentTypeModels.ECPay.validateECPayRequest(safeTransactions);

    const userToken = headers['user-token'];

    if (!userToken) {
      throw {
        type: 'InvalidUserToken',
      };
    }

    const decodedUserToken = decodeUserJWT(userToken);

    settlementObject.emailAddress = decodedUserToken.userJWT.email;

    await validationService.validateECPayTableRequest(settlementObject, req);
    await validationService.validateECPaySettlementAmount(
      settlementObject,
      req
    );
  } else if (
    [BBPREPAIDPROMO.toLowerCase(), BBPREPAIDREPAIR.toLowerCase()].includes(
      safeRequestType.toLowerCase()
    )
  ) {
    paymentTypeModels.GFiberPrepaid.validateGFiberRequest(settlementObject);

    const createOrderExternals = settlementObject.createOrderExternal;

    if (!createOrderExternals?.length) {
      throw {
        type: 'InvalidParameter',
        displayMessage:
          'createOrderExternal cannot be empty for BBPrepaidPromo or BBPrepaidRepair.',
      };
    }

    createOrderExternals.forEach((order) => {
      const { accountId, targetType, entityIds } = order;

      if (!accountId || targetType === null || !entityIds?.length) {
        throw {
          type: 'InvalidParameter',
          displayMessage:
            'AccountId/TargetType/EntityIds is missing from a required parameter.',
        };
      }

      entityIds.forEach((entityId) => {
        const { id, type } = entityId;

        if (id === null || type === null) {
          throw {
            type: 'InvalidParameter',
            displayMessage:
              'Entity Id/Type is missing from a required parameter.',
          };
        }
      });
    });

    await validationService.validateGPFTransaction(settlementObject, req);
  } else if (
    stringUtil.compareLowerCase(PAY_BILLS, safeRequestType) &&
    !safeTransactions.length
  ) {
    if (
      settlementObject.transactionType === 'G' &&
      stringUtil.compareLowerCase(safeChannel, NG1)
    ) {
      if (!target.accountType && !target.accountName) {
        await validationService.validatePayBillsRequest(
          settlementObject,
          target,
          req
        );
      }
    }
  } else if (stringUtil.compareLowerCase(CHANGE_SIM, safeRequestType)) {
    if (safeChannel && !stringUtil.compareLowerCase(safeChannel, NG1)) {
      throw {
        type: 'InvalidParameter',
        displayMessage: 'Additional Property not allowed(transactions[]).',
      };
    }

    if (!safeTransactions.length) {
      throw {
        type: 'InvalidParameter',
        displayMessage: 'Transactions should not be empty.',
      };
    }

    safeTransactions.forEach((t) => {
      if (!t.transactionId) {
        throw {
          type: 'MissingParameterValidateException',
          displayMessage:
            'The request parameter is missing a mandatory parameter.',
        };
      }

      if (t.transactionId.trim() === '') {
        throw {
          type: 'InvalidParameter',
          displayMessage: 'TransactionId should not empty or null',
        };
      }
    });

    // NOTE:
    // `validateGCSBucketValues` expects `(settlementInformation, req)`.
    // The previous (legacy) call signature mistakenly passed
    // `(settlementInformation, principalId, requestType, req)` which caused
    // runtime failures like:
    //   TypeError: Cannot read properties of undefined (reading 'principalId')
    // because the function attempted to read `req.app.principalId` from the
    // *second* argument (a string).
    await validationService.validateGCSBucketValues(settlementObject, req);
  } else {
    if (safeTransactions.length) {
      throw {
        type: 'InvalidParameter',
        displayMessage: 'Additional Property not allowed(transactions[]).',
      };
    }
  }
};

const validateSecurityLimits = async (settlementInformation, req) => {
  const {
    app: { principalId },
    mongo,
    channelConfig,
    transactions,
  } = req;

  const { amount } = settlementInformation;
  let mobileNumber = msisdnFormatter(settlementInformation.mobileNumber, '09');

  // Persist payment entity via migratedTables-aware repository (injected under `channelConfig`)
  let buyLoadChannelConfigRepository =
    await channelConfig.buyLoadChannelConfigRepository.findOneById(
      principalId,
      req
    );
  let sharedConfig =
    await channelConfig.buyLoadChannelConfigRepository.findOneById(
      constants.CONFIG.SHARED,
      req
    );

  if (!buyLoadChannelConfigRepository) {
    throw {
      type: 'Default',
      displayMessage: 'No channel configuration found.',
    };
  }

  let dailyAmountLimit = 0;
  let isSharedConfig = false;

  if (!sharedConfig) {
    dailyAmountLimit = buyLoadChannelConfigRepository.maximumDailyAmount;
  } else {
    isSharedConfig = true;
    dailyAmountLimit = sharedConfig.maximumDailyAmount;
  }

  const { channelCode } = buyLoadChannelConfigRepository;

  // startTime can be missing in some channel configs; default to legacy values.
  const startTime = buyLoadChannelConfigRepository?.startTime || {};
  const hh = startTime.hh ?? 22;
  const mm = startTime.mm ?? 0;
  const ss = startTime.ss ?? 0;

  const { dateFrom, dateTo, formattedDateFrom, formattedDateTo, now } =
    dateTimeUtil.computeDailyWindow({ hh, mm, ss });

  let buyLoadTransactions = null;

  if (!isSharedConfig) {
    // Persist payment entity via migratedTables-aware repository (injected under `transactions`)
    buyLoadTransactions =
      await transactions.buyLoadTransactionsRepository.findByMobileDateChannel(
        {
          mobileNumber,
          channelCode,
          fromDate: formattedDateFrom,
          toDate: formattedDateTo,
        },
        req
      );
  } else {
    buyLoadTransactions =
      await transactions.buyLoadTransactionsRepository.findByMobileDate(
        {
          mobileNumber,
          fromDate: formattedDateFrom,
          toDate: formattedDateTo,
        },
        req
      );
  }

  if (
    buyLoadTransactions.length >=
      buyLoadChannelConfigRepository.maximumDailyTransactions &&
    now.valueOf() <= dateTo.valueOf()
  ) {
    logger.error(
      'VALIDATING_TRANSACIONT_LIMITS',
      'Maximum Daily Transaction has been exceeded. '
    );

    throw {
      type: 'CustomBadRequestError',
      details: 'Daily transaction limit has been exceeded.',
    };
  }

  const totalAmount = buyLoadTransactions.reduce(
    (sum, t) => sum + (t.amount || 0),
    0
  );
  const currentDayTotalAmount = totalAmount + amount;

  if (
    currentDayTotalAmount > dailyAmountLimit &&
    now.valueOf() <= dateTo.valueOf()
  ) {
    logger.error(
      'VALIDATING_TRANSACIONT_LIMITS',
      'Maximum Daily Transaction has been exceeded. '
    );

    throw {
      type: 'CustomBadRequestError',
      details: 'Daily transaction limit has been exceeded.',
    };
  }
};

const validateVerificationToken = (settlementInformation) => {
  try {
    let volumeTotalAmount = 0;
    let c = 0;

    const { transactions } = settlementInformation;

    for (t of transactions) {
      const { verificationToken } = t;
      const decodedToken = decodeB64(verificationToken.split('.')[1]);
      validationUtil.validateVerficationToken(decodedToken);

      volumeTotalAmount += decodedToken.price;
      t.amount = decodedToken.price;
    }

    settlementInformation.amount = volumeTotalAmount;
  } catch (error) {
    if (error.type) throw error;
    throw {
      type: 'InvalidParameter',
      displayMessage: `verificationToken invalid : ${error.message}`,
    };
  }
};

const validateECPayTableRequest = async (settlementInformation, req) => {
  const { transactions } = req;
  const { transactions: settlementTransactions } = settlementInformation;

  // `transactions` is injected by `globalDependenciesPlugin` and is expected to
  // expose the facade repository `ecpayTransactionsRepository`.
  // Keep a backward-compatible fallback to the legacy/singular name to avoid
  // runtime TypeErrors if some environments/tests still use it.
  const ecpayRepo =
    transactions?.ecpayTransactionsRepository ??
    transactions?.ecpayTransactionRepository;

  if (!ecpayRepo || typeof ecpayRepo.findByPartnerRef !== 'function') {
    logger.error('ECPAY_TABLE_REQUEST_VALIDATION_MISCONFIGURED', {
      hasTransactions: Boolean(transactions),
      keys: transactions ? Object.keys(transactions) : [],
    });

    throw {
      type: 'InternalOperationFailed',
      details:
        'Missing transactions.ecpayTransactionsRepository.findByPartnerRef',
    };
  }

  for (const t of settlementTransactions) {
    const partnerRef = t.partnerReferenceNumber;

    // Persist payment entity via migratedTables-aware repository (injected under `transactions`)
    const ecpayTransactionEntity = await ecpayRepo.findByPartnerRef(
      partnerRef,
      req
    );

    // Repository implementations may return either:
    // - an array (legacy behavior)
    // - a single object (mongo/dynamo findOne style)
    // - null/undefined when not found
    const record = Array.isArray(ecpayTransactionEntity)
      ? ecpayTransactionEntity[0]
      : ecpayTransactionEntity;

    if (!record) {
      logger.error(
        'ECPAY_TABLE_REQUEST_VALIDATION',
        'NotMatchParameterException : ECPay PRN Transaction Not found'
      );

      throw {
        type: 'InvalidOutboundRequest',
      };
    }

    validationUtil.validateECPayTransactionEntity(record, t);
  }
};

const validateECPaySettlementAmount = async (settlementInformation, req) => {
  const {
    headers: { paymentType: headerPaymentType } = {},
    app: { cxsRequest } = {},
    secretManager,
    secret,
  } = req;

  const {
    PAYMENT_TYPES: { GCASH, DROPIN },
  } = constants;

  const { transactions } = settlementInformation;

  // Legacy behavior expected `paymentType` in headers.
  // SuperApp/CreatePaymentSession sends it in the payload (`cxsRequest.paymentType`).
  // Accept both to avoid false validation failures.
  const paymentType = headerPaymentType ?? cxsRequest?.paymentType ?? null;

  if (!paymentType) {
    throw {
      type: 'InvalidParameter',
      displayMessage: 'PaymentType is required',
    };
  }

  // Used only for better logging + the "amount autofix" behavior for ECPay/GCash.
  const requestType = settlementInformation?.requestType ?? null;

  for (const t of transactions) {
    // Use Decimal to avoid floating-point rounding issues that can cause
    // `Math.ceil(x*100)/100` to over-round (e.g., 1.1000000000000001 -> 1.11).
    const amountToPay = new Decimal(Number(t.amountToPay) || 0);
    const serviceCharge = new Decimal(Number(t.serviceCharge) || 0);
    let totalAmount = new Decimal(0);

    if (stringUtil.compareLowerCase(paymentType, GCASH)) {
      const processingFeeRate = Number(
        await secretManager.paymentServiceRepository.getGcashProcessingFee(
          secret
        )
      );

      // processingFeeRate is expected to be a decimal rate (e.g., 0.02 == 2%)
      const processingFeeResult = amountToPay
        .plus(serviceCharge)
        .mul(new Decimal(processingFeeRate || 0));

      totalAmount = amountToPay.plus(serviceCharge).plus(processingFeeResult);
      t.processingFee = processingFeeRate;
    } else if (stringUtil.compareLowerCase(paymentType, DROPIN)) {
      totalAmount = amountToPay.plus(serviceCharge);
    }

    // Legacy rounding behavior: round UP to 2 decimal places
    const roundedTotal = totalAmount
      .toDecimalPlaces(2, Decimal.ROUND_UP)
      .toNumber();

    t.totalAmount = roundedTotal;
  }

  // Amount validation:
  // - Legacy SuperApp ECPay GCASH flows often send settlement.amount == sum(amountToPay + serviceCharge)
  //   (i.e., excluding processing fee). We compute processing fee and should pass the *total* amount to PAYO.
  // - Other flows must still match totals.
  const normalizeMoney = (n) => Number(Number(n || 0).toFixed(2));
  const computedTotal = normalizeMoney(
    transactions.map((t) => t.totalAmount).reduce((sum, curr) => sum + curr, 0)
  );

  const computedBaseWithoutFee = normalizeMoney(
    transactions
      .map((t) => Number(t.amountToPay) + Number(t.serviceCharge))
      .reduce((sum, curr) => sum + curr, 0)
  );

  const providedSettlementAmount = normalizeMoney(settlementInformation.amount);

  // If the client sent the amount WITHOUT processing fee for ECPAY+GCASH,
  // auto-correct it to the computed total (with fee) so downstream PAYO
  // gets the proper amount and we avoid false InvalidRequestValidateException.
  if (
    stringUtil.compareLowerCase(
      requestType,
      constants.PAYMENT_REQUEST_TYPES.ECPAY
    ) &&
    stringUtil.compareLowerCase(paymentType, GCASH) &&
    providedSettlementAmount === computedBaseWithoutFee &&
    providedSettlementAmount !== computedTotal
  ) {
    logger.info('ECPAY_SETTLEMENT_AMOUNT_AUTOCORRECT', {
      requestType,
      paymentType,
      providedSettlementAmount,
      computedBaseWithoutFee,
      computedTotal,
    });

    settlementInformation.amount = computedTotal;
    return;
  }

  if (providedSettlementAmount !== computedTotal) {
    logger.error('ECPAY_SETTLEMENT_AMOUNT_MISMATCH', {
      requestType,
      paymentType,
      providedSettlementAmount,
      computedTotal,
      computedBaseWithoutFee,
      transactions: transactions?.map((t) => ({
        amountToPay: t?.amountToPay,
        serviceCharge: t?.serviceCharge,
        processingFee: t?.processingFee,
        totalAmount: t?.totalAmount,
      })),
    });

    throw {
      type: 'InvalidRequestValidateException',
      displayMessage: 'The request parameters failed in validation.',
    };
  }
};

const validateGPFTransaction = async (settlementInformation, req) => {
  const { transactionType, createOrderExternal, amount } =
    settlementInformation;

  const { dnoService } = req;

  if (!stringUtil.compareLowerCase(transactionType, 'N')) {
    throw {
      type: 'InvalidRequestValidateException',
      displayMessage: 'The transaction type is invalid.',
    };
  }

  let offerId = createOrderExternal[0].entityIds[0].id;

  let dnoOffers = await dnoService.dnoGetOffers(req, [offerId]);

  dnoOffers.forEach((offer) => {
    if (
      offer.id === offerId &&
      !new Decimal(offer.amount).equals(new Decimal(amount))
    ) {
      throw {
        type: 'InvalidRequestValidateException',
        displayMessage: 'The amount parameter is invalid.',
      };
    }
  });
};

const validatePayBillsRequest = async (settlementInformation, target, req) => {
  const { accountInfoService } = req;
  const { mobileNumber, accountNumber, landlineNumber } = settlementInformation;

  const getAccountInfoReq = {};

  if (mobileNumber) {
    getAccountInfoReq.msisdn = msisdnFormatter(mobileNumber, '09');
  }

  if (accountNumber) {
    getAccountInfoReq.accountNumber = accountNumber.trim();
  }

  if (landlineNumber) {
    getAccountInfoReq.landlineNumber = landlineNumber.trim();
  }

  let getAccountInfoResponse = await accountInfoService.getInfo(
    req,
    getAccountInfoReq
  );

  // Legacy alignment: validate the HIP response status, not the request.
  if (getAccountInfoResponse?.hipResponse?.Status !== '00') {
    throw {
      type: 'InvalidParameter',
    };
  }

  if (landlineNumber) {
    if (getAccountInfoResponse?.hipResponse?.AccountNumber) {
      target.accountNumber = getAccountInfoResponse.hipResponse.AccountNumber;
      settlementInformation.accountNumber =
        getAccountInfoResponse.hipResponse.AccountNumber;
    }
  }

  target.accountType = stringUtil.encode(
    Buffer.from(getAccountInfoResponse?.hipResponse?.AccountType || '', 'utf8')
  );
  target.accountName = stringUtil.encode(
    Buffer.from(getAccountInfoResponse?.hipResponse?.AccountName || '', 'utf8')
  );

  settlementInformation.accountType = target.accountType;
  settlementInformation.accountName = target.accountName;
};

const validateGCSBucketValues = async (settlementInformation, req) => {
  const {
    app: { principalId },
    gcs,
  } = req;
  const { requestType, amount } = settlementInformation;

  // Legacy alignment: key is derived from Authorization client_id + suffix.
  // Fallback: keep existing principalId-based key if auth header missing.
  const legacyKey = buildLegacyCatalogKey(req, requestType);
  const fallbackKey = `${principalId}_${String(requestType || '').toUpperCase()}`;
  const res = await gcs.changeSimRepository.getResult(
    req,
    legacyKey ?? fallbackKey
  );

  const formattedPrice = paymentsUtil.formatAmount(amount);

  const match = res.find((p) => (p.price ?? '') === formattedPrice);

  if (!match) {
    throw {
      type: 'CustomBadRequestError',
      details: 'ServiceId and amount are not allowed.',
    };
  }

  if (match.flag === '0') {
    throw {
      type: 'CustomBadRequestError',
      details: 'ServiceId and amount are not allowed.',
    };
  }

  return match;
};

const validateCheckConvenienceFee = async (req) => {
  const {
    cxsRequest: { paymentType, paymentInformation, settlementInformation },
    headers,
    app: { channel },
    enrolledAccountsService,
    accountInfoService,
  } = req;

  const {
    CHANNELS: { NG1, CPT },
    PAYMENT_TYPES: { GCASH, XENDIT },
    PAYMENT_REQUEST_TYPES: { BBPREPAIDPROMO, BBPREPAIDREPAIR, PAY_BILLS },
  } = constants;

  const nodeEnv = config.get('nodeEnv');

  const isNg1 = channel && stringUtil.compareLowerCase(channel, NG1);
  const isCptPreprod =
    nodeEnv === 'preprod' &&
    channel &&
    stringUtil.compareLowerCase(channel, CPT);

  // Legacy: allow NG1 in any env; allow CPT only in preprod
  if (!isNg1 && !isCptPreprod) return;

  if (!headers['user-token']) {
    return;
  }

  if (paymentType) {
    if (
      [GCASH.toLowerCase(), XENDIT.toLowerCase()].includes(
        paymentType.toLowerCase()
      )
    ) {
      const decodedToken = decodeUserJWT(headers['user-token']);
      const uuid = decodedToken.userJWT.uuid;

      if (paymentInformation) {
        for (const settlement of settlementInformation) {
          let account = null;
          let isMobileNumber = false;

          if (settlement.accountNumber) {
            account = settlement.accountNumber;
          }

          if (settlement.landlineNumber) {
            account = settlement.landlineNumber;
          }

          if (settlement.mobileNumber) {
            isMobileNumber = true;
            account = msisdnFormatter(settlement.mobileNumber, '0');
          }

          // Validate the *target account identifier* belongs to the user.
          // This mirrors legacy SuperApp behavior.
          const targetIdentifier = account;
          let enrolledAccountDetails =
            await enrolledAccountsService.validateEnrolledAccounts(
              req,
              uuid,
              targetIdentifier
            );

          if (settlement.billsType) {
            if (
              !(
                settlement.billsType === 'payAllBills' ||
                settlement.billsType === ''
              )
            ) {
              throw {
                type: 'InvalidParameter',
              };
            }
          }

          if (
            settlement.billsType &&
            settlement.billsType === 'payAllBills' &&
            settlement.transactionType === 'G'
          ) {
            enrolledAccountDetails = 'payAllBills';
          } else {
            if (!enrolledAccountDetails.length) {
              if (
                settlement.transactionType === 'N' &&
                (settlement.requestType === BBPREPAIDPROMO ||
                  settlement.requestType === BBPREPAIDREPAIR ||
                  settlement.requestType === PAY_BILLS)
              ) {
                enrolledAccountDetails += 'broadband-prepaidWired-prepaidWired';
              } else {
                if (isMobileNumber) {
                  const getDetailsRequest = {
                    msisdn: account,
                    primaryResourceType: 'C',
                  };
                  let getAccountInfoRes = await accountInfoService.getInfo(
                    req,
                    getDetailsRequest
                  );

                  if (!getAccountInfoRes) {
                    throw {
                      type: 'OperationFailed',
                    };
                  }

                  if (getAccountInfoRes.statusCode === '40002') {
                    throw {
                      type: 'InvalidParameter',
                    };
                  }

                  const hipResponse = getAccountInfoRes.hipResponse;

                  if (!hipResponse) {
                    throw {
                      type: 'OperationFailed',
                    };
                  }

                  const unified = hipResponse?.UnifiedResourceDetails;
                  const attrs =
                    unified?.AttributesInfoList?.AttributesInfo ?? [];

                  for (const attr of attrs) {
                    if (attr.AttrName === 'BRAND') {
                      const brand = attr.AttrValue;
                      if (brand === 'PW') {
                        enrolledAccountDetails = 'broadband-prepaid-';
                      } else if (brand === 'GHP') {
                        enrolledAccountDetails = 'mobile-postpaid-';
                      } else {
                        enrolledAccountDetails = 'mobile-prepaid-';
                      }
                      enrolledAccountDetails += brand;
                    }
                  }
                } else {
                  const reqPayload = {};
                  if (settlement.accountNumber)
                    reqPayload.accountNumber = settlement.accountNumber.trim();
                  if (settlement.landlineNumber)
                    reqPayload.serviceNumber = settlement.landlineNumber.trim();

                  let getAccountInfo = await accountInfoService.getInfo(
                    req,
                    reqPayload
                  );

                  const accountType = getAccountInfo?.hipResponse?.AccountType;

                  if (!accountType) {
                    throw {
                      type: 'MissingParameterValidateException',
                    };
                  }

                  if (accountType === 'G') {
                    enrolledAccountDetails = 'mobile-postpaid-GHP';
                  } else if (['I', 'N', 'B'].includes(accountType)) {
                    enrolledAccountDetails = 'broadband-postpaid-GHP';
                  } else {
                    throw {
                      type: 'InvalidParameter',
                    };
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

const validateBudgetProtect = async (req) => {
  const {
    app: { cxsRequest, channel },
    headers,
    secretManager,
    secret,
  } = req;

  const {
    CHANNELS: { NG1 },
  } = constants;

  if (
    !(channel && stringUtil.compareLowerCase(channel, NG1)) ||
    !headers?.['user-token'] ||
    headers['user-token'].trim() === ''
  ) {
    throw {
      type: 'InvalidRequestValidateException',
      message: 'The request parameters failed in validation.',
    };
  }

  const miscellaneous = {};

  const { budgetProtectConfig } =
    await secretManager.apiConfigRepository.getApiConfig(
      secret,
      constants.API_NUMBERS.CREATE_PAYMENT_SESSION,
      constants.API_VERSIONS.V1,
      constants.SECRET_ENTITY.API_CONFIG
    );

  logger.debug('BUDGET_PROTECT_CONFIG', budgetProtectConfig);

  if (budgetProtectConfig) {
    const { requestTypeAllowed = [], rate, rateType } = budgetProtectConfig;

    // NOTE: `settlementInformation` lives under `cxsRequest`.
    // Do NOT redeclare a variable with the same name and read from itself,
    // otherwise it triggers a temporal-dead-zone ReferenceError.
    const settlementInfo = cxsRequest?.settlementInformation?.[0];
    const requestType = settlementInfo?.requestType;

    if (!settlementInfo) {
      throw {
        type: 'InvalidRequestValidateException',
        message: 'The request parameters failed in validation.',
      };
    }

    const matched = requestTypeAllowed.some((allowedType) =>
      stringUtil.compareLowerCase(allowedType, requestType)
    );

    if (!matched) {
      throw {
        type: 'CustomBadRequestMessageException',
        message: 'The request type is not eligible for budget protection.',
      };
    }

    let calculatedValue = new Decimal(0);
    const amount = new Decimal(settlementInfo?.amount || 0);
    const rateDecimal = new Decimal(rate || 0);

    if (stringUtil.compareLowerCase(rateType, 'percentage')) {
      calculatedValue = amount.mul(rateDecimal.div(100));
    } else if (stringUtil.compareLowerCase(rateType, 'fixed')) {
      calculatedValue = rateDecimal;
    }

    const dateOfBirth = cxsRequest?.budgetProtectProfile?.dateOfBirth;

    const isValidDate = dateTimeUtil.isValidDate(dateOfBirth);
    if (!isValidDate) {
      logger.info(`DateOfBirth format or value is invalid ${dateOfBirth}`);
      throw {
        type: 'InvalidRequestValidateException',
        message: 'The request parameters failed in validation.',
      };
    }

    const profile = cxsRequest?.budgetProtectProfile || {};

    if (!profile.middleName) {
      profile.middleName = ' ';
    }

    if (!profile.gender) {
      profile.gender = 'Not Provided';
    }

    const scaledValue = calculatedValue.toDecimalPlaces(4, Decimal.ROUND_UP);
    const rounded = Math.round(scaledValue.toNumber() * 100) / 100;

    miscellaneous.budgetProtectValue = rounded;
    profile.chargeAmount = rounded;
    profile.chargeRate = rateDecimal.toNumber();
    profile.chargeType = rateType;

    cxsRequest.budgetProtectProfile = profile;
  }

  return miscellaneous;
};

const validateSettlementAmountDiscount = async (
  settlementInformation,
  buyLoadChannelConfigRepository,
  req
) => {
  const {
    app: { channel },
    headers,
    secretManager,
  } = req;

  const { transactions, amount } = settlementInformation;

  let discount = null;
  let extendsConfig = null;

  let totalTransAmount = transactions.reduce(
    (sum, t) => sum + (t.amount || 0),
    0
  );

  let isDiscountAllowed = false;

  if (buyLoadChannelConfigRepository.extendsConfig) {
    extendsConfig = buyLoadChannelConfigRepository.extendsConfig;
    isDiscountAllowed = extendsConfig.channelDiscountAllowed;
  }

  if (
    channel.toLowerCase() !== constants.CHANNELS.NG1.toLowerCase() &&
    !isDiscountAllowed
  ) {
    if (Number(totalTransAmount) !== Number(amount)) {
      logger.error(
        'VALIDATE_SETTLEMENT_DISCOUNT_ERROR',
        "Transaction's total amount should be equal to the settlement amount."
      );

      throw {
        type: 'InvalidParameter',
        displayMessage: `Transaction's total amount should be equal to the settlement amount.`,
      };
    }
  } else {
    // If there is *no* discount applied (settled == total), we don't need to
    // resolve discount config from SSM/headers. Legacy code still validated the
    // equality, but did not require param-store headers in this case.
    const normalizeMoney = (n) => Number(Number(n || 0).toFixed(2));
    if (normalizeMoney(amount) === normalizeMoney(totalTransAmount)) {
      return;
    }

    if (amount > totalTransAmount) {
      logger.error(
        'VALIDATE_SETTLEMENT_DISCOUNT_ERROR',
        "Transaction's total amount should be not greater than settlement amount."
      );

      throw {
        type: 'InvalidRequestValidateException',
        displayMessage: 'The request parameters failed in validation.',
      };
    }

    const isConsumer = !transactions.some((t) => (t?.keyword ?? '') === '');
    const isRetailer = !transactions.some((t) => (t?.wallet ?? '') === '');

    if (isConsumer && isRetailer) {
      logger.error(
        'VALIDATE_SETTLEMENT_DISCOUNT_FAILED',
        'Request for both consumer and retailer in the single transaction is invalid.'
      );

      throw {
        type: 'InvalidRequestValidateException',
        displayMessage: 'The request parameters failed in validation.',
      };
    } else if (isConsumer) {
      if (extendsConfig && extendsConfig?.ssmPathConsumer) {
        discount = await secretManager.paymentServiceRepository.get(
          extendsConfig.ssmPathConsumer
        );
      } else {
        if (
          !headers['consumer_param_store'] ||
          headers['consumer_param_store'] === 'Invalid'
        ) {
          throw {
            type: 'InvalidRequestValidateException',
            displayMessage: 'The request parameters failed in validation.',
          };
        }

        discount = await secretManager.paymentServiceRepository.get(
          headers['consumer_param_store']
        );
      }
    } else if (isRetailer) {
      if (extendsConfig && extendsConfig.ssmPathRetailer) {
        discount = await secretManager.paymentServiceRepository.get(
          extendsConfig.ssmPathRetailer
        );
      } else {
        if (
          !headers['retailer_param_store'] ||
          headers['retailer_param_store'] === 'Invalid'
        ) {
          throw {
            type: 'InvalidRequestValidateException',
            displayMessage: 'The request parameters failed in validation.',
          };
        }
        discount = await secretManager.paymentServiceRepository.get(
          extendsConfig.ssmPathRetailer
        );
      }
    } else {
      throw {
        type: 'InvalidRequestValidateException',
        displayMessage: 'The request parameters failed in validation.',
      };
    }

    const discountPercent = parseFloat(discount ?? '0');
    const settledAmount = amount;

    let percentage =
      ((totalTransAmount - settledAmount) / totalTransAmount) * 100;

    percentage = Math.ceil(percentage * 100) / 100;

    const formattedPercentage = parseFloat(percentage.toFixed(2));

    if (settledAmount !== totalTransAmount) {
      if (formattedPercentage !== discountPercent) {
        logger.error(
          'VALIDATE_SETTLEMENT_DISCOUNT_FAILED',
          `The settled discount ${formattedPercentage}% should be equal to the SSM discount value ${discountPercent}%.`
        );
        throw {
          type: 'InvalidRequestValidateException',
          displayMessage: 'The request parameters failed in validation.',
        };
      }
    }
  }
};

export {
  validateAccountBrand,
  validateBudgetProtect,
  validateCheckConvenienceFee,
  validateECPaySettlementAmount,
  validateECPayTableRequest,
  validateGCSBucketValues,
  validateGPFTransaction,
  validatePayBillsRequest,
  validatePaymentInformation,
  validateSecurityLimits,
  validateSettlementAmountDiscount,
  validateTransactions,
  validateVerificationToken,
};
