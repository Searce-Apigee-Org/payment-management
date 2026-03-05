import logger from '@globetel/cxs-core/core/logger/logger.js';
import Joi from 'joi';
import { constants } from '../../util/index.js';

const DnoXenditRequestSchema = Joi.object({
  type: Joi.string().required(),

  channelCode: Joi.string(),

  productName: Joi.string(),

  paymentMethodId: Joi.string(),

  eWallet: Joi.object({
    cancelUrl: Joi.string(),
    failureUrl: Joi.string(),
    successUrl: Joi.string().required(),
  }).unknown(false),

  directDebit: Joi.object({
    failureUrl: Joi.string().required(),
    successUrl: Joi.string().required(),
  }).unknown(false),

  reusability: Joi.string().default('ONE_TIME_USE'),

  customerUuid: Joi.string(),
})
  .required()
  .unknown(false);

const validateDnoXenditRequest = (payload) => {
  try {
    const { error, value } = DnoXenditRequestSchema.validate(payload);

    if (error) {
      logger.debug('validateDnoXenditRequest', error);
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
    logger.debug('validateDnoXenditRequest failed', error);
    throw error;
  }
};

const processDnoXenditRequest = (payload, settlementInfo) => {
  const dnoProductName = payload.productName;
  const {
    PAYMENT_ENTITY_TYPES: { ENTITY_GFPACQUI },
  } = constants;

  if (
    dnoProductName &&
    dnoProductName.toLowerCase() !== ENTITY_GFPACQUI.toLowerCase()
  ) {
    logger.error('InvalidRequestValidateException', dnoProductName);
    throw {
      type: 'InvalidOutboundRequest',
    };
  }

  if (!settlementInfo.mobileNumber && settlementInfo.accountNumber) {
    throw {
      type: 'InvalidOutboundRequest',
    };
  }

  if (!settlementInfo.mobileNumber) {
    throw {
      type: 'InsufficientParameters',
      details: 'mobileNumber is required for this requestType.',
    };
  }
};

export { processDnoXenditRequest, validateDnoXenditRequest };
