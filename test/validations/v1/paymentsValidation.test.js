import constants from '@globetel/cxs-core/core/constants/index.js';
import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Joi from 'joi';
import {
  getPaymentsRequestSchema,
  getPaymentsResponseSchema,
} from '../../../src/validations/v1/paymentsValidation.js';

const lab = Lab.script();
const { describe, it, beforeEach } = lab;
export { lab };

describe('Validations :: V1 :: PaymentsValidation :: getPaymentsRequestSchema', () => {
  let request;
  const schema = Joi.object(getPaymentsRequestSchema).options({
    abortEarly: false,
  });

  beforeEach(() => {
    request = {
      headers: {
        authorization: 'Bearer token',
        'user-token': 'user-token-123',
      },
      query: {
        mobileNumber: '639171234567',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      },
    };
  });

  it('should require authorization header', () => {
    delete request.headers.authorization;
    const { error } = schema.validate(request);
    expect(error?.message).to.contain('"headers.authorization" is required');
  });

  it('should enforce xor between headers.user-token and headers.otpreferenceid (conflict when both present)', () => {
    request.headers.otpreferenceid = 'otp-1';
    const { error } = schema.validate(request);
    expect(error?.message).to.contain(
      'contains a conflict between exclusive peers [user-token, otpreferenceid]'
    );
  });

  it('should enforce xor between headers.user-token and headers.otpreferenceid (require at least one)', () => {
    delete request.headers['user-token'];
    const { error } = schema.validate(request);
    expect(error?.message).to.contain(
      'must contain at least one of [user-token, otpreferenceid]'
    );
  });

  it('should error when query.mobileNumber fails MSISDN pattern', () => {
    request.headers['user-token'] = 'user-token-123';
    request.query.mobileNumber = '12345';
    const { error } = schema.validate(request);
    expect(error?.message).to.contain(
      `"query.mobileNumber" with value "12345" fails to match the required pattern: ${constants.pattern.MSISDN_REGEX_PATTERN}`
    );
  });

  it('should error when query.accountNumber fails ACCOUNT_NUMBER_PATTERN', () => {
    request.query = {
      accountNumber: 'ABC123',
      startDate: '2025-01-01',
      endDate: '2025-01-31',
    };
    const { error } = schema.validate(request);
    expect(error?.message).to.contain(
      `"query.accountNumber" with value "ABC123" fails to match the required pattern: ${constants.pattern.ACCOUNT_NUMBER_PATTERN}`
    );
  });

  it('should enforce xor between query.mobileNumber and query.accountNumber (conflict when both present)', () => {
    request.query.accountNumber = '1234567890';
    const { error } = schema.validate(request);
    expect(error?.message).to.contain(
      'contains a conflict between exclusive peers [mobileNumber, accountNumber]'
    );
  });

  it('should enforce xor between query.mobileNumber and query.accountNumber (require at least one)', () => {
    delete request.query.mobileNumber;
    const { error } = schema.validate(request);
    expect(error?.message).to.contain(
      'must contain at least one of [mobileNumber, accountNumber]'
    );
  });

  it('should error when query.startDate is not ISO 8601 date', () => {
    request.query.mobileNumber = '639171234567';
    request.query.startDate = '2025/01/01';
    const { error } = schema.validate(request);
    expect(error?.message).to.contain(
      '"query.startDate" must be in ISO 8601 date format'
    );
  });

  it('should validate successfully with mobileNumber branch', () => {
    request = {
      headers: {
        authorization: 'Bearer token',
        'user-token': 'user-token-123',
      },
      query: {
        mobileNumber: '639171234567',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      },
    };
    const { error } = schema.validate(request);
    expect(error).to.not.exist();
  });

  it('should validate successfully with accountNumber branch', () => {
    request = {
      headers: {
        authorization: 'Bearer token',
        otpreferenceid: 'otp-123',
      },
      query: {
        accountNumber: '1234567890',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      },
    };
    const { error } = schema.validate(request);
    expect(error).to.not.exist();
  });
});

describe('Validations :: V1 :: PaymentsValidation :: getPaymentsResponseSchema', () => {
  let response;
  const schema = getPaymentsResponseSchema.options({
    abortEarly: false,
  });

  beforeEach(() => {
    response = {
      result: {
        payments: [],
        token: 'signed-token',
      },
    };
  });

  it('should require "result"', () => {
    const responseBody = {};
    const { error } = schema.validate(responseBody);
    expect(error?.message).to.contain('"GetPaymentsResultModel" is required');
  });

  it('should require "result.payments"', () => {
    const responseBody = { result: { token: 'some-token' } };
    const { error } = schema.validate(responseBody);
    expect(error?.message).to.contain(
      '"GetPaymentsResultPaymentModel" is required'
    );
  });

  it('should require "result.token"', () => {
    const responseBody = { result: { payments: [] } };
    const { error } = schema.validate(responseBody);
    expect(error?.message).to.contain('"result.token" is required');
  });

  it('should validate successfully with correct response object', () => {
    const { error, value } = schema.validate(response);
    expect(error).to.not.exist();
    expect(value).to.equal(response);
  });
});
