import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Joi from 'joi';
import {
  paymentStatusCallbackRequestSchema,
  paymentStatusCallbackResponseSchema,
} from '../../../src/validations/v1/paymentStatusCallbackValidations.js';

const lab = Lab.script();
const { describe, it, beforeEach } = lab;
export { lab };

const ALLOWED_STATUSES = [
  'ADYEN_AUTHORISED',
  'ADYEN_REFUSED',
  'ADYEN_RECEIVED',
  'ADYEN_CANCELLED',
  'ADYEN_ERROR',
  'PROCESSING',
];

describe('Validation :: PaymentStatusCallbackValidations-v1 :: paymentStatusCallbackRequestSchema', () => {
  let request;
  const schema = Joi.object(paymentStatusCallbackRequestSchema).options({
    abortEarly: false,
  });

  beforeEach(() => {
    request = {
      payload: {
        tokenPaymentId: 'tp-12345',
        channelId: 'gor-client',
        paymentStatusRemarks: 'remarks',
        paymentAccounts: [
          {
            paymentStatus: 'PROCESSING',
            accountNumber: '1234567890',
          },
        ],
        installmentDetails: {
          bank: 'TEST BANK OF GLOBE',
          term: 36,
          interval: 'month',
          percentage: 1.0,
          cardType: 'CREDIT',
          cardBrand: 'VISA',
        },
      },
    };
  });

  it('should throw error if tokenPaymentId is missing', () => {
    delete request.payload.tokenPaymentId;
    const { error } = schema.validate(request);
    expect(error?.message).to.contain('"payload.tokenPaymentId" is required');
  });

  it('should throw error if paymentAccounts is missing', () => {
    delete request.payload.paymentAccounts;
    const { error } = schema.validate(request);
    expect(error?.message).to.contain('"PaymentAccountsModel" is required');
  });

  it('should throw error if paymentAccounts is empty', () => {
    request.payload.paymentAccounts = [];
    const { error } = schema.validate(request);
    // Error message reflects the label on the array schema
    expect(error?.message).to.contain(
      '"PaymentAccountsModel" must contain at least 1 items'
    );
  });

  it('should throw error if paymentAccounts[0].paymentStatus is missing', () => {
    delete request.payload.paymentAccounts[0].paymentStatus;
    const { error } = schema.validate(request);
    expect(error?.message).to.contain(
      '"payload.paymentAccounts[0].paymentStatus" is required'
    );
  });

  it('should validate successfully with any allowed paymentStatus value', () => {
    for (const status of ALLOWED_STATUSES) {
      const req = JSON.parse(JSON.stringify(request));
      req.payload.paymentAccounts[0].paymentStatus = status;
      const { error } = schema.validate(req);
      expect(error).to.not.exist();
    }
  });

  it('should throw error for unknown fields inside payload (since payload schema is not .unknown(true))', () => {
    request.payload.extraField = 'ignored';
    const { error } = schema.validate(request);
    expect(error?.message).to.contain('"payload.extraField" is not allowed');
  });

  it('should validate successfully with correct payload', () => {
    const { error, value } = schema.validate(request);
    expect(error).to.not.exist();
    expect(value).to.exist();
  });

  it('should throw error for more then 2 decimal places for installmentDetails.percentage', () => {
    request.payload.installmentDetails.percentage = 1.234;

    const { error } = schema.validate(request);
    console.log({ msg: error?.message });
    expect(error?.message).to.contain(
      'percentage cannot have more than 2 decimal places'
    );
  });
});

describe('Validation :: PaymentStatusCallbackValidations-v1 :: paymentStatusCallbackResponseSchema', () => {
  let response;
  const schema = paymentStatusCallbackResponseSchema.options({
    abortEarly: false,
  });

  beforeEach(() => {
    response = {
      result: {
        status: true,
        message: 'Success',
      },
    };
  });

  it('should throw error if result.status is missing', () => {
    delete response.result.status;
    const { error } = schema.validate(response);
    expect(error?.message).to.contain('"result.status" is required');
  });

  it('should throw error if result.status is not a boolean (use null to avoid Joi coercion)', () => {
    response.result.status = null;
    const { error } = schema.validate(response);
    expect(error?.message).to.contain('"result.status" must be a boolean');
  });

  it('should throw error if result.message is missing', () => {
    delete response.result.message;
    const { error } = schema.validate(response);
    expect(error?.message).to.contain('"result.message" is required');
  });

  it('should throw error if result.message is not a string', () => {
    response.result.message = 123;
    const { error } = schema.validate(response);
    expect(error?.message).to.contain('"result.message" must be a string');
  });

  it('should validate successfully with correct response object', () => {
    const { error, value } = schema.validate(response);
    expect(error).to.not.exist();
    expect(value).to.equal(response);
  });
});
