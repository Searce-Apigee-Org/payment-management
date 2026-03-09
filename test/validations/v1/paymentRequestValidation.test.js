import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Joi from 'joi';
import { paymentSessionRequestSchema } from '../../../src/validations/v1/paymentRequestValidations.js';

const lab = Lab.script();
const { describe, it, beforeEach } = lab;
export { lab };

describe('Validation :: PaymentSessionValidation-v1 :: paymentSessionRequestSchema', () => {
  let request;

  const schema = Joi.object(paymentSessionRequestSchema).options({
    abortEarly: false,
    allowUnknown: true,
  });

  beforeEach(() => {
    request = {
      headers: {
        authorization: 'Bearer valid.token',
        'content-type': 'application/json',
      },
      payload: {
        paymentType: 'GCASH',
        currency: 'PHP',
        countryCode: 'PH',
        paymentInformation: {
          gcashRef: 'GC123',
        },
        settlementInformation: [
          {
            requestType: 'PayBills',
            transactionType: 'G',
            amount: 500,
            mobileNumber: '09171234567',
          },
        ],
      },
    };
  });

  it('should throw error if headers are missing', () => {
    delete request.headers;
    const { error } = schema.validate(request);
    expect(error).to.exist();
    expect(error.message).to.contain('"headers" is required');
  });

  it('should throw error if authorization header is missing', () => {
    delete request.headers.authorization;
    const { error } = schema.validate(request);
    expect(error).to.exist();
    expect(error.message).to.contain('"headers.authorization" is required');
  });

  it('should throw error if content-type is not application/json', () => {
    request.headers['content-type'] = 'text/plain';
    const { error } = schema.validate(request);
    expect(error).to.exist();
    expect(error.message).to.contain('must be [application/json]');
  });

  it('should throw error if payload is missing', () => {
    delete request.payload;
    const { error } = schema.validate(request);
    expect(error).to.exist();
    expect(error.message).to.contain('"payload" is required');
  });

  it('should throw error if paymentType is missing', () => {
    delete request.payload.paymentType;
    const { error } = schema.validate(request);
    expect(error).to.exist();
    expect(error.message).to.contain('"payload.paymentType" is required');
  });

  it('should throw error if settlementInformation is empty', () => {
    request.payload.settlementInformation = [];
    const { error } = schema.validate(request);
    expect(error).to.exist();
    expect(error.message).to.contain(
      '"payload.settlementInformation" must contain at least 1 items'
    );
  });

  it('should throw error if PayBills has no identifier', () => {
    request.payload.settlementInformation[0] = {
      requestType: 'PayBills',
      transactionType: 'G',
      amount: 300,
    };

    const { error } = schema.validate(request);
    expect(error).to.exist();
    expect(error.message).to.contain('must contain at least one of');
  });

  it('should validate successfully for PayBills with accountNumber', () => {
    request.payload.settlementInformation[0] = {
      requestType: 'PayBills',
      transactionType: 'G',
      amount: 300,
      accountNumber: '123456789',
    };

    const { error } = schema.validate(request);
    expect(error).to.not.exist();
  });

  it('should throw error if VolumeBoost is missing transactions', () => {
    request.payload.settlementInformation[0] = {
      requestType: 'VolumeBoost',
      transactionType: 'N',
      accountNumber: '123456',
    };

    const { error } = schema.validate(request);
    expect(error).to.exist();
    expect(error.message).to.contain(
      '"payload.settlementInformation[0].transactions" is required'
    );
  });

  it('should throw error if VolumeBoost transactionType is not N', () => {
    request.payload.settlementInformation[0] = {
      requestType: 'VolumeBoost',
      transactionType: 'X',
      accountNumber: '123456',
      transactions: [{ sku: 'VOL1' }],
    };

    const { error } = schema.validate(request);
    expect(error).to.exist();
    expect(error.message).to.contain(
      '"payload.settlementInformation[0].transactionType" must be one of [G, I, N, B]'
    );
  });

  it('should validate successfully for VolumeBoost', () => {
    request.payload.settlementInformation[0] = {
      requestType: 'VolumeBoost',
      transactionType: 'N',
      accountNumber: '123456',
      transactions: [{ sku: 'VOL1' }],
    };

    const { error } = schema.validate(request);
    expect(error).to.not.exist();
  });

  it('should throw error if BuyLoad is missing transactions', () => {
    request.payload.settlementInformation[0] = {
      requestType: 'BuyLoad',
      transactionType: 'N',
      amount: 100,
      mobileNumber: '09171234567',
    };

    const { error } = schema.validate(request);
    expect(error).to.exist();
    expect(error.message).to.contain(
      '"payload.settlementInformation[0].transactions" is required'
    );
  });

  it('should validate successfully for BuyLoad', () => {
    request.payload.settlementInformation[0] = {
      requestType: 'BuyLoad',
      transactionType: 'N',
      amount: 100,
      mobileNumber: '09171234567',
      transactions: [{ sku: 'LOAD10' }],
    };

    const { error } = schema.validate(request);
    expect(error).to.not.exist();
  });

  it('should throw error if budgetProtectProfile is invalid', () => {
    request.payload.budgetProtectProfile = {
      firstName: 'Juan',
      dateOfBirth: '1990-01-01',
    };

    const { error } = schema.validate(request);
    expect(error).to.exist();
    expect(error.message).to.contain(
      '"payload.budgetProtectProfile.lastName" is required'
    );
  });

  it('should validate successfully with valid budgetProtectProfile', () => {
    request.payload.budgetProtectProfile = {
      firstName: 'Juan',
      lastName: 'DelaCruz',
      dateOfBirth: '1990-01-01',
      email: 'juan@test.com',
    };

    const { error } = schema.validate(request);
    expect(error).to.not.exist();
  });

  it('should validate successfully with base valid payload', () => {
    const { error } = schema.validate(request);
    expect(error).to.not.exist();
  });
});
