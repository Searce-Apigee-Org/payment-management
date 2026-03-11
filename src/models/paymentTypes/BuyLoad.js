import { logger } from '@globetel/cxs-core/core/logger/index.js';
import Joi from 'joi';

const BuyLoadRequestTypeSchema = Joi.array()
  .min(1)
  .items(
    Joi.object({
      wallet: Joi.string().valid('A', 'L'),
      keyword: Joi.string().pattern(/\S/),
      externalTransactionId: Joi.string(),
      agentName: Joi.string().optional(),
      amount: Joi.number().min(1).required(),
    })
      .xor('keyword', 'wallet')
      .unknown(false)
      .required()
  )
  .required();

const validateBuyLoadRequestType = (payload) => {
  try {
    // Normalize: treat empty/whitespace agentName as missing for validation,
    // but keep field as `null` post-validation (downstream expects null over "").
    const normalized = Array.isArray(payload)
      ? payload.map((t) => {
          const agentName =
            typeof t?.agentName === 'string'
              ? t.agentName.trim()
              : t?.agentName;
          if (agentName === '') {
            // remove for schema validation (empty string is invalid in Joi.string())
            // NOTE: don't mutate original object yet.
            const { agentName: _drop, ...rest } = t;
            return rest;
          }
          return t;
        })
      : payload;

    const { error } = BuyLoadRequestTypeSchema.validate(normalized);

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

    // Post-normalization mutation: set agentName to null if it was blank.
    if (Array.isArray(payload)) {
      payload.forEach((t) => {
        if (typeof t?.agentName === 'string' && t.agentName.trim() === '') {
          t.agentName = null;
        }
      });
    }
  } catch (error) {
    logger.debug('validateBuyLoadRequestType failed', error);
    throw error;
  }
};

export { validateBuyLoadRequestType };
