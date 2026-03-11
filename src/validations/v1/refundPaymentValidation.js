import Joi from 'joi';
import { examples } from '../../util/index.js';

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

const paymentAutoRefundPubSubRequestSchema = {
  headers: Joi.object({
    authorization: Joi.string().required(),
  }).label('PaymentAutoRefundRequestHeadersModel'),

  options: {
    allowUnknown: true,
  },

  payload: Joi.object({
    message: Joi.object({
      data: Joi.string()
        .required()
        .example(examples.paymentAutoRefundPubSubRequest)
        .trim(),
      messageId: Joi.string().required().trim(),
      message_id: Joi.string().required().trim(),
      publishTime: Joi.string().required().trim(),
      publish_time: Joi.string().required().trim(),
    }).unknown(),
    subscription: Joi.string().required().trim(),
  }).unknown(),
};

const refundDetailsSchema = Joi.object({
  tokenPaymentId: Joi.string().required().example(examples.tokenPaymentId),
  paymentInformation: Joi.string()
    .required()
    .example(examples.paymentInformation),
  paymentType: Joi.string().required().example(examples.paymentType),
  settlementDetails: Joi.array().items({
    requestType: Joi.string().required().example(examples.requestType),
    amount: Joi.number()
      .positive()
      .precision(2)
      .required()
      .example(examples.refundAmount),
    status: Joi.string().required().example(examples.paymentStatus),
    transactions: Joi.array().items({
      provisionStatus: Joi.string()
        .required()
        .example(examples.provisionStatus),
    }),
    emailAddress: Joi.string()
      .email()
      .required()
      .example(examples.emailAddress),
  }),
});

const paymentAutoRefundRequestSchema = {
  payload: Joi.array().items(refundDetailsSchema),
};

const paymentAutoRefundResponseSchema = Joi.object({
  result: Joi.object({
    statusCode: Joi.number()
      .valid(200)
      .required()
      .label('PaymentAutoRefundStatusCode'),
  }).required(),
});

export {
  paymentAutoRefundPubSubRequestSchema,
  paymentAutoRefundRequestSchema,
  paymentAutoRefundResponseSchema,
  paymentRefundRequestSchema,
  paymentRefundResponseSchema,
};
