import { logger } from '@globetel/cxs-core/core/logger/index.js';
import Joi from 'joi';

const BuyVoucherRequestTypeSchema = Joi.array()
  .min(1)
  .items(
    Joi.object({
      serviceNumber: Joi.string().pattern(/\S/),
      voucherCategory: Joi.string().pattern(/\S/).required(),
      amount: Joi.number().min(1).required(),
    }).unknown(false)
  );

const validateBuyVoucherRequest = (payload) => {
  try {
    const { error } = BuyVoucherRequestTypeSchema.validate(payload);

    if (error) {
      logger.debug('BuyVoucherRequestTypeSchema', error);
      const keywords = ['must contain at least one', 'is required'];
      const errorType = keywords.some((k) =>
        (error.details?.[0]?.message || '').includes(k)
      )
        ? 'InsufficientParameters'
        : 'InvalidParameter';

      throw { type: errorType };
    }
  } catch (error) {
    logger.debug('BuyVoucherRequestTypeSchema failed', error);
    throw error;
  }
};

export { validateBuyVoucherRequest };
