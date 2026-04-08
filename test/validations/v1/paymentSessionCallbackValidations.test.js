import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Joi from 'joi';
import { paymentSessionCallbackRequestSchema } from '../../../src/validations/v1/paymentSessionCallbackValidations.js';

const lab = Lab.script();
const { describe, it, beforeEach } = lab;
export { lab };

describe('Validation :: PaymentSessionCallbackValidation-v1 :: paymentSessionCallbackRequestSchema', () => {
  let request;
  const schema = Joi.object(paymentSessionCallbackRequestSchema).options({
    abortEarly: false,
    allowUnknown: true,
  });

  beforeEach(() => {
    request = {
      headers: {
        'content-type': 'application/json',
      },
      payload: {
        notification: {
          name: 'PAYMENT_CREATED',
          payload: {
            paymentId: 'PAY123',
            paymentSession: 'session123',
          },
        },
      },
    };
  });

  it('should throw error if headers are missing', () => {
    delete request.headers;
    const { error } = schema.validate(request);
    expect(error).to.exist();
    expect(error.message).to.contain('"headers" is required');
  });

  it('should throw error if content-type is not application/json', () => {
    request.headers['content-type'] = 'text/plain';
    const { error } = schema.validate(request);
    expect(error).to.exist();
    expect(error.message).to.contain('must be [application/json]');
  });

  it('should throw error if notification is missing', () => {
    delete request.payload.notification;
    const { error } = schema.validate(request);
    expect(error).to.exist();
    expect(error.message).to.contain('"payload.notification" is required');
  });

  it('should throw error if notification.name is missing', () => {
    delete request.payload.notification.name;
    const { error } = schema.validate(request);
    expect(error).to.exist();
    expect(error.message).to.contain('"payload.notification.name" is required');
  });

  it('should throw error if paymentId is missing', () => {
    delete request.payload.notification.payload.paymentId;
    const { error } = schema.validate(request);
    expect(error).to.exist();
    expect(error.message).to.contain(
      '"payload.notification.payload.paymentId" is required'
    );
  });

  it('should throw error if none of the allowed payload fields are present', () => {
    request.payload.notification.payload = {
      paymentId: 'PAY123',
    };

    const { error } = schema.validate(request);
    expect(error).to.exist();
    expect(error.message).to.contain('must contain at least one of');
  });

  it('should validate successfully with checkoutUrl', () => {
    request.payload.notification.payload = {
      paymentId: 'PAY123',
      checkoutUrl: 'https://checkout.url',
    };

    const { error } = schema.validate(request);
    expect(error).to.not.exist();
  });

  it('should validate successfully with error as string', () => {
    request.payload.notification.payload = {
      paymentId: 'PAY123',
      error: 'Some error',
    };

    const { error } = schema.validate(request);
    expect(error).to.not.exist();
  });

  it('should validate successfully with error as array', () => {
    request.payload.notification.payload = {
      paymentId: 'PAY123',
      error: [{ message: 'Invalid payment' }],
    };

    const { error } = schema.validate(request);
    expect(error).to.not.exist();
  });

  it('should throw error if error array item message is missing', () => {
    request.payload.notification.payload = {
      paymentId: 'PAY123',
      error: [{}],
    };

    const { error } = schema.validate(request);
    expect(error).to.exist();
    expect(error.message).to.contain(
      '"payload.notification.payload.error[0].message" is required'
    );
  });

  it('should throw error if accounts status is missing', () => {
    request.payload.notification.payload = {
      paymentId: 'PAY123',
      accounts: [{}],
    };

    const { error } = schema.validate(request);
    expect(error).to.exist();
    expect(error.message).to.contain(
      '"payload.notification.payload.accounts[0].status" is required'
    );
  });
  it('should throw error if refusalReasonRaw is present for GCASH status', () => {
    request.payload.notification.payload = {
      paymentId: 'PAY123',
      accounts: [
        {
          status: 'GCASH',
          refusalReasonRaw: 'SOME_REASON',
        },
      ],
    };

    const { error } = schema.validate(request);
    expect(error).to.exist();
    expect(error.message).to.contain('is not allowed');
  });

  it('should validate successfully if refusalReasonRaw is present for non-GCASH status', () => {
    request.payload.notification.payload = {
      paymentId: 'PAY123',
      accounts: [
        {
          status: 'CARD',
          refusalReasonRaw: 'DECLINED',
        },
      ],
    };

    const { error } = schema.validate(request);
    expect(error).to.not.exist();
  });

  it('should validate successfully with valid accounts payload', () => {
    request.payload.notification.payload = {
      paymentId: 'PAY123',
      accounts: [
        {
          accountNumber: '123456',
          status: 'SUCCESS',
        },
      ],
    };

    const { error } = schema.validate(request);
    expect(error).to.not.exist();
  });

  it('should validate successfully with base valid payload', () => {
    const { error } = schema.validate(request);
    expect(error).to.not.exist();
  });
});
