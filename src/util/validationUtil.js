import { decodeUserJWT } from '@globetel/cxs-core/core/jwt/index.js';
import logger from '@globetel/cxs-core/core/logger/logger.js';
import { constants } from './index.js';
import { compareLowerCase } from './stringUtil.js';

const validatePaymentRequestEntity = (paymentRequestType, validRequestType) => {
  if (paymentRequestType.toLowerCase() !== validRequestType.toLowerCase()) {
    logger.error('InvalidRequestValidateException', paymentRequestType);

    throw {
      type: 'InvalidOutboundRequest',
    };
  }
};

const isValidToken = (accessToken) => {
  return Date.now() <= accessToken.accessTokenExpiresAt * 1000;
};

const isValidGpayOT2Token = (accessToken) => {
  return Date.now() <= accessToken.expiresIn * 1000;
};

const isValidEmail = (email) => {
  const regex = /^[a-zA-Z0-9_!#$%&'*+/=?`{|}~^.-]+@[a-zA-Z0-9.-]+$/;
  return regex.test(email);
};

const validateShopperReference = (paymentRequest, req) => {
  const { headers } = req;
  const userToken = headers['user-token'];

  // Legacy behavior: shopperReference is optional. Only validate when provided.
  if (!paymentRequest?.shopperReference) {
    return;
  }

  if (!userToken) {
    throw {
      type: 'InsufficientParameters',
    };
  }

  const decodedToken = decodeUserJWT(headers['user-token']);

  const {
    userJWT: { uuid },
  } = decodedToken;

  if (paymentRequest.shopperReference !== uuid) {
    throw {
      type: 'InvalidOutboundRequest',
    };
  }
};

const validateVerficationToken = (payload) => {
  const { iss, exp, price, accountNumber } = payload;

  if (!iss || !exp || !price || !accountNumber) {
    throw {
      type: 'InsufficientParameters',
    };
  }

  if (!compareLowerCase('CXS', iss)) {
    throw {
      type: 'InvalidParameter',
      displayMessage: 'verificationToken invalid : iss',
    };
  }

  if (Date.now() >= Number(exp) * 1000) {
    throw {
      type: 'InvalidParameter',
      displayMessage: 'verificationToken is expired.',
    };
  }
};

const validateECPayTransactionEntity = (entity, t) => {
  // ECPay transaction records can come from either Mongo (camelCase fields)
  // or DynamoDB (snake_case fields). Accept both shapes.
  const getString = (obj, camel, snake) =>
    obj?.[camel] ?? (snake ? obj?.[snake] : undefined);

  const getNumber = (obj, camel, snake) => {
    const val = getString(obj, camel, snake);
    return val === undefined || val === null || val === '' ? NaN : Number(val);
  };

  const entityAccountNumber = getString(
    entity,
    'accountNumber',
    'account_number'
  );
  const entityAccountIdentifier = getString(
    entity,
    'accountIdentifier',
    'account_identifier'
  );
  const entityBillerName = getString(entity, 'billerName', 'biller_name');
  const entityServiceCharge = getNumber(
    entity,
    'serviceCharge',
    'service_charge'
  );

  // Amount can be stored as:
  // - `amountToPay` (mongo)
  // - `amount_to_pay` (some dynamo variants)
  // - `amount` (current dynamo table)
  // Prefer explicit amountToPay field when present (even if it is 0),
  // otherwise fall back to `amount`.
  const rawPrimaryAmountToPay = getString(
    entity,
    'amountToPay',
    'amount_to_pay'
  );
  const entityAmountToPay =
    rawPrimaryAmountToPay !== undefined &&
    rawPrimaryAmountToPay !== null &&
    rawPrimaryAmountToPay !== ''
      ? Number(rawPrimaryAmountToPay)
      : getNumber(entity, 'amount', 'amount');

  const payloadAccountNumber = t?.accountNumber;
  const payloadAccountIdentifier = t?.accountIdentifier;
  const payloadBillerName = t?.billerName;
  const payloadServiceCharge = getNumber(t, 'serviceCharge');
  const payloadAmountToPay = getNumber(t, 'amountToPay');

  const diff = {
    accountNumber: {
      entity: entityAccountNumber,
      payload: payloadAccountNumber,
      match: entityAccountNumber === payloadAccountNumber,
    },
    accountIdentifier: {
      entity: entityAccountIdentifier,
      payload: payloadAccountIdentifier,
      match: entityAccountIdentifier === payloadAccountIdentifier,
    },
    billerName: {
      entity: entityBillerName,
      payload: payloadBillerName,
      match: entityBillerName === payloadBillerName,
    },
    serviceCharge: {
      entity: entityServiceCharge,
      payload: payloadServiceCharge,
      match: entityServiceCharge === payloadServiceCharge,
    },
    amountToPay: {
      entity: entityAmountToPay,
      payload: payloadAmountToPay,
      match: entityAmountToPay === payloadAmountToPay,
    },
  };

  const isMatch =
    entityAccountNumber === payloadAccountNumber &&
    entityAccountIdentifier === payloadAccountIdentifier &&
    entityBillerName === payloadBillerName &&
    entityServiceCharge === payloadServiceCharge &&
    entityAmountToPay === payloadAmountToPay;

  if (!isMatch) {
    logger.error('ECPAY_TXN_ENTITY_VALIDATION_FAILED', {
      reason:
        'NotMatchParameterException: ECPay and Payload not the same values',
      // Avoid logging sensitive ECPay table fields (e.g., secret_key).
      // We only log the comparison keys.
      diff,
    });

    throw {
      type: 'InvalidOutboundRequest',
      details:
        'NotMatchParameterException: ECPay and Payload not the same values',
    };
  }
};

const validateBindingId = (cxsRequest, response) => {
  logger.debug('VALIDATION_VALIDATE_BINDING_ID_START', {
    paymentType: cxsRequest?.paymentType,
    hasPaymentInformation: Boolean(cxsRequest?.paymentInformation),
    responseStatus: response?.status,
  });

  const {
    PAYMENT_TYPES: { GCASH },
  } = constants;

  if (!cxsRequest?.paymentInformation) return;

  const paymentInformation = cxsRequest.paymentInformation;
  let bindingRequestId = null;

  if (
    typeof paymentInformation === 'object' &&
    !Array.isArray(paymentInformation)
  ) {
    bindingRequestId = paymentInformation.bindingRequestID || null;
  }

  logger.info('bindingRequestId', bindingRequestId);
  logger.info('response', response);

  if (
    cxsRequest.paymentType &&
    cxsRequest.paymentType.toUpperCase() === GCASH &&
    bindingRequestId
  ) {
    logger.debug('VALIDATION_VALIDATE_BINDING_ID_GCASH_PATH', {
      bindingRequestIdPresent: Boolean(bindingRequestId),
    });
    if (parseInt(response?.status, 10) === 400) {
      const message = response?.data?.message || null;

      if (message) {
        if (message.toLowerCase().includes('inactive')) {
          throw {
            type: 'CustomBadRequestMessageException',
            message: 'The Binding account is already inactive.',
          };
        } else if (message.toLowerCase().includes('expired')) {
          throw {
            type: 'CustomBadRequestMessageException',
            message: 'The Binding account is already expired.',
          };
        }
      }
    }
  }
};

const validateOutboundResponse = (responseCode) => {
  logger.debug('VALIDATION_VALIDATE_OUTBOUND_RESPONSE', {
    responseCode,
  });

  const {
    HTTP_STATUS_CODES: {
      SC_OK,
      SC_BAD_REQUEST,
      SC_UNPROCESSABLE_ENTITY,
      SC_FORBIDDEN,
      SC_UNAUTHORIZED,
    },
  } = constants;

  if (!responseCode && responseCode !== 0) {
    throw {
      type: 'InternalOperationFailed',
      message: 'Error Mapping exception.',
    };
  }

  const code = parseInt(responseCode, 10);

  switch (code) {
    case SC_OK:
      break;

    case SC_BAD_REQUEST:
    case SC_UNPROCESSABLE_ENTITY:
      throw {
        type: 'InvalidOutboundRequest',
      };

    case SC_FORBIDDEN:
      throw {
        type: 'InvalidApiKey',
      };

    case SC_UNAUTHORIZED:
      throw {
        type: 'OutboundAuthenticationError',
      };

    default:
      throw {
        type: 'OutboundOperationFailed',
        message: 'Outbound Response code not found.',
      };
  }
};

const validateBuyLoadTransaction = (settlementInformation, provisionOrder) => {
  const transactions = settlementInformation.transactions || [];

  const isConsumer = !transactions.some((t) => (t.keyword ?? '') === '');
  const isRetailer = !transactions.some((t) => (t.wallet ?? '') === '');

  const {
    PAYMENT_ENTITY_TYPES: { ENTITY_LOAD, ENTITY_LOADRET },
  } = constants;

  if (isConsumer && isRetailer) {
    logger.error(
      'validateBuyLoadTransaction failed',
      'Request for both consumer and retailer in the single transaction is invalid.'
    );
    throw { type: 'InvalidOutboundRequest' };
  }

  if (isConsumer) {
    if (provisionOrder.toLowerCase() !== ENTITY_LOAD.toLowerCase()) {
      logger.error(`InvalidRequestValidateException consumer`, provisionOrder);
      throw { type: 'InvalidOutboundRequest' };
    }
    return;
  }

  if (isRetailer) {
    if (provisionOrder.toLowerCase() !== ENTITY_LOADRET.toLowerCase()) {
      logger.error(`InvalidRequestValidateException retailer`, provisionOrder);
      throw { type: 'InvalidOutboundRequest' };
    }
    return;
  }

  logger.error(`InvalidRequestValidateException: ${provisionOrder}`);
  throw { type: 'InvalidOutboundRequest' };
};

const validateVoucherInfoRequest = async (req) => {
  logger.debug('VALIDATION_VALIDATE_VOUCHER_INFO_REQUEST_START', {
    channel: req?.app?.channel,
    settlementCount: Array.isArray(req?.app?.cxsRequest?.settlementInformation)
      ? req.app.cxsRequest.settlementInformation.length
      : 0,
  });

  const {
    app: {
      channel,
      cxsRequest: { settlementInformation },
    },
    headers,
  } = req;

  const {
    CHANNELS: { NG1 },
    PAYMENT_REQUEST_TYPES: { BUY_LOAD, BUY_PROMO },
  } = constants;

  if (channel.toLowerCase() !== NG1.toLowerCase()) {
    logger.debug('VALIDATION_VALIDATE_VOUCHER_INFO_REQUEST_SKIP', {
      reason: 'NON_NG1_CHANNEL',
      channel,
    });
    return;
  }

  for (const settlement of settlementInformation) {
    if (!settlement.voucher) {
      continue;
    }

    logger.debug('VALIDATION_VALIDATE_VOUCHER_INFO_REQUEST_HAS_VOUCHER', {
      requestType: settlement?.requestType,
      hasUserToken: Boolean(headers?.['user-token']),
    });

    if (!headers['user-token']) {
      throw {
        type: 'InvalidOutboundRequest',
        details: 'The request parameter is missing a mandatory parameter',
      };
    }

    if (
      settlement.requestType.toLowerCase() !== BUY_LOAD.toLowerCase() &&
      settlement.requestType.toLowerCase() !== BUY_PROMO.toLowerCase()
    ) {
      throw {
        type: 'InvalidParameter',
      };
    }

    if (settlement.requestType.toLowerCase() === BUY_LOAD.toLowerCase()) {
      for (const transaction of settlement.transactions) {
        if (transaction.wallet) {
          throw {
            type: 'InvalidParameter',
          };
        }
      }
    }

    const decodedToken = decodeUserJWT(headers['user-token']);

    const {
      userJWT: { uuid },
    } = decodedToken;

    req.app.additionalParams = {
      UUID_USER: uuid,
      OVERRIDE_DISCOUNT: true,
    };

    logger.debug('VALIDATION_VALIDATE_VOUCHER_INFO_REQUEST_OK', {
      UUID_USER: uuid,
      OVERRIDE_DISCOUNT: true,
    });
  }
};

const validateReferalCheck = (settlementInformation) => {
  const { referralCode = null, transactions } = settlementInformation;
  if (referralCode) {
    for (const transaction of transactions) {
      if (transaction.keyword) {
        throw {
          type: 'InvalidParameter',
          message: 'Referral Code only exclusive with ServiceId',
        };
      }
    }
  }
};

const validateSettlementAmount = (settlementInformation) => {
  const { transactions, amount } = settlementInformation;

  const transactionAmounts = transactions.map((t) => Number(t.amount || 0));
  const total = transactionAmounts.reduce((sum, value) => sum + value, 0);

  if (total !== Number(amount)) {
    throw {
      type: 'InvalidParameter',
      message: `Transaction's total amount should be equal to the settlement amount.`,
    };
  }

  return total;
};

const validateServiceNumber = (settlementInformation) => {
  const { transactions } = settlementInformation;

  const hasSettlementAccountNumber = Boolean(
    settlementInformation.accountNumber
  );
  const hasSettlementMobileNumber = Boolean(settlementInformation.mobileNumber);

  transactions.forEach((t) => {
    const hasServiceNumber =
      t.serviceNumber !== null &&
      t.serviceNumber !== undefined &&
      String(t.serviceNumber).trim() !== '';

    // Legacy BuyVoucher behavior:
    // - If settlementInformation.accountNumber is present => serviceNumber is required in each transaction.
    // - If settlementInformation.mobileNumber is present => serviceNumber MUST NOT be present.
    if (hasSettlementAccountNumber && !hasServiceNumber) {
      throw {
        type: 'InsufficientParameters',
        displayMessage: 'serviceNumber required',
      };
    }

    if (hasSettlementMobileNumber && hasServiceNumber) {
      throw {
        type: 'InvalidParameter',
        displayMessage: 'mobileNumber cannot coexist with $serviceNumber.',
      };
    }
  });
};

export {
  isValidEmail,
  isValidGpayOT2Token,
  isValidToken,
  validateBindingId,
  validateBuyLoadTransaction,
  validateECPayTransactionEntity,
  validateOutboundResponse,
  validatePaymentRequestEntity,
  validateReferalCheck,
  validateServiceNumber,
  validateSettlementAmount,
  validateShopperReference,
  validateVerficationToken,
  validateVoucherInfoRequest,
};
