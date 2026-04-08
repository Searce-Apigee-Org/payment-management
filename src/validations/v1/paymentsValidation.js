import constants from '@globetel/cxs-core/core/constants/index.js';
import Joi from 'joi';

const getPaymentsRequestSchema = {
  headers: Joi.object({
    authorization: Joi.string().required(),
    'user-token': Joi.string().optional(),
    deviceid: Joi.string().optional(),
    otpreferenceid: Joi.string().optional(),
  })
    .xor('user-token', 'otpreferenceid')
    .required()
    .label('GetPaymentsHeadersModel'),
  options: {
    allowUnknown: true,
  },
  query: Joi.object({
    mobileNumber: Joi.string()
      .pattern(constants.pattern.MSISDN_REGEX_PATTERN)
      .optional()
      .description(
        [' HIP Parameter : MSISDN', ' Rudy Parameter : msisdn'].join('\n')
      ),
    accountNumber: Joi.string()
      .trim()
      .pattern(constants.pattern.ACCOUNT_NUMBER_PATTERN)
      .optional()
      .description(' Rudy Parameter : accountId'),
    startDate: Joi.date().iso().raw(),
    endDate: Joi.date().iso().raw(),
  })
    .xor('mobileNumber', 'accountNumber')
    .required()
    .label('GetPaymentsQueryModel'),
};

const getPaymentsResponseSchema = Joi.object({
  result: Joi.object({
    payments: Joi.array()
      .items(
        Joi.object({
          amount: Joi.string()
            .required()
            .description(' Rudy Parameter : paymentAmount'),
          date: Joi.string()
            .required()
            .description(' Rudy Parameter : paymentDate'),
          printable: Joi.boolean().required(),
          accountNumber: Joi.string()
            .required()
            .description(
              [
                ' Rudy Parameter : accountId',
                ' HIP Parameter : BillingArrangementHeader.AccountIdInfo.AccountNo',
              ].join('\n')
            ),
          email: Joi.string().required(),
          mobileNumber: Joi.string()
            .required()
            .description(' Rudy Parameter : msisdn'),
          arPaymentId: Joi.string().required(),
          notified: Joi.boolean().required(),
          receiptId: Joi.string()
            .required()
            .description(' Rudy Parameter : orId'),
          sourceId: Joi.string()
            .required()
            .description(' Rudy Parameter : paymentSourceId'),
        }).label('GetPaymentsResultPaymentObject')
      )
      .required()
      .label('GetPaymentsResultPaymentModel'),
    token: Joi.string().required(),
  })
    .required()
    .label('GetPaymentsResultModel'),
});

export { getPaymentsRequestSchema, getPaymentsResponseSchema };
