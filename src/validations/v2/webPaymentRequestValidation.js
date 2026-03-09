import Joi from 'joi';
import { commonSchemas } from './index.js';

const createWebPaymentSessionRequestSchema = {
  headers: Joi.object({
    authorization: Joi.string().required(),
    appChannel: Joi.string().optional(),
    'user-token': Joi.when('appChannel', {
      is: Joi.valid('superapp', 'dno'),
      then: Joi.string().required().trim(),
      otherwise: Joi.string().optional().trim(),
    }),
    // 'req.app.principalId': Joi.string().optional().trim(),
  }),
  options: {
    allowUnknown: true,
  },
  payload: Joi.object({
    customerInfo: Joi.object({
      customerId: Joi.string().optional().trim(),
      customerName: Joi.string().optional().trim(),
    })
      .custom((value, helpers) => {
        const request = helpers.prefs.context;
        if (!request?.headers?.['user-token'] && !value.customerId) {
          return helpers.error('any.required', { key: 'customerId' });
        }
        return value;
      })
      .optional(),
    settlementInfo: commonSchemas.settlementInfoSchema.required(),
    allowedPaymentMethods: Joi.array()
      .items(
        Joi.string().valid('OTC_ECPAY', 'CARD_INSTALLMENT', 'CARD_STRAIGHT')
      )
      .optional(),
    notificationUrls: Joi.object({
      successUrl: Joi.string()
        .pattern(/^https:\/\/.+$/)
        .optional(),
      failureUrl: Joi.string()
        .pattern(/^https:\/\/.+$/)
        .optional(),
    }).optional(),
  })
    .custom((value, helpers) => {
      const request = helpers.prefs.context;
      if (!request?.headers?.['user-token'] && !value.customerInfo) {
        return helpers.error('any.required', { key: 'customerInfo' });
      }
      return value;
    })
    .required()
    .label('CreateWebPaymentSessionRequestPayload'),
};

const createWebPaymentSessionResponseSchema = Joi.object({
  result: Joi.object({
    tokenPaymentId: Joi.string().required(),
    webSessionUrl: Joi.string().required(),
    webSessionToken: Joi.string().required(),
    ttl: Joi.string().required(),
  })
    .required()
    .label('CreateWebPaymentSessionResultModel'),
});

export {
  createWebPaymentSessionRequestSchema,
  createWebPaymentSessionResponseSchema,
};
