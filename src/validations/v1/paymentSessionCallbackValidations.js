import Joi from 'joi';

const paymentSessionCallbackRequestSchema = {
  headers: Joi.object()
    .pattern(
      new RegExp('[Cc][Oo][Nn][Tt][Ee][Nn][Tt]-[Tt][Yy][Pp][Ee]'),
      Joi.string().valid('application/json')
    )
    .unknown(true)
    .required(),

  payload: Joi.object({
    notification: Joi.object({
      name: Joi.string().pattern(/\S/).required(),

      payload: Joi.object({
        paymentId: Joi.string().pattern(/\S/).required(),

        paymentSession: Joi.string().pattern(/\S/),
        checkoutUrl: Joi.string().pattern(/\S/),

        error: Joi.alternatives().try(
          Joi.string().pattern(/\S/),
          Joi.array()
            .items(
              Joi.object({
                message: Joi.string().pattern(/\S/).required(),
              })
            )
            .min(1),
          Joi.object({
            error_code: Joi.string().pattern(/\S/),
            message: Joi.string().pattern(/\S/).required(),
          })
        ),

        accounts: Joi.array()
          .items(
            Joi.object({
              accountNumber: Joi.string()
                .allow(null, '')
                .when(Joi.string().min(1), {
                  then: Joi.string().pattern(/^\d+$/),
                }),

              status: Joi.string().pattern(/\S/).required(),

              refusalReasonRaw: Joi.alternatives().conditional('status', {
                is: Joi.string().pattern(/GCASH/),
                then: Joi.forbidden(),
                otherwise: Joi.string().allow(null, ''),
              }),

              payment_code: Joi.string(),
              expiry: Joi.string(),
              description: Joi.string(),
            }).unknown(false)
          )
          .min(1),

        paymentMethods: Joi.array(),
        paymentResult: Joi.object(),
        storedPaymentMethods: Joi.array(),
        merchantAccount: Joi.string(),
        transactionId: Joi.string().pattern(/\S/),
        refundAmount: Joi.string().pattern(/\S/),
        status: Joi.string().pattern(/\S/),
        actions: Joi.array(),
      })
        .unknown(false)

        .or(
          'paymentSession',
          'checkoutUrl',
          'error',
          'accounts',
          'paymentMethods',
          'paymentResult',
          'transactionId',
          'refundAmount',
          'status',
          'actions'
        )
        .required(),
    })
      .unknown(false)
      .required(),
  })
    .unknown(false)
    .required(),

  options: {
    allowUnknown: true,
  },
};

const paymentSessionCallbackResponseSchema = Joi.object({
  result: Joi.object({
    notificationResponse: Joi.string().required(),
  })
    .required()
    .label('PaymentSessionCallbackResultModel'),
});

export {
  paymentSessionCallbackRequestSchema,
  paymentSessionCallbackResponseSchema,
};
