import Joi from 'joi';

const budgetProtectProfileSchema = Joi.object({
  lastName: Joi.string().pattern(/\S/).required(),
  firstName: Joi.string().pattern(/\S/).required(),
  middleName: Joi.string(),
  dateOfBirth: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required(),
  gender: Joi.string().valid('', 'Male', 'Female'),
  email: Joi.string().pattern(/\S/).required(),
})
  .unknown(false)
  .label('BudgetProtectProfileModel');

const settlementInformationSchema = Joi.object({
  accountNumber: Joi.string().pattern(/^[0-9]+$/),
  mobileNumber: Joi.string().pattern(/^(9|09|639)[0-9]{9}$/),
  emailAddress: Joi.string(),
  amount: Joi.number().min(1),
  requestType: Joi.string().pattern(/\S/).required(),

  voucher: Joi.object({
    category: Joi.string().required(),
    code: Joi.string().required(),
  })
    .unknown(false)
    .optional(),

  transactionType: Joi.string().valid('G', 'I', 'N', 'B'),

  referralCode: Joi.string().min(1).max(64),

  transactions: Joi.array(),
  createOrderExternal: Joi.array(),
  notification: Joi.object(),
  landlineNumber: Joi.string(),
  billsType: Joi.string(),

  metadata: Joi.object({
    firstName: Joi.string().pattern(/\S/),
    middleName: Joi.string().pattern(/\S*/),
    lastName: Joi.string().pattern(/\S/),
    email: Joi.string().pattern(/\S/),
    mobileNumber: Joi.string().pattern(/^(9|09|639)[0-9]{9}$/),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso(),
    brand: Joi.string().pattern(/\S/),
    flights: Joi.array().items(Joi.string().pattern(/\S/)),
    members: Joi.array().items(
      Joi.object({
        firstName: Joi.string().pattern(/\S/).required(),
        lastname: Joi.string().pattern(/\S/).required(),
      }).unknown(false)
    ),
  }).unknown(false),
})

  .when(Joi.object({ requestType: 'VolumeBoost' }).unknown(), {
    then: Joi.object({
      transactionType: Joi.valid('N').required(),
      requestType: Joi.required(),
      transactions: Joi.required(),
      accountNumber: Joi.required(),
    }),
  })

  .when(Joi.object({ requestType: 'PayBills' }).unknown(), {
    then: Joi.object({
      transactionType: Joi.valid('G', 'I', 'B', 'N').required(),
      requestType: Joi.required(),
      amount: Joi.required(),
    }).or('mobileNumber', 'accountNumber', 'landlineNumber'),
  })

  .when(
    Joi.object({
      requestType: Joi.valid(
        'BuyLoad',
        'BuyPromo',
        'BuyVoucher',
        'BuyBBContent',
        'ECPay',
        'ChangeSim',
        'BuyRoaming'
      ),
    }).unknown(),
    {
      then: Joi.object({
        transactionType: Joi.valid('N').required(),
        requestType: Joi.required(),
        amount: Joi.required(),
        transactions: Joi.required(),
      }).or('mobileNumber', 'accountNumber'),
    }
  )
  .unknown(false)
  .label('SettlementInformationItemModel');

const paymentSessionRequestSchema = {
  headers: Joi.object({
    authorization: Joi.string()
      .pattern(/^Bearer\s+\S+$/)
      .required(),

    'user-token': Joi.string()
      .pattern(/^Bearer\s+\S+$/)
      .optional(),
  })
    .pattern(
      /^[Cc][Oo][Nn][Tt][Ee][Nn][Tt]-[Tt][Yy][Pp][Ee]$/,
      Joi.string().valid('application/json')
    )
    .unknown(true)
    .required(),

  payload: Joi.object({
    paymentType: Joi.string()
      .valid('ADYEN', 'GCASH', 'DROPIN', 'XENDIT')
      .required(),

    currency: Joi.string().max(3).pattern(/\S/).required(),
    countryCode: Joi.string().max(2).pattern(/\S/).required(),

    paymentInformation: Joi.object().required(),

    settlementInformation: Joi.array()
      .items(settlementInformationSchema)
      .min(1)
      .required(),

    budgetProtectProfile: budgetProtectProfileSchema.optional(),
  })
    .unknown(false)
    .required(),
};

export {
  budgetProtectProfileSchema,
  paymentSessionRequestSchema,
  settlementInformationSchema,
};
