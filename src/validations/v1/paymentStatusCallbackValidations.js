import Joi from 'joi';

const paymentStatusCallbackRequestSchema = {
  options: {
    allowUnknown: true,
  },
  payload: Joi.object({
    tokenPaymentId: Joi.string().required(),
    channelId: Joi.string().optional(),
    paymentStatusRemarks: Joi.string().optional(),
    paymentAccounts: Joi.array()
      .items(
        Joi.object({
          paymentStatus: Joi.string().required(),
          accountNumber: Joi.string().optional(),
        }).label('PaymentAccountObject')
      )
      .min(1)
      .required()
      .label('PaymentAccountsModel'),
    installmentDetails: Joi.object({
      bank: Joi.string().required(),
      term: Joi.number().integer().required(),
      interval: Joi.string().required(),
      percentage: Joi.number()
        .min(0)
        .custom((value, helpers) => {
          if (value !== null && value.toString().split('.')[1]?.length > 2) {
            return helpers.message(
              'percentage cannot have more than 2 decimal places'
            );
          }
          return value;
        })
        .optional(),
      cardType: Joi.string().optional(),
      cardBrand: Joi.string().optional(),
    })
      .optional()
      .label('InstallmentDetailsModel'),
  }).label('PaymentStatusCallbackRequestPayload'),
};

const paymentStatusCallbackResponseSchema = Joi.object({
  result: Joi.object({
    status: Joi.bool().required(),
    message: Joi.string().required(),
  })
    .required()
    .label('PaymentStatusCallbackResultModel'),
});

export {
  paymentStatusCallbackRequestSchema,
  paymentStatusCallbackResponseSchema,
};
