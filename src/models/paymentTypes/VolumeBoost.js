//TODO - utilitize validation for every model
import { logger } from '@globetel/cxs-core/core/logger/index.js';
import Joi from 'joi';

const VolumeBoostRequestTypeSchema = Joi.array()
  .min(1)
  .items(
    Joi.object({
      verificationToken: Joi.string().pattern(/\S/).required(),
    }).unknown(false)
  );

const validateVolumeBoostRequest = (payload) => {
  try {
    const { error } = VolumeBoostRequestTypeSchema.validate(payload);

    if (error) {
      logger.debug('VolumeBoostRequestTypeSchema', error);
      const keywords = ['must contain at least one', 'is required'];
      const errorType = keywords.some((k) =>
        (error.details?.[0]?.message || '').includes(k)
      )
        ? 'InsufficientParameters'
        : 'InvalidParameter';

      throw { type: errorType };
    }
  } catch (error) {
    logger.debug('VolumeBoostRequestTypeSchema failed', error);
    throw error;
  }
};

export { validateVolumeBoostRequest };
