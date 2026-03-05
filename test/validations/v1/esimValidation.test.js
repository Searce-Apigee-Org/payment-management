import constants from '@globetel/cxs-core/core/constants/index.js';
import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Joi from 'joi';
import {
  createEsimPaymentSessionRequestSchema,
  createEsimPaymentSessionResponseSchema,
} from '../../../src/validations/v1/esimValidation.js';

const lab = Lab.script();
const { describe, it, beforeEach } = lab;
export { lab };

describe('Validation :: PaymentValidation-v1 :: createEsimPaymentSessionRequestSchema', () => {
  let request;
  const schema = Joi.object(createEsimPaymentSessionRequestSchema).options({
    abortEarly: false,
  });

  beforeEach(() => {
    request = {
      headers: {
        authorization: 'Bearer token',
        deviceid: 'device-123',
        'user-token': 'user-token-123',
      },
      payload: {
        paymentType: 'XENDIT',
        paymentInformation: {
          type: 'CC_DC',
          paymentMethodId: 'method-123',
          productName: 'ESIM Plan',
          productId: '12345',
          reusability: 'ONE_TIME',
          merchantId: 'M123',
          channelCode: 'BPI',
          directDebit: {
            successUrl: 'https://success.url',
            failureUrl: 'https://failure.url',
          },
          eWallet: {
            successUrl: 'https://success.url',
            cancelUrl: 'https://cancel.url',
          },
          notificationUrls: [
            {
              url: 'https://notify.url',
              type: 'PAY_RETURN',
            },
          ],
          envInfo: {
            orderTerminalType: 'WEB',
            terminalType: 'MOBILE',
          },
          order: {
            orderTitle: 'ESIM Purchase',
          },
          signAgreementPay: true,
          subMerchantName: 'SubMerchant',
          subMerchantId: 'Sub123',
        },
        settlementInformation: [
          {
            mobileNumber: '639171234567',
            emailAddress: 'test@example.com',
            amount: 100,
            requestType: 'BuyESIM',
          },
        ],
      },
    };
  });

  it('should throw error if authorization header is missing', () => {
    delete request.headers.authorization;
    const { error } = schema.validate(request);
    expect(error?.message).to.contain('"headers.authorization" is required');
  });

  it('should throw error if deviceid header is missing', () => {
    delete request.headers.deviceid;
    const { error } = schema.validate(request);
    expect(error?.message).to.contain('"headers.deviceid" is required');
  });

  it('should throw error if paymentInformation is missing', () => {
    delete request.payload.paymentInformation;
    const { error } = schema.validate(request);
    expect(error?.message).to.contain('"PaymentInformationModel" is required');
  });

  it('should throw error if settlementInformation is missing', () => {
    delete request.payload.settlementInformation;
    const { error } = schema.validate(request);
    expect(error?.message).to.contain(
      '"CreateEsimPaymentSessionRequestSettlementInformationModel" is required'
    );
  });

  it('should throw error if settlementInformation.mobileNumber is invalid', () => {
    request.payload.settlementInformation[0].mobileNumber = '12345';
    const { error } = schema.validate(request);
    expect(error?.message).to.contain(
      `"payload.settlementInformation[0].mobileNumber" with value "12345" fails to match the required pattern: ${constants.pattern.MSISDN_REGEX_PATTERN}`
    );
  });

  it('should throw error if settlementInformation.amount is less than 1', () => {
    request.payload.settlementInformation[0].amount = 0;
    const { error } = schema.validate(request);
    expect(error?.message).to.contain(
      '"payload.settlementInformation[0].amount" must be greater than or equal to 1'
    );
  });

  it('should validate successfully with correct payload and headers', () => {
    const { error } = schema.validate(request);
    expect(error).to.not.exist();
  });
});

describe('Validation :: PaymentValidation-v1 :: createEsimPaymentSessionResponseSchema', () => {
  let response;
  const schema = createEsimPaymentSessionResponseSchema.options({
    abortEarly: false,
  });

  beforeEach(() => {
    response = {
      result: {
        tokenPaymentId: 'token-12345',
      },
    };
  });

  it('should throw error if tokenPaymentId is missing', () => {
    delete response.result.tokenPaymentId;
    const { error } = schema.validate(response);
    expect(error?.message).to.contain('"result.tokenPaymentId" is required');
  });

  it('should throw error if tokenPaymentId is not a string', () => {
    response.result.tokenPaymentId = 12345;
    const { error } = schema.validate(response);
    expect(error?.message).to.contain(
      '"result.tokenPaymentId" must be a string'
    );
  });

  it('should validate successfully with correct response object', () => {
    const { error, value } = schema.validate(response);
    expect(error).to.not.exist();
    expect(value).to.equal(response);
  });
});
