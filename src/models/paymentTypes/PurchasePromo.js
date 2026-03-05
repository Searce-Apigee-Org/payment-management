import { logger } from '@globetel/cxs-core/core/logger/index.js';
import Joi from 'joi';

//TODOS - test this validation
const BoosterSchema = Joi.object({
  sid: Joi.string().min(1).max(64).required(),
  param: Joi.string().min(1).max(64).required(),
});

const ItemSchema = Joi.object({
  serviceId: Joi.string().pattern(/^[0-9]+$/),
  keyword: Joi.string().pattern(/\S/),
  param: Joi.string(),
  amount: Joi.number().required(),
  booster: Joi.array().items(BoosterSchema),
})
  .unknown(false)
  .custom((value, helpers) => {
    if (value.serviceId && value.param) {
      if (value.amount < 0) {
        return helpers.error('any.invalid', {
          message: 'amount must be >= 0 when serviceId and param are present',
        });
      }
    } else {
      if (value.amount < 1) {
        return helpers.error('any.invalid', {
          message: 'amount must be >= 1 when serviceId/param are missing',
        });
      }
    }

    if (value.keyword && !value.param && !value.serviceId) {
      return value;
    }

    if (value.serviceId && !value.keyword && !value.param) {
      return value;
    }

    if (value.serviceId && value.param && !value.keyword) {
      return value;
    }

    return helpers.error('any.invalid', {
      message:
        'Validation failed: must satisfy one of [keyword only] OR [serviceId only] OR [serviceId+param]',
    });
  });

const RootSchema = Joi.array().items(ItemSchema).min(1);

const validatePurchasePromoRequest = (payload) => {
  try {
    const { error, value } = RootSchema.validate(payload, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const insufficientTypes = ['any.required', 'object.missing', 'array.min'];
      const errorType = error.details.some((d) =>
        insufficientTypes.includes(d.type)
      )
        ? 'InsufficientParameters'
        : 'InvalidParameter';

      throw {
        type: errorType,
      };
    }

    return value;
  } catch (error) {
    logger.debug('validatePurchasePromoRequest failed', error);
    throw error;
  }
};

export { validatePurchasePromoRequest };
