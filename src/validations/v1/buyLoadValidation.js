import constants from '@globetel/cxs-core/core/constants/index.js';
import Joi from 'joi';

const buyLoadRequestSchema = {
  headers: Joi.object({
    deviceid: Joi.string().optional(),
  }).label('BuyLoadHeadersModel'),

  options: {
    allowUnknown: true,
    convert: true,
  },

  params: Joi.object({
    customerId: Joi.string()
      .pattern(constants.pattern.MSISDN_REGEX_PATTERN)
      .required(),
  }).label('BuyLoadParamsModel'),

  payload: Joi.object({
    keyword: Joi.string().allow('').optional(),
    wallet: Joi.string().allow('').optional(),
    amount: Joi.number().min(1).required(),
    tokenPaymentId: Joi.string().required(),
    agentName: Joi.string()
      .optional()
      .when('wallet', {
        is: Joi.exist(),
        then: Joi.string().trim().min(1),
      }),
    externalTransactionId: Joi.string().optional(),
  })
    .xor('keyword', 'wallet')
    .label('BuyLoadPayloadModel'),
};

const buyLoadResponseSchema = Joi.object({}).label('BuyLoadResponseModel');

export { buyLoadRequestSchema, buyLoadResponseSchema };
