import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Joi from 'joi';
import {
  paymentAutoRefundPubSubRequestSchema,
  paymentAutoRefundRequestSchema,
  paymentAutoRefundResponseSchema,
  paymentRefundRequestSchema,
  paymentRefundResponseSchema,
} from '../../../src/validations/v1/refundPaymentValidation.js';

const lab = Lab.script();
const { describe, it, beforeEach } = lab;
export { lab };

describe('Validation :: RefundPaymentValidation-v1 :: paymentRefundRequestSchema', () => {
  let request;
  const schema = Joi.object(paymentRefundRequestSchema).options({
    abortEarly: false,
  });

  beforeEach(() => {
    request = {
      headers: { authorization: 'Bearer token' },
      params: { tokenPaymentId: 'token-123' },
      payload: { refundAmount: 100.25 },
    };
  });

  it('should validate successfully with required fields', () => {
    const { error } = schema.validate(request);
    expect(error).to.not.exist();
  });

  it('should throw when tokenPaymentId is missing', () => {
    delete request.params.tokenPaymentId;
    const { error } = schema.validate(request);
    expect(error?.message).to.contain('"tokenPaymentId" is required');
  });

  it('should throw when refundAmount is missing', () => {
    delete request.payload.refundAmount;
    const { error } = schema.validate(request);
    expect(error?.message).to.contain('"RefundAmount" is required');
  });

  it('should throw when refundAmount is negative', () => {
    request.payload.refundAmount = -10;
    const { error } = schema.validate(request);
    expect(error?.message).to.contain(
      '"RefundAmount" must be a positive number'
    );
  });
});

describe('Validation :: RefundPaymentValidation-v1 :: paymentRefundResponseSchema', () => {
  it('should validate successfully with statusCode 202', () => {
    const response = { result: { statusCode: 202 } };
    const { error } = paymentRefundResponseSchema.validate(response);
    expect(error).to.not.exist();
  });
});

describe('Validation :: RefundPaymentValidation-v1 :: paymentAutoRefundRequestSchema', () => {
  const schema = Joi.object(paymentAutoRefundRequestSchema).options({
    abortEarly: false,
  });

  it('should validate successfully with refund details array', () => {
    const request = {
      payload: [
        {
          tokenPaymentId: 'LOC000123',
          paymentInformation: '{"type":"DIRECT_DEBIT","channelCode":"ABC"}',
          paymentType: 'XENDIT',
          settlementDetails: [
            {
              requestType: 'BuyESIMLocal',
              amount: 100,
              status: 'XENDIT_AUTHORISED',
              transactions: [{ provisionStatus: 'FAILED' }],
              emailAddress: 'example@email.com',
            },
          ],
        },
      ],
    };

    const { error } = schema.validate(request);
    expect(error).to.not.exist();
  });

  it('should throw when required fields are missing', () => {
    const request = { payload: [{ tokenPaymentId: 'LOC000123' }] };
    const { error } = schema.validate(request);
    expect(error?.message).to.contain(
      '"payload[0].paymentInformation" is required'
    );
    expect(error?.message).to.contain('"payload[0].paymentType" is required');
  });

  it('should throw when emailAddress is missing in settlement details', () => {
    const request = {
      payload: [
        {
          tokenPaymentId: 'LOC000123',
          paymentInformation: '{"type":"DIRECT_DEBIT","channelCode":"ABC"}',
          paymentType: 'XENDIT',
          settlementDetails: [
            {
              requestType: 'BuyESIMLocal',
              amount: 100,
              status: 'XENDIT_AUTHORISED',
              transactions: [{ provisionStatus: 'FAILED' }],
            },
          ],
        },
      ],
    };

    const { error } = schema.validate(request);
    expect(error?.message).to.contain(
      '"payload[0].settlementDetails[0].emailAddress" is required'
    );
  });
});

describe('Validation :: RefundPaymentValidation-v1 :: paymentAutoRefundResponseSchema', () => {
  it('should validate successfully with statusCode 200', () => {
    const response = { result: { statusCode: 200 } };
    const { error } = paymentAutoRefundResponseSchema.validate(response);
    expect(error).to.not.exist();
  });
});

describe('Validation :: RefundPaymentValidation-v1 :: paymentAutoRefundPubSubRequestSchema', () => {
  const schema = Joi.object(paymentAutoRefundPubSubRequestSchema).options({
    abortEarly: false,
  });

  it('should validate successfully with required fields', () => {
    const request = {
      headers: { authorization: 'Bearer token' },
      payload: {
        message: {
          data: Buffer.from(
            JSON.stringify([
              {
                tokenPaymentId: 'LOC000123',
                paymentInformation:
                  '{"type":"DIRECT_DEBIT","channelCode":"ABC"}',
                paymentType: 'XENDIT',
                settlementDetails: [
                  {
                    requestType: 'BuyESIMLocal',
                    amount: 100,
                    status: 'XENDIT_AUTHORISED',
                    transactions: [{ provisionStatus: 'FAILED' }],
                    emailAddress: 'example@email.com',
                  },
                ],
              },
            ]),
            'utf8'
          ).toString('base64'),
          messageId: 'msg-1',
          message_id: 'msg-1',
          publishTime: '2026-02-16T10:00:00Z',
          publish_time: '2026-02-16T10:00:00Z',
        },
        subscription: 'projects/mock/subscriptions/test',
      },
    };

    const { error } = schema.validate(request);
    expect(error).to.not.exist();
  });
});
