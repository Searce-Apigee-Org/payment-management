import { logger } from '@globetel/cxs-core/core/logger/index.js';
import Joi from 'joi';
import { constants, validationUtil } from '../../util/index.js';

const AdyenDropinRequestSchema = Joi.object({
  platform: Joi.string(),
  shopperLocale: Joi.string().pattern(/\S/).required(),
  browserInformation: Joi.object({
    acceptHeader: Joi.string(),
    userAgent: Joi.string(),
  }).unknown(false),
  responseUrl: Joi.string(),
  entityType: Joi.string(),
  shopperReference: Joi.string(),
}).options({ stripUnknown: true });

const validateAdyenDropinRequest = (payload) => {
  try {
    const { error, value } = AdyenDropinRequestSchema.validate(payload);

    if (error) {
      logger.debug('AdyenDropinRequestValidationFailed', error);
      const keywords = ['must contain at least one', 'is required'];
      const errorType = keywords.some((k) =>
        error.details[0].message.includes(k)
      )
        ? 'InsufficientParameters'
        : 'InvalidParameter';

      throw {
        type: errorType,
      };
    }

    return value;
  } catch (error) {
    logger.debug('validateAdyenDropinRequest failed', error);
    throw error;
  }
};

const processAdyenDropinRequest = async (payload, settlementInfo) => {
  try {
    const { requestType } = settlementInfo;
    const settlementInfoRequestType = requestType.toLowerCase();
    const entityType = payload.entityType;

    const {
      PAYMENT_REQUEST_TYPES: { BUY_LOAD, BUY_PROMO, ECPAY },
      PAYMENT_TYPES: { DROPIN },
      PAYMENT_ENTITY_TYPES: { ENTITY_PROMO, ENTITY_ECPAY },
    } = constants;

    if (
      [
        BUY_LOAD.toLowerCase(),
        BUY_PROMO.toLowerCase(),
        ECPAY.toLowerCase(),
      ].includes(settlementInfoRequestType.toLowerCase()) &&
      !entityType
    ) {
      logger.error(
        'Missing required parameter ' + DROPIN,
        settlementInfoRequestType
      );
      throw {
        type: 'InsufficientParameters',
      };
    }

    const validators = {
      [BUY_PROMO.toLowerCase()]: () => {
        validationUtil.validatePaymentRequestEntity(entityType, ENTITY_PROMO);
      },
      [ECPAY.toLowerCase()]: () => {
        validationUtil.validatePaymentRequestEntity(entityType, ENTITY_ECPAY);
      },
      [BUY_LOAD.toLowerCase()]: () => {
        validationUtil.validateBuyLoadTransaction(settlementInfo, entityType);
      },
    };

    if (validators[settlementInfoRequestType]) {
      validators[settlementInfoRequestType]();
    }
  } catch (error) {
    logger.debug('validateAdyenDropinRequest failed', error);
    throw error;
  }
};

export { processAdyenDropinRequest, validateAdyenDropinRequest };
