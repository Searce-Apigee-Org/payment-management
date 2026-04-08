import Joi from 'joi';

const getPaymentReceiptRequestSchema = {
  headers: Joi.alternatives().conditional(
    Joi.object({
      authorization: Joi.string().trim().required(),
      deviceid: Joi.string().optional(),
      'user-token': Joi.string().trim().required(),
      'x-receipt-token': Joi.string().trim().required(),
    }),
    {
      then: Joi.object({
        'user-token': Joi.string().trim().required(),
        'x-receipt-token': Joi.string().trim().required(),
      }).without('user-token', 'otpreferenceid'),
      otherwise: Joi.object({
        otpreferenceid: Joi.string().required(),
        'x-receipt-token': Joi.string().trim().required(),
      }).without('otpreferenceid', 'user-token'),
    }
  ),
  // allows other incoming headers to be accepted without being validated
  options: {
    allowUnknown: true,
  },
  params: Joi.object({
    receiptId: Joi.string().trim().required(),
  }),
  query: Joi.object({
    storeId: Joi.string().trim().required(),
    appCode: Joi.string().trim().optional(),
  }),
};

const getPaymentReceiptResponseSchema = Joi.object({
  result: Joi.string().required().label('ReceiptHtmlString'),
  headers: Joi.object({
    'Content-Type': Joi.string().valid('text/html').required(),
  })
    .required()
    .label('ReceiptResponseHeaders'),
});

export { getPaymentReceiptRequestSchema, getPaymentReceiptResponseSchema };
