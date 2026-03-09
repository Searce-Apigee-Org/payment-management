import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Joi from 'joi';
import {
  getPaymentSessionRequestSchema,
  getPaymentSessionResponseSchema,
} from '../../../src/validations/v1/paymentValidation.js';

const lab = Lab.script();
const { describe, it, beforeEach } = lab;
export { lab };

describe('Validation :: PaymentValidation-v1 :: getPaymentSessionRequestSchema', () => {
  let request;
  const schema = Joi.object(getPaymentSessionRequestSchema).options({
    abortEarly: false,
  });

  beforeEach(() => {
    request = {
      headers: {
        authorization: 'Bearer token',
        deviceid: 'device-123',
        'user-token': 'user-token-123',
      },
      params: {
        tokenPaymentId: 'token-12345',
      },
    };
  });
  it('should throw error if authorization header is missing', () => {
    delete request.headers.authorization;
    const { error } = schema.validate(request);
    expect(error?.message).to.contain('"headers.authorization" is required');
  });

  it('should validate successfully if deviceid header is missing (optional)', () => {
    delete request.headers.deviceid;
    const { error } = schema.validate(request);
    expect(error).to.not.exist();
  });

  it('should validate successfully if user-token header is missing (optional)', () => {
    delete request.headers['user-token'];
    const { error } = schema.validate(request);
    expect(error).to.not.exist();
  });
  it('should throw error if tokenPaymentId param is missing', () => {
    delete request.params.tokenPaymentId;
    const { error } = schema.validate(request);
    expect(error?.message).to.contain('"params.tokenPaymentId" is required');
  });

  it('should throw error if tokenPaymentId param is empty string', () => {
    request.params.tokenPaymentId = '';
    const { error } = schema.validate(request);
    expect(error?.message).to.contain(
      '"params.tokenPaymentId" is not allowed to be empty'
    );
  });

  it('should decode tokenPaymentId successfully if encoded', () => {
    const encoded = encodeURIComponent('token-12345');
    request.params.tokenPaymentId = encoded;
    const { error, value } = schema.validate(request);
    expect(error).to.not.exist();
    expect(value.params.tokenPaymentId).to.equal('token-12345');
  });
  it('should validate successfully with all required headers and params', () => {
    const { error, value } = schema.validate(request);
    expect(error).to.not.exist();
    expect(value.headers.authorization).to.equal('Bearer token');
    expect(value.params.tokenPaymentId).to.equal('token-12345');
  });
});

describe('Validation :: PaymentValidation-v1 :: getPaymentSessionResponseSchema', () => {
  let response;
  const schema = getPaymentSessionResponseSchema.options({
    abortEarly: false,
  });

  beforeEach(() => {
    response = {
      result: {
        tokenPaymentId: 'token-12345',
        paymentDetails: [
          {
            convenienceFeeAmount: '10',
            postedAmount: '100',
            paymentAmount: '110',
          },
        ],
        paymentSession: 'session-123',
        checkoutUrl: 'http://checkout.url',
        accounts: [
          {
            status: 'ACTIVE',
            transactions: [{ transactionId: 'txn-1', amount: 100 }],
          },
        ],
        merchantAccount: 'merchant-abc',
        paymentMethods: 'card',
        storedPaymentMethods: 'stored-card',
        paymentResult: 'SUCCESS',
        transactionDate: '2025-09-28T10:00:00Z',
      },
    };
  });

  it('should validate successfully with all required fields', () => {
    const { error } = schema.validate(response);
    expect(error).to.not.exist();
  });

  it('should throw error if result is missing', () => {
    delete response.result;
    const { error } = schema.validate(response);
    expect(error?.message).to.contain(
      '"GetPaymentSessionResultModel" is required'
    );
  });

  it('should throw error if tokenPaymentId is missing', () => {
    delete response.result.tokenPaymentId;
    const { error } = schema.validate(response);
    expect(error?.message).to.contain('"result.tokenPaymentId" is required');
  });

  it('should throw error if paymentSession is missing', () => {
    delete response.result.paymentSession;
    const { error } = schema.validate(response);
    expect(error?.message).to.contain('"result.paymentSession" is required');
  });

  it('should throw error if checkoutUrl is missing', () => {
    delete response.result.checkoutUrl;
    const { error } = schema.validate(response);
    expect(error?.message).to.contain('"result.checkoutUrl" is required');
  });

  it('should throw error if merchantAccount is missing', () => {
    delete response.result.merchantAccount;
    const { error } = schema.validate(response);
    expect(error?.message).to.contain('"result.merchantAccount" is required');
  });

  it('should throw error if paymentMethods is missing', () => {
    delete response.result.paymentMethods;
    const { error } = schema.validate(response);
    expect(error?.message).to.contain('"result.paymentMethods" is required');
  });

  it('should throw error if storedPaymentMethods is missing', () => {
    delete response.result.storedPaymentMethods;
    const { error } = schema.validate(response);
    expect(error?.message).to.contain(
      '"result.storedPaymentMethods" is required'
    );
  });

  it('should throw error if paymentResult is missing', () => {
    delete response.result.paymentResult;
    const { error } = schema.validate(response);
    expect(error?.message).to.contain('"result.paymentResult" is required');
  });

  it('should validate successfully without optional arrays (accounts, errors, oona)', () => {
    delete response.result.accounts;
    delete response.result.errors;
    delete response.result.oona;
    const { error } = schema.validate(response);
    expect(error).to.not.exist();
  });

  it('should throw error if errors array contains invalid item', () => {
    response.result.errors = [{ wrongKey: 'oops' }];
    const { error } = schema.validate(response);
    expect(error?.message).to.contain('"result.errors[0].message" is required');
  });
});
