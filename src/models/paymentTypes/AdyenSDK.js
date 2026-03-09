import { logger } from '@globetel/cxs-core/core/logger/index.js';
import Joi from 'joi';

const AdyenSDKPaymentInfoSchema = Joi.object({
  allowedPaymentMethods: Joi.array().items(Joi.string()),
  blockedPaymentMethods: Joi.array().items(Joi.string()),
  tokenSDK: Joi.string(),
  platform: Joi.string(),
  returnUrl: Joi.string().pattern(/\S/).required(),
  origin: Joi.string().pattern(/\S/).required(),
  shopperLocale: Joi.string().pattern(/\S/).required(),

  browserInformation: Joi.object({
    acceptHeader: Joi.string().pattern(/\S/).required(),
    colorDepth: Joi.number(),
    javaEnabled: Joi.boolean(),
    language: Joi.string(),
    screenHeight: Joi.number(),
    screenWidth: Joi.number(),
    timeZoneOffset: Joi.number(),
    userAgent: Joi.string().pattern(/\S/).required(),
  })
    .required()
    .unknown(false),

  captureDelayHours: Joi.number(),

  configuration: Joi.object({
    addressVerificationSystem: Joi.object({
      editable: Joi.boolean(),
      enabled: Joi.string(),
    }).unknown(false),
    cardHolderName: Joi.string(),
    installment: Joi.number().min(1),
    display: Joi.object({
      billingAddress: Joi.string(),
      deliveryAddress: Joi.string(),
      personalDetails: Joi.string(),
    }).unknown(false),
  }),

  dccQuote: Joi.object({
    accountName: Joi.string(),
    accountType: Joi.string(),
    baseAmount: Joi.object({
      currency: Joi.string().max(3).pattern(/\S/).required(),
      amountInMinorUnit: Joi.number().required(),
    }).unknown(false),
    basePoints: Joi.number().required(),
    buyRate: Joi.object({
      currency: Joi.string().max(3).pattern(/\S/).required(),
      amountInMinorUnit: Joi.number().required(),
    }).unknown(false),
    interbankAmount: Joi.object({
      currency: Joi.string().max(3).pattern(/\S/).required(),
      amountInMinorUnit: Joi.number().required(),
    }).unknown(false),
    reference: Joi.string(),
    sellRate: Joi.object({
      currency: Joi.string().max(3).pattern(/\S/).required(),
      amountInMinorUnit: Joi.number().required(),
    }).unknown(false),
    signature: Joi.string(),
    source: Joi.string(),
    forexType: Joi.string(),
    validity: Joi.string().isoDate().required(),
  }).unknown(false),

  enableOneClick: Joi.boolean(),
  enablePayOut: Joi.boolean(),
  enableRecurring: Joi.boolean(),
  entityType: Joi.string(),
  fraudOffset: Joi.number(),

  lineItems: Joi.array().items(
    Joi.object({
      amountExcludingTax: Joi.number(),
      amountIncludingTax: Joi.number(),
      description: Joi.string(),
      id: Joi.string(),
      quantity: Joi.number(),
      taxAmount: Joi.number(),
      taxCategory: Joi.string().valid('High', 'Low', 'None', 'Zero'),
      taxPercentage: Joi.number(),
    }).unknown(false)
  ),

  mcc: Joi.string(),
  merchantData: Joi.string(),
  merchantOrderReference: Joi.string(),
  metadata: Joi.string(),
  orderReference: Joi.string(),

  customer: Joi.object({
    firstName: Joi.string().pattern(/\S/).required(),
    gender: Joi.string().pattern(/\S/).required(),
    infix: Joi.string(),
    lastName: Joi.string().pattern(/\S/).required(),
    dateOfBirth: Joi.string().isoDate(),
    telephoneNumber: Joi.string(),
    billingAddress: Joi.object({
      city: Joi.string(),
      houseNumberOrName: Joi.string(),
      postalCode: Joi.string(),
      stateOrProvince: Joi.string().max(3),
      street: Joi.string(),
    }).unknown(false),
    deliveryAddress: Joi.object({
      city: Joi.string(),
      houseNumberOrName: Joi.string(),
      postalCode: Joi.string(),
      stateOrProvince: Joi.string().max(3),
      street: Joi.string(),
    }).unknown(false),
    companyDetails: Joi.object({
      homepage: Joi.string(),
      name: Joi.string(),
      registrationNumber: Joi.string(),
      registryLocation: Joi.string(),
      taxId: Joi.string(),
      type: Joi.string(),
    }).unknown(false),
    socialSecurityNumber: Joi.string(),
    ip: Joi.string(),
    customerInteraction: Joi.string(),
    customerStatement: Joi.string(),
  })
    .required()
    .unknown(false),

  splitList: Joi.array().items(
    Joi.object({
      account: Joi.string(),
      amount: Joi.object({
        currency: Joi.string().max(3).pattern(/\S/).required(),
        amountInMinorUnit: Joi.number().required(),
      })
        .required()
        .unknown(false),
      description: Joi.string(),
      reference: Joi.string(),
      type: Joi.string()
        .valid(
          'Default',
          'PaymentFee',
          'VAT',
          'Commission',
          'MarketPlace',
          'Verification'
        )
        .required(),
    }).unknown(false)
  ),

  trustedShopper: Joi.boolean(),
  deliveryDate: Joi.string().isoDate(),
}).unknown(false);

const validateAdyenSDKPaymentInfo = (payload) => {
  try {
    const { error, value } = AdyenSDKPaymentInfoSchema.validate(payload);

    if (error) {
      logger.debug('validateAdyenSDKPaymentInfo Failed', error);
      const keywords = ['must contain at least one', 'is required'];
      const errorType = keywords.some((k) =>
        error.details[0].message.includes(k)
      )
        ? 'InsufficientParameters'
        : 'InvalidParameter';

      throw { type: errorType };
    }

    return value;
  } catch (error) {
    logger.debug('validateAdyenSDKPaymentInfo failed', error);
    throw error;
  }
};

export { validateAdyenSDKPaymentInfo };
