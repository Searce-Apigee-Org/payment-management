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

const isValidEmail = (email) => {
  const regex = /^[a-zA-Z0-9_!#$%&'*+/=?`{|}~^.-]+@[a-zA-Z0-9.-]+$/;
  return regex.test(email);
};

const validateShopperReference = (paymentRequest, req) => {
  const { headers } = req;
  const userToken = headers['user-token'];

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
  const fieldsToCompare = ['accountNumber', 'accountIdentifier', 'billerName'];
  const numericFields = ['serviceCharge', 'amountToPay'];

  const isMatch =
    fieldsToCompare.every((f) => entity[f] === t[f]) &&
    numericFields.every((f) => Number(entity[f]) === Number(t[f]));

  if (!isMatch) {
    logger.error(
      'ECPAY_TXN_ENTITY_VALIDATION_FAILED',
      'NotMatchParameterException: ECPay and Payload not the same values'
    );

    throw {
      type: 'InvalidOutboundRequest',
    };
  }
};

const validateBindingId = (cxsRequest, response) => {
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
    return;
  }

  for (const settlement of settlementInformation) {
    if (!settlement.voucher) {
      continue;
    }

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

  transactions.forEach((t) => {
    if (!t.serviceNumber) {
      throw {
        type: 'InsufficientParameters',
        displayMessage: 'serviceNumber required',
      };
    }

    if (settlementInformation.mobileNumber && t.serviceNumber) {
      throw {
        type: 'InvalidParameter',
        displayMessage: 'mobileNumber cannot coexist with $serviceNumber.',
      };
    }
  });
};

export {
  isValidEmail,
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
