import Joi from 'joi';

const paymentRefundRequestSchema = {
  headers: Joi.object({
    authorization: Joi.string().optional().trim().label('AuthorizationHeader'), //check?
  }),
  options: {
    allowUnknown: true,
  },
  params: Joi.object({
    tokenPaymentId: Joi.string().required().trim().label('tokenPaymentId'),
  }),
  payload: Joi.object({
    refundAmount: Joi.number()
      .positive()
      .precision(2)
      .required()
      .label('RefundAmount'),
  }).required(),
};

const paymentRefundResponseSchema = Joi.object({
  result: Joi.object({
    statusCode: Joi.number().valid(202).required().label('RefundStatusCode'),
  })
    .required()
    .label('RequestPaymentRefundResultModel'),
});

export { paymentRefundRequestSchema, paymentRefundResponseSchema };
