import Joi from 'joi';

const processCSPaymentsRequestSchema = {
  headers: Joi.object({
    cxscachecontrol: Joi.string().optional(),
  })
    .unknown(true)
    .label('ProcessCSPaymentsHeaders'),
  payload: Joi.object({
    tokenPaymentId: Joi.string()
      .required()
      .trim()
      .description('GOR Parameter : paymentTokenId'),
    paymentStatus: Joi.string()
      .required()
      .trim()
      .description('GOR Parameter : paymentStatus'),
    transactionId: Joi.string()
      .required()
      .trim()
      .description('GOR Parameter : referenceId'),
    paymentChannel: Joi.string()
      .required()
      .trim()
      .description('GOR Parameter : paymentChannel'),
  })
    .required()
    .label('ProcessCSPaymentsRequestPayloadModel'),
};

const processCSPaymentsResponseSchema = Joi.object({});

export { processCSPaymentsRequestSchema, processCSPaymentsResponseSchema };
