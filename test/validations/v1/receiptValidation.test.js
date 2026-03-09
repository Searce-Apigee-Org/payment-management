import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Joi from 'joi';
import {
  getPaymentReceiptRequestSchema,
  getPaymentReceiptResponseSchema,
} from '../../../src/validations/v1/receiptValidation.js';

const lab = Lab.script();
const { describe, it, beforeEach } = lab;
export { lab };

describe('Validation :: ReceiptValidation-v1 :: getPaymentReceiptRequestSchema', () => {
  let request;
  const schema = Joi.object(getPaymentReceiptRequestSchema).options({
    abortEarly: false,
    allowUnknown: true,
  });

  beforeEach(() => {
    request = {
      headers: {
        authorization: 'Bearer token',
        deviceid: 'device-123',
        'user-token': 'user-token-123',
        'x-receipt-token': 'receipt-token-123',
      },
      params: {
        receiptId: 'receipt123',
      },
      query: {
        storeId: 'store123',
        appCode: 'Rudy',
      },
    };
  });

  it('should throw error if authorization header is missing for user-token flow', () => {
    delete request.headers.authorization;
    const { error } = schema.validate(request);
    expect(error).to.exist();
    expect(error.message).to.contain('required');
    expect(error.message).to.match(/authorization|otpreferenceid/);
  });

  it('should throw error if user-token header is missing', () => {
    delete request.headers['user-token'];
    const { error } = schema.validate(request);
    expect(error).to.exist();
    expect(error.message).to.contain('required');
    expect(error.message).to.match(/user-token|otpreferenceid/);
  });

  it('should throw error if x-receipt-token header is missing', () => {
    delete request.headers['x-receipt-token'];
    const { error } = schema.validate(request);
    expect(error?.message).to.contain('"headers.x-receipt-token" is required');
  });

  it('should throw error if receiptId param is missing', () => {
    delete request.params.receiptId;
    const { error } = schema.validate(request);
    expect(error?.message).to.contain('"params.receiptId" is required');
  });

  it('should throw error if storeId query is missing', () => {
    delete request.query.storeId;
    const { error } = schema.validate(request);
    expect(error?.message).to.contain('"query.storeId" is required');
  });

  it('should validate successfully with correct headers, params, and query', () => {
    const { error } = schema.validate(request);
    expect(error).to.not.exist();
  });
});

describe('Validation :: ReceiptValidation-v1 :: getPaymentReceiptResponseSchema', () => {
  let response;
  const schema = getPaymentReceiptResponseSchema.options({
    abortEarly: false,
  });

  beforeEach(() => {
    response = {
      result: '<html>Receipt</html>',
      headers: {
        'Content-Type': 'text/html',
      },
    };
  });

  it('should throw error if result is missing', () => {
    delete response.result;
    const { error } = schema.validate(response);
    expect(error).to.exist();
    expect(error.message).to.contain('ReceiptHtmlString');
  });

  it('should throw error if headers.Content-Type is missing', () => {
    delete response.headers['Content-Type'];
    const { error } = schema.validate(response);
    expect(error?.message).to.contain('"headers.Content-Type" is required');
  });

  it('should throw error if headers.Content-Type is invalid', () => {
    response.headers['Content-Type'] = 'application/json';
    const { error } = schema.validate(response);
    expect(error?.message).to.contain(
      '"headers.Content-Type" must be [text/html]'
    );
  });

  it('should validate successfully with correct response object', () => {
    const { error, value } = schema.validate(response);
    expect(error).to.not.exist();
    expect(value).to.equal(response);
  });
});
