import Joi from 'joi';

const getPaymentSessionRequestSchema = {
  headers: Joi.object({
    authorization: Joi.string().required().trim(),
    deviceid: Joi.string().optional().trim(),
    'user-token': Joi.string().optional().trim(),
  }),
  options: {
    allowUnknown: true,
  },
  params: Joi.object({
    tokenPaymentId: Joi.string()
      .trim()
      .required()
      .custom(
        (value, helpers) =>
          decodeURIComponent(value) || helpers.error('string.empty')
      ),
  }).required(),
};

const refundSchema = Joi.object({
  status: Joi.string().required(),
  amount: Joi.string().required(),
}).label('RefundModel');

const referralCodeSchema = Joi.object({
  msisdn: Joi.string().required(),
  status: Joi.string().required(),
}).label('ReferralCodeModel');

const rewardPointsSchema = Joi.object({
  referralCodeOwner: referralCodeSchema.required(),
  referralCodeUser: referralCodeSchema.required(),
}).label('RewardPointsModel');

const voucherSchema = Joi.object({
  serialNumber: Joi.string().optional(),
  voucherCode: Joi.string().optional(),
  voucherDescription: Joi.string().optional(),
  contentPartner: Joi.string().optional(),
  paidAmount: Joi.number().optional(),
  validFrom: Joi.string().optional(),
  validTo: Joi.string().optional(),
  paidAmount: Joi.string().optional(),
}).label('VoucherModel');

const transactionSchema = Joi.object({
  transactionId: Joi.string().required(),
  provisionStatus: Joi.string().optional(),
  amount: Joi.number().optional(),
  keyword: Joi.string().optional(),
  questIndicator: Joi.string().optional(),
  param: Joi.string().optional(),
  serviceId: Joi.string().optional(),
  wallet: Joi.string().optional(),
  agentName: Joi.string().optional(),
  externalTransactionId: Joi.string().optional(),
  serviceNumber: Joi.string().optional(),
  voucherCategory: Joi.string().optional(),
  voucherDetails: Joi.array()
    .items(voucherSchema)
    .optional()
    .label('VoucherArray'),
  partnerReferenceNumber: Joi.string().required(),
}).label('TransactionModel');

const accountSchema = Joi.object({
  accountNumber: Joi.string().optional(),
  accountName: Joi.string().optional(),
  landlineNumber: Joi.string().optional(),
  mobileNumber: Joi.string().optional(),
  status: Joi.string().required(),
  statusRemarks: Joi.string().optional(),

  transactions: Joi.array()
    .items(transactionSchema)
    .optional()
    .label('TransactionsArray'),
  refund: refundSchema.optional(),
  rewardPoints: rewardPointsSchema.optional(),

  accountType: Joi.string().optional(),
  amount: Joi.number().optional(),
}).label('AccountModel');

const paymentDetailSchema = Joi.object({
  convenienceFeeAmount: Joi.number().required(),
  postedAmount: Joi.number().required(),
  paymentAmount: Joi.number().required(),
  convenienceFeeType: Joi.string().optional(),
}).label('PaymentDetailModel');

const errorSchema = Joi.object({
  message: Joi.string().required(),
  error_code: Joi.string().optional(),
}).label('ErrorModel');

const oonaSchema = Joi.object({
  oonaSku: Joi.string().required(),
  oonaStatus: Joi.string().required(),
  amount: Joi.string().required(),
}).label('OonaModel');

const getPaymentSessionResponseSchema = Joi.object({
  result: Joi.object({
    tokenPaymentId: Joi.string().required(),
    paymentDetails: Joi.array()
      .items(paymentDetailSchema)
      .optional()
      .label('PaymentDetailsArray'),
    paymentSession: Joi.string().required(),
    checkoutUrl: Joi.string().required(),

    accounts: Joi.array()
      .items(accountSchema)
      .optional()
      .label('AccountsArray'),

    merchantAccount: Joi.string().required(),
    paymentMethods: Joi.string().required(),
    storedPaymentMethods: Joi.string().required(),
    paymentResult: Joi.string().required(),
    errors: Joi.array().items(errorSchema).optional().label('ErrorsArray'),
    checkoutUrl: Joi.string().required(),
    transactionDate: Joi.string().required(),
    oona: Joi.array().items(oonaSchema).optional().label('OonaArray'),
    paymentId: Joi.string().optional(),
    actions: Joi.object().optional(),
  })
    .required()
    .label('GetPaymentSessionResultModel'),
});

export { getPaymentSessionRequestSchema, getPaymentSessionResponseSchema };
