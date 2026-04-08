import logger from '@globetel/cxs-core/core/logger/logger.js';
import { constants, paymentsUtil, stringUtil } from './index.js';

const validateXenditRequest = (req, xenditRequest) => {
  const {
    app: { cxsRequest, headers, channel },
  } = req;

  const { settlementInformation, paymentType } = cxsRequest;

  const {
    PAYMENT_REQUEST_TYPES: {
      BUY_PROMO,
      PAY_BILLS,
      BUY_LOAD,
      NON_BILL,
      CHANGE_SIM,
      BBPREPAIDPROMO,
    },
    XENDIT_PAYMENT_OPTIONS: {
      CHANNEL_CODE_PAYMAYA,
      CHANNEL_CODE_GRABPAY,
      CHANNEL_CODE_BPI,
      CHANNEL_CODE_RCBC,
      CHANNEL_CODE_UBP,
    },
    XENDIT_PAYMENT_METHODS: { TYPE_EWALLET, TYPE_CC_DC, TYPE_DIRECT_DEBIT },
  } = constants;

  const requestType = settlementInformation?.[0]?.requestType?.trim();

  const checkChannel = paymentsUtil.checkValidChannel(
    channel,
    paymentType,
    requestType
  );

  if (!checkChannel) {
    logger.debug('Invalid channel for Xendit payment type');
    throw { type: 'InvalidParameter' };
  }

  const validRequestTypes = [
    BUY_PROMO,
    PAY_BILLS,
    BUY_LOAD,
    NON_BILL,
    CHANGE_SIM,
    BBPREPAIDPROMO,
  ];

  const isValidRequestType = validRequestTypes.some((t) =>
    stringUtil.compareLowerCase(t, requestType)
  );

  if (!isValidRequestType) {
    logger.debug('Request type not valid for Xendit');
    throw { type: 'InvalidParameter' };
  }

  if (stringUtil.compareLowerCase(TYPE_EWALLET, xenditRequest?.type)) {
    logger.debug('Validating TYPE_EWALLET');

    if (!xenditRequest?.channelCode) {
      throw {
        type: 'MissingParameterValidateException',
        message: 'Insufficient parameter.',
      };
    }

    if (!xenditRequest?.eWallet) {
      throw {
        type: 'MissingParameterValidateException',
        message: 'Insufficient parameter.',
      };
    }

    if (
      stringUtil.compareLowerCase(
        xenditRequest.channelCode,
        CHANNEL_CODE_PAYMAYA
      )
    ) {
      const { cancelUrl, failureUrl } = xenditRequest.eWallet || {};

      if (!cancelUrl || !failureUrl) {
        throw {
          type: 'MissingParameterValidateException',
          message: 'Insufficient parameter.',
        };
      }

      if (!cancelUrl.trim() || !failureUrl.trim()) {
        throw {
          type: 'InvalidRequestParameter',
          message: 'Invalid parameter.',
        };
      }
    }

    if (
      stringUtil.compareLowerCase(
        xenditRequest.channelCode,
        CHANNEL_CODE_GRABPAY
      )
    ) {
      const { failureUrl } = xenditRequest.eWallet || {};

      if (!failureUrl) {
        throw {
          type: 'MissingParameterValidateException',
          message: 'Insufficient parameter.',
        };
      }

      if (!failureUrl.trim()) {
        throw {
          type: 'InvalidRequestParameter',
          message: 'Invalid parameter.',
        };
      }
    }
  }

  if (stringUtil.compareLowerCase(TYPE_CC_DC, xenditRequest?.type)) {
    logger.debug('Validating TYPE_CC_DC');

    if (stringUtil.compareLowerCase(requestType, BBPREPAIDPROMO)) {
      throw { type: 'InvalidRequestParameter', message: 'Invalid parameter.' };
    }

    const { paymentMethodId, directDebit, eWallet } = xenditRequest;

    if (!paymentMethodId) {
      logger.debug('Missing paymentMethodId');
      throw {
        type: 'MissingParameterValidateException',
        message: 'Insufficient parameter.',
      };
    }

    if (!paymentMethodId.trim()) {
      logger.debug('Blank paymentMethodId');
      throw {
        type: 'InvalidRequestParameter',
        message: 'Invalid parameter.',
      };
    }

    if (directDebit) {
      logger.debug('directDebit not allowed for CC_DC');
      throw { type: 'InvalidRequestParameter', message: 'Invalid parameter.' };
    }

    if (eWallet) {
      logger.debug('eWallet not allowed for CC_DC');
      throw { type: 'InvalidRequestParameter', message: 'Invalid parameter.' };
    }
  }

  if (stringUtil.compareLowerCase(TYPE_DIRECT_DEBIT, xenditRequest?.type)) {
    logger.debug('Validating TYPE_DIRECT_DEBIT');

    if (stringUtil.compareLowerCase(requestType, BBPREPAIDPROMO)) {
      throw { type: 'InvalidRequestParameter', message: 'Invalid parameter.' };
    }

    const { channelCode, paymentMethodId, directDebit, eWallet } =
      xenditRequest;

    if (
      channelCode &&
      ![CHANNEL_CODE_BPI, CHANNEL_CODE_RCBC, CHANNEL_CODE_UBP].some((c) =>
        stringUtil.compareLowerCase(c, channelCode)
      )
    ) {
      logger.debug('Invalid channel code for Direct Debit');
      throw { type: 'InvalidRequestParameter', message: 'Invalid parameter.' };
    }

    if (paymentMethodId) {
      logger.debug('paymentMethodId not allowed for Direct Debit');
      throw { type: 'InvalidRequestParameter', message: 'Invalid parameter.' };
    }

    if (!directDebit) {
      logger.debug('Missing directDebit object');
      throw {
        type: 'MissingParameterValidateException',
        message: 'Insufficient parameter.',
      };
    }

    const { failureUrl, successUrl } = directDebit || {};

    if (!failureUrl?.trim() || !successUrl?.trim()) {
      logger.debug('Invalid directDebit URLs');
      throw {
        type: 'InvalidRequestParameter',
        message: 'Invalid parameter.',
      };
    }

    if (eWallet) {
      logger.debug('eWallet not allowed for Direct Debit');
      throw { type: 'InvalidRequestParameter', message: 'Invalid parameter.' };
    }

    if (!headers?.['user-token']) {
      logger.debug('Missing user-token header');
      throw {
        type: 'MissingParameterValidateException',
        message: 'Insufficient parameter.',
      };
    }
  }
};

export { validateXenditRequest };
