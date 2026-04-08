import { decodeB64, decodeUserJWT } from '@globetel/cxs-core/core/jwt/index.js';
import { msisdnFormatter } from '@globetel/cxs-core/core/utils/string/index.js';
import Decimal from 'decimal.js';
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

  const getDetailsRequest = {
    msisdn: msisdnFormatter(mobileNumber, '09'),
    primaryResourceType: 'C',
  };

  const accountInfoResponse = await accountInfoService.getInfo(
    req,
    getDetailsRequest
  );

  if (!accountInfoResponse) {
    throw {
      type: 'InternalOperationFailed',
    };
  }

  if (accountInfoResponse.error === '40002') {
    throw {
      type: 'InvalidParameter',
    };
  }

  const hipResponse = accountInfoResponse.hipResponse;

  if (
    hipResponse === null ||
    (typeof hipResponse === 'object' && Object.keys(hipResponse).length === 0)
  ) {
    throw {
      type: 'InternalOperationFailed',
    };
  }

  const attributesInfoList =
    hipResponse?.UnifiedResourceDetails?.AttributesInfoList?.AttributesInfo;

  if (Array.isArray(attributesInfoList)) {
    const brandAttr = attributesInfoList.find(
      (attr) => attr?.AttrName === 'BRAND'
    );
    if (brandAttr?.AttrValue === 'GHP') {
      return constants.PAYMENT_ENTITY_TYPES.ENTITY_PTPROMO;
    }
  }
};

const validatePaymentInformation = async (req) => {
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

  if (channel.toLowerCase() === NG1.toLowerCase()) {
    const userToken = headers['user-token'];
    if (!userToken) {
      throw {
        type: 'InsufficientParameters',
      };
    }

    for (const settlement of settlementInformation) {
      switch (paymentType.toLowerCase()) {
        case DROPIN.toLowerCase():
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
    for (const settlement of settlementInformation) {
      if (paymentType.toLowerCase() === XENDIT.toLowerCase()) {
        const reqType = settlement.requestType;
        if (
          channel.toLowerCase() === DNO.toLowerCase() &&
          reqType.toLowerCase() === NON_BILL.toLowerCase()
        ) {
          await paymentTypeModels.DnoXenditRequestType.validateDnoXenditRequest(
            paymentInformation
          );

          paymentTypeModels.DnoXenditRequestType.processDnoXenditRequest(
            paymentInformation,
            settlement
          );
        } else {
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
};

const validateTransactions = async (req, target) => {
  const {
    app: { principalId, channel },
    mongo,
    headers,
    priceValidationService,
    validationService,
    cxsRequest: { settlementInformation: settlementObject },
  } = req;
  let isVoucherDiscount = false;
  const {
    app: {
      additionalParams: { OVERRIDE_DISCOUNT },
    },
    paymentTypeModels,
  } = req;

  const { requestType, transactions, mobileNumber } = settlementObject;

  const {
    PAYMENT_REQUEST_TYPES: {
      BUY_PROMO,
      BUY_LOAD,
      BUY_VOUCHER,
      VOLUME_BOOST,
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

  let channelConfig = await mongo.ChannelConfigRepository.findOneById(
    principalId,
    req
  );

  if (stringUtil.compareLowerCase(BUY_PROMO, requestType)) {
    paymentTypeModels.PurchasePromoRequestType.validatePurchasePromoRequest(
      transactions
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
  } else if (stringUtil.compareLowerCase(BUY_LOAD, requestType)) {
    paymentTypeModels.BuyLoad.validateBuyLoadRequestType(transactions);

    if (!mobileNumber) {
      throw {
        type: 'InsufficientParameters',
      };
    }

    await validationService.validateSecurityLimits(settlementObject, req);

    if (!isVoucherDiscount) {
      await validationService.validateSettlementAmountDiscount(
        settlementObject,
        channelConfig,
        req
      );
    } else {
      await priceValidationService.validateSettlementAmountVoucher(
        settlementObject,
        req
      );
    }
  } else if (stringUtil.compareLowerCase(BUY_VOUCHER, requestType)) {
    paymentTypeModels.BuyVoucher.validateBuyVoucherRequest(transactions);

    validationUtil.validateServiceNumber(settlementObject);
    await priceValidationService.validateServiceIdPrice(
      settlementObject,
      req,
      BUY_VOUCHER
    );
    validationUtil.validateSettlementAmount(settlementObject);
  } else if (stringUtil.compareLowerCase(VOLUME_BOOST, requestType)) {
    paymentTypeModels.volumeBoost.validateVolumeBoostRequest(transactions);
    validateVerificationToken(settlementObject);
  } else if (stringUtil.compareLowerCase(ECPAY, requestType)) {
    if (principalId && stringUtil.compareLowerCase(principalId, NG1)) {
      throw {
        type: 'InvalidParameter',
        displayMessage: 'Additional Property not allowed(transactions[]).',
      };
    }

    paymentTypeModels.ECPay.validateECPayRequest(transactions);

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
      requestType.toLowerCase()
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

      // eslint-disable-next-line eqeqeq
      if (!accountId || targetType == null || !entityIds?.length) {
        throw {
          type: 'InvalidParameter',
          displayMessage:
            'AccountId/TargetType/EntityIds is missing from a required parameter.',
        };
      }

      entityIds.forEach((entityId) => {
        const { id, type } = entityId;

        // eslint-disable-next-line eqeqeq
        if (id == null || type == null) {
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
    stringUtil.compareLowerCase(PAY_BILLS, requestType) &&
    !transactions.length
  ) {
    if (
      settlementObject.transactionType === 'G' &&
      stringUtil.compareLowerCase(channel, NG1)
    ) {
      if (!target.accountType && !target.accountName) {
        await validationService.validatePayBillsRequest(
          settlementObject,
          target,
          req
        );
      }
    }
  } else if (stringUtil.compareLowerCase(CHANGE_SIM, requestType)) {
    if (channel && !stringUtil.compareLowerCase(channel, NG1)) {
      throw {
        type: 'InvalidParameter',
        displayMessage: 'Additional Property not allowed(transactions[]).',
      };
    }

    if (!transactions.length) {
      throw {
        type: 'InvalidParameter',
        displayMessage: 'Transactions should not be empty.',
      };
    }

    transactions.forEach((t) => {
      if (!t.transactionId) {
        throw {
          //TODO - map to endgame error
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

    await validationService.validateGCSBucketValues(
      settlementObject,
      principalId,
      requestType,
      req
    );
  } else {
    if (transactions.length) {
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
  } = req;

  const { amount } = settlementInformation;
  let mobileNumber = msisdnFormatter(settlementInformation.mobileNumber, '09');

  let channelConfig = await mongo.channelConfigRepository.findOneById(
    principalId,
    req
  );

  //TODO - constant
  let sharedConfig = await mongo.channelConfigRepository.findOneById(
    'shared',
    req
  );

  if (!channelConfig) {
    throw {
      type: 'Default',
      displayMessage: 'No channel configuration found.',
    };
  }

  let dailyAmountLimit = 0;
  let isSharedConfig = false;

  if (!sharedConfig) {
    dailyAmountLimit = channelConfig.maximumDailyAmount;
  } else {
    isSharedConfig = true;
    dailyAmountLimit = sharedConfig.maximumDailyAmount;
  }

  const {
    startTime: { hh = 22, mm = 0, ss = 0 },
    channelCode,
  } = channelConfig;

  const { dateFrom, dateTo, formattedDateFrom, formattedDateTo, now } =
    dateTimeUtil.computeDailyWindow({ hh, mm, ss });

  let transactions = null;

  if (!isSharedConfig) {
    transactions =
      await mongo.buyLoadTransactionsRepository.findByMobileDateChannel({
        mobileNumber,
        channelCode,
        formattedDateFrom,
        formattedDateTo,
      });
  } else {
    transactions = await mongo.buyLoadTransactionsRepository.findByMobileDate({
      mobileNumber,
      formattedDateFrom,
      formattedDateTo,
    });
  }

  if (
    transactions.length >= channelConfig.maximumDailyTransactions &&
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

  const totalAmount = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
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
  const { mongo } = req;
  const { transactions } = settlementInformation;

  for (const t of transactions) {
    const partnerRef = t.partnerReferenceNumber;

    const ecpayTransactionEntity =
      await mongo.ecpayTransactionRepository.findByPartnerRef(partnerRef);

    if (!ecpayTransactionEntity.length) {
      logger.error(
        'ECPAY_TABLE_REQUEST_VALIDATION',
        'NotMatchParameterException : ECPay PRN Transaction Not found'
      );

      throw {
        type: 'InvalidOutboundRequest',
      };
    }

    validationUtil.validateECPayTransactionEntity(ecpayTransactionEntity[0], t);
  }
};

const validateECPaySettlementAmount = async (settlementInformation, req) => {
  const {
    headers: { paymentType },
    secretManager,
    secret,
  } = req;

  const {
    PAYMENT_TYPES: { GCASH, DROPIN },
  } = constants;

  const { transactions } = settlementInformation;

  if (!paymentType) {
    throw {
      type: 'InvalidParameter',
      displayMessage: 'PaymentType is required',
    };
  }

  for (const t of transactions) {
    const amountToPay = Number(t.amountToPay);
    const serviceCharge = Number(t.serviceCharge);
    let totalAmount = 0;

    if (stringUtil.compareLowerCase(paymentType, GCASH)) {
      const processingFeeRate = Number(
        await secretManager.paymentServiceRepository.getGcashProcessingFee(
          secret
        )
      );

      const processingFeeResult =
        (amountToPay + serviceCharge) * processingFeeRate;

      totalAmount = amountToPay + serviceCharge + processingFeeResult;
      t.processingFee = processingFeeRate;
    } else if (stringUtil.compareLowerCase(paymentType, DROPIN)) {
      totalAmount = amountToPay + serviceCharge;
    }

    totalAmount = Math.ceil(totalAmount * 100) / 100;

    t.totalAmount = totalAmount;
  }

  const totalTransAmountToPay = transactions
    .map((t) => t.totalAmount)
    .reduce((sum, curr) => sum + curr, 0);

  if (
    Number(totalTransAmountToPay.toFixed(2)) !==
    Number(settlementInformation.amount.toFixed(2))
  ) {
    //TODO - add new type in core-lib
    throw {
      type: 'InvalidRequestValidateException',
    };
  }
};

const validateGPFTransaction = async (settlementInformation, req) => {
  const { transactionType, createOrderExternal, amount, dnoService } =
    settlementInformation;

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

  if (!getAccountInfoReq.status === '00') {
    throw {
      type: 'InvalidParameter',
    };
  }

  if (landlineNumber) {
    if (getAccountInfoResponse.accountNumber) {
      target.accountNumber = getAccountInfoResponse.accountNumber;
      settlementInformation.accountNumber =
        getAccountInfoResponse.accountNumber;
    }
  }

  target.accountType = stringUtil.encode(
    Buffer.from(getAccountInfoResponse.accountType, 'utf8')
  );
  target.accountName = stringUtil.encode(
    Buffer.from(getAccountInfoResponse.accountName, 'utf8')
  );

  settlementInformation.accountType = stringUtil.encode(
    Buffer.from(getAccountInfoResponse.accountType, 'utf8')
  );
  settlementInformation.accountName = stringUtil.encode(
    Buffer.from(getAccountInfoResponse.accountName, 'utf8')
  );
};

const validateGCSBucketValues = async (settlementInformation, req) => {
  const {
    app: { principalId },
    gcs,
  } = req;
  const { requestType, amount } = settlementInformation;

  const fileSuffix = `${principalId}_${requestType.toUpperCase()}`;

  const res = await gcs.changeSimRepository.getResult(req, fileSuffix);

  const formattedPrice = paymentsUtil.formatAmount(amount);

  const match = res.find((p) => (p.price ?? '') === formattedPrice);

  if (!match) {
    //TODO - match with legacy

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
  if (
    !(channel && stringUtil.compareLowerCase(channel, NG1)) ||
    (nodeEnv === 'preprod' && stringUtil.compareLowerCase(channel, CPT))
  ) {
    return;
  }

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
            account = msisdnFormatter(settlement.mobileNumber, '09');
          }

          let enrolledAccountDetails =
            await enrolledAccountsService.validateEnrolledAccounts(req, uuid);

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
                    account,
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

                  const accountType = getAccountInfo?.hipResponse?.accountType;

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

    const settlementInformation = settlementInformation?.[0];
    const requestType = settlementInformation?.requestType;

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
    const amount = new Decimal(settlementInformation?.amount || 0);
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
  channelConfig,
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

  if (channelConfig.extendsConfig) {
    extendsConfig = channelConfig.extendsConfig;
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
