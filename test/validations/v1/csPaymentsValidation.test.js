import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Joi from 'joi';
import {
  processCSPaymentsRequestSchema,
  processCSPaymentsResponseSchema,
} from '../../../src/validations/v1/csPaymentsValidation.js';

const lab = Lab.script();
const { describe, it, beforeEach } = lab;
export { lab };

describe('Validation :: V1 :: csPayments :: processCSPaymentsRequestSchema', () => {
  let request;
  const schema = Joi.object(processCSPaymentsRequestSchema).options({
    abortEarly: false,
  });

  beforeEach(() => {
    request = {
      headers: {
        cxscachecontrol: 'no-cache',
      },
      payload: {
        tokenPaymentId: 'abc123',
        paymentStatus: 'AUTHORISED',
        transactionId: 'txn-123',
        paymentChannel: 'GCASH',
      },
    };
  });

  it('should allow missing cxscachecontrol header (optional)', () => {
    delete request.headers.cxscachecontrol;
    const { error, value } = schema.validate(request);
    expect(error).to.not.exist();
    expect(value.headers.cxscachecontrol).to.be.undefined();
  });

  it('should throw error if tokenPaymentId is missing', () => {
    delete request.payload.tokenPaymentId;
    const { error } = schema.validate(request);
    expect(error?.message).to.contain('"payload.tokenPaymentId" is required');
  });

  it('should throw error if paymentStatus is missing', () => {
    delete request.payload.paymentStatus;
    const { error } = schema.validate(request);
    expect(error?.message).to.contain('"payload.paymentStatus" is required');
  });

  it('should throw error if transactionId is missing', () => {
    delete request.payload.transactionId;
    const { error } = schema.validate(request);
    expect(error?.message).to.contain('"payload.transactionId" is required');
  });

  it('should throw error if paymentChannel is missing', () => {
    delete request.payload.paymentChannel;
    const { error } = schema.validate(request);
    expect(error?.message).to.contain('"payload.paymentChannel" is required');
  });

  it('should trim whitespace in payload string fields', () => {
    request.payload.tokenPaymentId = '  abc123  ';
    request.payload.paymentStatus = '  AUTHORISED  ';
    request.payload.transactionId = '  txn-123  ';
    request.payload.paymentChannel = '  GCASH  ';

    const { error, value } = schema.validate(request);
    expect(error).to.not.exist();
    expect(value.payload.tokenPaymentId).to.equal('abc123');
    expect(value.payload.paymentStatus).to.equal('AUTHORISED');
    expect(value.payload.transactionId).to.equal('txn-123');
    expect(value.payload.paymentChannel).to.equal('GCASH');
  });

  it('should throw error if tokenPaymentId is not a string', () => {
    request.payload.tokenPaymentId = 12345;
    const { error } = schema.validate(request);
    expect(error?.message).to.contain(
      '"payload.tokenPaymentId" must be a string'
    );
  });

  it('should throw error if paymentStatus is not a string', () => {
    request.payload.paymentStatus = 1;
    const { error } = schema.validate(request);
    expect(error?.message).to.contain(
      '"payload.paymentStatus" must be a string'
    );
  });

  it('should throw error if transactionId is not a string', () => {
    request.payload.transactionId = { id: 'txn-123' };
    const { error } = schema.validate(request);
    expect(error?.message).to.contain(
      '"payload.transactionId" must be a string'
    );
  });

  it('should throw error if paymentChannel is not a string', () => {
    request.payload.paymentChannel = false;
    const { error } = schema.validate(request);
    expect(error?.message).to.contain(
      '"payload.paymentChannel" must be a string'
    );
  });

  it('should throw error if cxscachecontrol header is not a string', () => {
    request.headers.cxscachecontrol = { v: 'no-cache' };
    const { error } = schema.validate(request);
    expect(error?.message).to.contain(
      '"headers.cxscachecontrol" must be a string'
    );
  });

  it('should validate successfully with correct headers and payload', () => {
    const { error, value } = schema.validate(request);
    expect(error).to.not.exist();
    expect(value).to.equal(request);
  });
});

describe('Validation :: V1 :: csPayments :: processCSPaymentsResponseSchema', () => {
  const schema = processCSPaymentsResponseSchema.options({
    abortEarly: false,
  });

  it('should validate successfully for an empty object (204 response)', () => {
    const response = {};
    const { error, value } = schema.validate(response);
    expect(error).to.not.exist();
    expect(value).to.equal(response);
  });

  it('should reject non-empty response objects', () => {
    const response = { foo: 'bar' };
    const { error } = schema.validate(response);
    expect(error).to.exist();
    expect(error.message).to.contain('"foo" is not allowed');
  });
});
