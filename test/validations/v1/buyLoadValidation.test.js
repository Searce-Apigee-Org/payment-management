import constants from '@globetel/cxs-core/core/constants/index.js';
import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Joi from 'joi';
import {
  buyLoadRequestSchema,
  buyLoadResponseSchema,
} from '../../../src/validations/v1/buyLoadValidation.js';

const lab = Lab.script();
const { describe, it, beforeEach } = lab;
export { lab };

describe('Validation :: V1 :: BuyLoad :: buyLoadRequestSchema', () => {
  let request;
  const schema = Joi.object(buyLoadRequestSchema).options({
    abortEarly: false,
  });

  beforeEach(() => {
    request = {
      headers: {
        deviceid: 'device-123',
      },
      params: {
        customerId: '639171234567',
      },
      payload: {
        keyword: 'GOSURF',
        amount: 100,
        tokenPaymentId: 'TP-12345',
      },
    };
  });

  it('should fail when params.customerId does not match MSISDN regex pattern', () => {
    request.params.customerId = '12345';
    const { error } = schema.validate(request);
    expect(error?.message).to.contain(
      `"params.customerId" with value "12345" fails to match the required pattern: ${constants.pattern.MSISDN_REGEX_PATTERN}`
    );
  });

  it('should accept when headers are missing (allowUnknown=true + headers.deviceid optional)', () => {
    delete request.headers;
    const { error } = schema.validate(request);
    expect(error).to.not.exist();
  });

  it('should fail when payload.amount is less than 1', () => {
    request.payload.amount = 0;
    const { error } = schema.validate(request);
    expect(error?.message).to.contain(
      '"payload.amount" must be greater than or equal to 1'
    );
  });

  it('should fail when tokenPaymentId is missing', () => {
    delete request.payload.tokenPaymentId;
    const { error } = schema.validate(request);
    expect(error?.message).to.contain('"payload.tokenPaymentId" is required');
  });

  it('should enforce xor: missing both keyword and wallet fails', () => {
    delete request.payload.keyword;
    delete request.payload.wallet;
    const { error } = schema.validate(request);
    expect(error?.message).to.contain(
      'must contain at least one of [keyword, wallet]'
    );
  });

  it('should enforce xor: providing both keyword and wallet fails', () => {
    request.payload.wallet = 'WALLET_MAIN';
    const { error } = schema.validate(request);
    expect(error?.message).to.contain(
      'contains a conflict between exclusive peers [keyword, wallet]'
    );
  });

  it('should accept when keyword is an empty string (allowed) and wallet is omitted', () => {
    request.payload.keyword = '';
    delete request.payload.wallet;

    const { error } = schema.validate(request);
    expect(error).to.not.exist();
  });

  it('should accept when wallet is an empty string (allowed) and keyword is omitted', () => {
    request.payload = {
      wallet: '',
      amount: 50,
      tokenPaymentId: 'TP-222',
    };

    const { error } = schema.validate(request);
    expect(error).to.not.exist();
  });

  it('should accept wallet path with optional agentName omitted', () => {
    request.payload = {
      wallet: 'WALLET_MAIN',
      amount: 50,
      tokenPaymentId: 'TP-222',
    };
    const { error } = schema.validate(request);
    expect(error).to.not.exist();
  });

  it('should fail when wallet is present and agentName is an empty string (min length 1)', () => {
    request.payload = {
      wallet: 'WALLET_MAIN',
      agentName: '',
      amount: 50,
      tokenPaymentId: 'TP-222',
    };
    const { error } = schema.validate(request);
    expect(error?.message).to.contain(
      '"payload.agentName" is not allowed to be empty'
    );
  });

  it('should accept amount as a numeric string because convert=true', () => {
    request.payload.amount = '25';
    const { error, value } = schema.validate(request);
    expect(error).to.not.exist();
    expect(typeof value.payload.amount).to.equal('number');
    expect(value.payload.amount).to.equal(25);
  });

  it('should validate successfully for keyword path with minimal required fields', () => {
    const { error } = schema.validate(request);
    expect(error).to.not.exist();
  });

  it('should accept optional externalTransactionId', () => {
    request.payload.externalTransactionId = 'EXT-123';

    const { error } = schema.validate(request);
    expect(error).to.not.exist();
  });
});

describe('Validation :: V1 :: BuyLoad :: buyLoadResponseSchema', () => {
  it('should accept an empty object as a valid response', () => {
    const schema = buyLoadResponseSchema.options({ abortEarly: false });
    const response = {};
    const { error, value } = schema.validate(response);
    expect(error).to.not.exist();
    expect(value).to.equal(response);
  });
});
