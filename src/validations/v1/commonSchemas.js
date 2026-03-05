import Joi from 'joi';

const dccAmountSchema = Joi.object({
  currency: Joi.string().length(3).required(),
  amountInMinorUnit: Joi.number().integer().required(),
}).label('DccAmountModel');

const dccQuoteSchema = Joi.object({
  accountName: Joi.string().optional(),
  accountType: Joi.string().optional(),
  baseAmount: dccAmountSchema.optional(),
  basePoints: Joi.number().integer().required(),
  buyRate: dccAmountSchema.optional(),
  interbankAmount: dccAmountSchema.optional(),
  reference: Joi.string().optional(),
  sellRate: dccAmountSchema.optional(),
  signature: Joi.string().optional(),
  source: Joi.string().optional(),
  forexType: Joi.string().optional(),
  validity: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required(),
}).label('DccQuoteModel');

const addressSchema = Joi.object({
  city: Joi.string().optional(),
  houseNumberOrName: Joi.string().optional(),
  postalCode: Joi.string().optional(),
  stateOrProvince: Joi.string().max(3).optional(),
  street: Joi.string().optional(),
}).label('AddressModel');

const companySchema = Joi.object({
  homepage: Joi.string().uri().optional(),
  name: Joi.string().optional(),
  registrationNumber: Joi.string().optional(),
  registryLocation: Joi.string().optional(),
  taxId: Joi.string().optional(),
  type: Joi.string().optional(),
}).label('CompanyModel');

const avsSchema = Joi.object({
  editable: Joi.boolean().optional(),
  enabled: Joi.string().valid('yes', 'automatic', 'no').optional(),
}).label('AvsModel');

export const displaySchema = Joi.object({
  billingAddress: Joi.string()
    .valid('editable', 'hidden', 'readOnly')
    .optional(),
  deliveryAddress: Joi.string()
    .valid('editable', 'hidden', 'readOnly')
    .optional(),
  personalDetails: Joi.string()
    .valid('editable', 'hidden', 'readOnly')
    .optional(),
}).label('DisplayModel');

export const configurationSchema = Joi.object({
  addressVerificationSystem: avsSchema.optional(),
  cardHolderName: Joi.string().valid('NONE', 'OPTIONAL', 'REQUIRED').optional(),
  installment: Joi.number().integer().min(1).optional(),
  display: displaySchema.optional(),
}).label('ConfigurationModel');

export const lineItemSchema = Joi.object({
  amountExcludingTax: Joi.number().integer().optional(),
  amountIncludingTax: Joi.number().integer().optional(),
  description: Joi.string().optional(),
  id: Joi.string().optional(),
  quantity: Joi.number().integer().optional(),
  taxAmount: Joi.number().integer().optional(),
  taxCategory: Joi.string().valid('High', 'Low', 'None', 'Zero').optional(),
  taxPercentage: Joi.number().integer().optional(),
}).label('LineItemModel');

export const customerSchema = Joi.object({
  firstName: Joi.string().required(),
  gender: Joi.string().required(),
  infix: Joi.string().optional(),
  lastName: Joi.string().required(),
  dateOfBirth: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  telephoneNumber: Joi.string().optional(),
  billingAddress: addressSchema.optional(),
  deliveryAddress: addressSchema.optional(),
  companyDetails: companySchema.optional(),
  socialSecurityNumber: Joi.string().optional(),
  ip: Joi.string().optional(),
  customerInteraction: Joi.string().optional(),
  customerStatement: Joi.string().optional(),
}).label('CustomerModel');

export const splitSchema = Joi.object({
  account: Joi.string().when('type', {
    is: 'MarketPlace',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  amount: dccAmountSchema.required(),
  description: Joi.string().optional(),
  reference: Joi.string().when('type', {
    is: 'MarketPlace',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
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
}).label('SplitModel');

export const boosterSchema = Joi.object({
  sid: Joi.string().max(64).required(),
  param: Joi.string().max(64).required(),
}).label('BoosterObject');

export const voucherSchema = Joi.object({
  category: Joi.string().required(),
  code: Joi.string().required(),
}).label('VoucherModel');

export {
  addressSchema,
  avsSchema,
  companySchema,
  dccAmountSchema,
  dccQuoteSchema,
};
