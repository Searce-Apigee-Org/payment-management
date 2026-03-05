import { logger } from '@globetel/cxs-core/core/logger/index.js';
import Joi from 'joi';

const BuyLoadRequestTypeSchema = Joi.array()
  .min(1)
  .items(
    Joi.object({
      wallet: Joi.string().valid('A', 'L'),
      keyword: Joi.string().pattern(/\S/),
      externalTransactionId: Joi.string(),
      agentName: Joi.string(),
      amount: Joi.number().min(1).required(),
    })
      .xor('keyword', 'wallet')
      .unknown(false)
      .required()
  )
  .required();

const validateBuyLoadRequestType = (payload) => {
  try {
    const { error } = BuyLoadRequestTypeSchema.validate(payload);

    if (error) {
      logger.debug('BuyLoadRequestTypeSchema', error);
      const keywords = ['must contain at least one', 'is required'];
      const errorType = keywords.some((k) =>
        (error.details?.[0]?.message || '').includes(k)
      )
        ? 'InsufficientParameters'
        : 'InvalidParameter';

      throw { type: errorType };
    }
  } catch (error) {
    logger.debug('validateBuyLoadRequestType failed', error);
    throw error;
  }
};

export { validateBuyLoadRequestType };
