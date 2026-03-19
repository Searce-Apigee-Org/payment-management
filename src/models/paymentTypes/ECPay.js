import Joi from 'joi';

const ECPayRequestSchema = Joi.array()
  .min(1)
  .items(
    Joi.object({
      partnerReferenceNumber: Joi.string()
        .pattern(/^[0-9]+$/)
        .min(1)
        .required(),

      billerName: Joi.string().min(1).required(),

      accountNumber: Joi.string().min(1).required(),

      accountIdentifier: Joi.string().min(1).required(),

      amountToPay: Joi.number().min(1).required(),

      serviceCharge: Joi.number().min(0).required(),
    }).unknown(false)
  );

const validateECPayRequest = (payload) => {
  try {
    const { error } = ECPayRequestSchema.validate(payload);

    if (error) {
      logger.debug('ECPayRequestSchema', error);
      const keywords = ['must contain at least one', 'is required'];
      const errorType = keywords.some((k) =>
        (error.details?.[0]?.message || '').includes(k)
      )
        ? 'InsufficientParameters'
        : 'InvalidParameter';

      throw { type: errorType };
    }
  } catch (error) {
    logger.debug('ECPayRequestSchema failed', error);
    throw error;
  }
};

export { validateECPayRequest };
