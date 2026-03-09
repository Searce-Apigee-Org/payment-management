import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import {
  createWebPaymentSessionRequestSchema,
  createWebPaymentSessionResponseSchema,
} from '../../../src/validations/v2/webPaymentRequestValidation.js';

export const lab = Lab.script();
const { describe, it } = lab;

describe('Validation :: createWebPaymentSessionSchema', () => {
  it('should validate successfully with a fully valid payload', async () => {
    const payload = {
      customerInfo: { customerId: 'cust-123', customerName: 'Jane Doe' },
      settlementInfo: {
        breakdown: [
          {
            transactionType: 'G',
            requestType: 'BuyLoad',
            amount: 99,
            mobileNumber: '09171234567',
            transactions: [
              {
                amount: 99,
                keyword: 'LOAD10',
                wallet: 'A',
                serviceId: '12345',
              },
            ],
          },
        ],
      },
      allowedPaymentMethods: ['CARD_STRAIGHT'],
      notificationUrls: {
        successUrl: 'https://success.url',
        failureUrl: 'https://fail.url',
      },
    };

    const request = {
      headers: {
        authorization: 'Bearer token123',
        appChannel: 'superapp',
        'user-token': 'user-token-456',
      },
      payload,
    };

    const result = createWebPaymentSessionRequestSchema.payload.validate(
      request.payload,
      { context: request }
    );

    expect(result.error).to.not.exist();
  });

  it('should fail validation if missing customerInfo when user-token not provided', async () => {
    const payload = {
      settlementInfo: {
        breakdown: [
          {
            transactionType: 'G',
            requestType: 'BuyLoad',
            amount: 99,
            mobileNumber: '09171234567',
            transactions: [
              {
                amount: 99,
                keyword: 'LOAD10',
                wallet: 'A',
                serviceId: '12345',
              },
            ],
          },
        ],
      },
      allowedPaymentMethods: ['CARD_STRAIGHT'],
    };

    const request = {
      headers: {
        authorization: 'Bearer token123',
        appChannel: 'web',
        // missing user-token
      },
      payload,
    };

    const result = createWebPaymentSessionRequestSchema.payload.validate(
      request.payload,
      { context: request }
    );
    expect(result.error).to.exist();
    expect(result.error.message).to.include(
      'CreateWebPaymentSessionRequestPayload'
    );
  });

  it('should fail if successUrl is not HTTPS', async () => {
    const payload = {
      customerInfo: { customerId: 'cust-001' },
      settlementInfo: {
        breakdown: [
          {
            transactionType: 'G',
            requestType: 'BuyLoad',
            amount: 99,
            mobileNumber: '09171234567',
            transactions: [
              {
                amount: 99,
                keyword: 'LOAD10',
                wallet: 'A',
                serviceId: '12345',
              },
            ],
          },
        ],
      },
      notificationUrls: {
        successUrl: 'http://invalid.url', // Invalid: not HTTPS
      },
    };

    const request = {
      headers: {
        authorization: 'Bearer token123',
        'user-token': 'user-token-456',
      },
      payload,
    };

    const result = createWebPaymentSessionRequestSchema.payload.validate(
      request.payload,
      { context: request }
    );

    expect(result.error).to.exist();
  });

  it('should validate a correct response schema', async () => {
    const response = {
      result: {
        tokenPaymentId: 'PAY123',
        webSessionUrl: 'https://mock.url/session',
        webSessionToken: 'auth-token',
        ttl: '3600',
      },
    };

    const result = createWebPaymentSessionResponseSchema.validate(response);

    expect(result.error).to.not.exist();
  });

  it('should fail response validation if missing fields', async () => {
    const response = {
      result: {
        tokenPaymentId: 'PAY123',
      },
    };

    const result = createWebPaymentSessionResponseSchema.validate(response);

    expect(result.error).to.exist();
    expect(result.error.message).to.include('webSessionUrl');
  });

  it('should fail when user-token header and customerId are both missing', () => {
    const payload = {
      customerInfo: {
        // customerId intentionally missing
        customerName: 'Jane Doe',
      },
      settlementInfo: {
        breakdown: [
          {
            transactionType: 'G',
            requestType: 'BuyLoad',
            amount: 100,
            mobileNumber: '09171234567',
            transactions: [
              {
                amount: 100,
                keyword: 'LOAD10',
                serviceId: '1234',
                wallet: 'A',
              },
            ],
          },
        ],
      },
    };

    const headers = {
      authorization: 'Bearer token123',
      // no 'user-token'
    };

    const { error } = createWebPaymentSessionRequestSchema.payload.validate(
      payload,
      {
        context: { headers },
        prefs: { abortEarly: false },
      }
    );

    expect(error).to.exist;
    const messages = error.details.map((d) => d.message.toLowerCase());
    expect(messages.some((m) => m.includes('customerid'))).to.be.true;
  });

  it('should pass when user-token header is present even without customerId', () => {
    const payload = {
      customerInfo: {
        customerName: 'Jane Doe',
      },
      settlementInfo: {
        breakdown: [
          {
            transactionType: 'G',
            requestType: 'BuyLoad',
            amount: 100,
            mobileNumber: '09171234567',
            transactions: [
              {
                amount: 100,
                keyword: 'LOAD10',
                serviceId: '1234',
                wallet: 'A',
              },
            ],
          },
        ],
      },
    };

    const headers = {
      authorization: 'Bearer token123',
      'user-token': 'usertok123',
    };

    const { error } = createWebPaymentSessionRequestSchema.payload.validate(
      payload,
      {
        context: { headers },
        prefs: { abortEarly: false },
      }
    );

    expect(error).to.not.exist;
  });
});
