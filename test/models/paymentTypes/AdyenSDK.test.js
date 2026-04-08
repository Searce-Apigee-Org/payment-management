import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import { validateAdyenSDKPaymentInfo } from '../../../src/models/paymentTypes/AdyenSDK.js';

const lab = Lab.script();
const { describe, it } = lab;
export { lab };

describe('Util :: RequestValidator :: AdyenSDKPaymentInfoValidator :: validateAdyenSDKPaymentInfo', () => {
  it('should pass with valid payload', () => {
    const payload = {
      returnUrl: 'https://return.url',
      origin: 'https://origin.url',
      shopperLocale: 'en_PH',
      browserInformation: {
        acceptHeader: 'text/html',
        userAgent: 'Mozilla',
      },
      customer: {
        firstName: 'John',
        gender: 'male',
        lastName: 'Doe',
      },
    };

    const result = validateAdyenSDKPaymentInfo(payload);
    expect(result.shopperLocale).to.equal('en_PH');
    expect(result.browserInformation.userAgent).to.equal('Mozilla');
  });

  it('should throw InsufficientParameters when required fields are missing', () => {
    const payload = {
      origin: 'https://origin.url',
      browserInformation: {
        acceptHeader: 'text/html',
        userAgent: 'Mozilla',
      },
      customer: {
        firstName: 'John',
        gender: 'male',
        lastName: 'Doe',
      },
    };
    expect(() => validateAdyenSDKPaymentInfo(payload)).to.throw();
  });

  it('should throw InvalidParameter when browserInformation has extra field', () => {
    const payload = {
      returnUrl: 'https://return.url',
      origin: 'https://origin.url',
      shopperLocale: 'en_PH',
      browserInformation: {
        acceptHeader: 'text/html',
        userAgent: 'Mozilla',
        extra: 'notAllowed',
      },
      customer: {
        firstName: 'John',
        gender: 'male',
        lastName: 'Doe',
      },
    };
    expect(() => validateAdyenSDKPaymentInfo(payload)).to.throw();
  });

  it('should throw InsufficientParameters when customer object is missing', () => {
    const payload = {
      returnUrl: 'https://return.url',
      origin: 'https://origin.url',
      shopperLocale: 'en_PH',
      browserInformation: {
        acceptHeader: 'text/html',
        userAgent: 'Mozilla',
      },
    };
    expect(() => validateAdyenSDKPaymentInfo(payload)).to.throw();
  });

  it('should pass with complex nested valid payload (dccQuote + splitList)', () => {
    const payload = {
      returnUrl: 'https://return.url',
      origin: 'https://origin.url',
      shopperLocale: 'en_PH',
      browserInformation: {
        acceptHeader: 'text/html',
        userAgent: 'Mozilla',
      },
      customer: {
        firstName: 'John',
        gender: 'male',
        lastName: 'Doe',
      },
      dccQuote: {
        baseAmount: { currency: 'PHP', amountInMinorUnit: 100 },
        buyRate: { currency: 'USD', amountInMinorUnit: 2 },
        interbankAmount: { currency: 'USD', amountInMinorUnit: 2 },
        sellRate: { currency: 'USD', amountInMinorUnit: 2 },
        basePoints: 1,
        validity: '2024-01-01T00:00:00Z',
      },
      splitList: [
        {
          account: '123',
          amount: { currency: 'PHP', amountInMinorUnit: 100 },
          type: 'Default',
        },
      ],
    };

    const result = validateAdyenSDKPaymentInfo(payload);
    expect(result.splitList[0].account).to.equal('123');
  });
});
