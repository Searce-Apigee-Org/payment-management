import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import { esimXenditValidation } from '../../../src/services/paymentTypes/xenditValidations.js';

const lab = Lab.script();
const { describe, it } = lab;

export { lab };

describe('Util :: paymentUtil :: esimXenditValidation', () => {
  it('should throw InvalidParameter if forbidden keys exist', () => {
    const req = {
      payload: {
        paymentType: 'XENDIT',
        paymentInformation: { notificationUrls: [], reusability: 'ONETIME' },
      },
      headers: {},
    };
    try {
      esimXenditValidation(req);
      throw new Error('Expected throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
    }
  });

  it('should throw InsufficientParameters if required keys are missing', () => {
    const req = {
      payload: { paymentType: 'XENDIT', paymentInformation: {} },
      headers: {},
    };
    try {
      esimXenditValidation(req);
      throw new Error('Expected throw');
    } catch (err) {
      expect(err.type).to.equal('InsufficientParameters');
    }
  });

  it('should throw InvalidParameter for unknown type', () => {
    const req = {
      payload: {
        paymentType: 'XENDIT',
        paymentInformation: { type: 'UNKNOWN', reusability: 'ONETIME' },
      },
      headers: {},
    };
    try {
      esimXenditValidation(req);
      throw new Error('Expected throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
    }
  });

  it('should pass for valid CC_DC', () => {
    const req = {
      payload: {
        paymentType: 'XENDIT',
        paymentInformation: {
          type: 'CC_DC',
          paymentMethodId: 'pm-123',
          reusability: 'ONETIME',
        },
      },
      headers: {},
    };
    expect(esimXenditValidation(req)).to.be.true();
  });

  it('should pass for valid DIRECT_DEBIT', () => {
    const req = {
      headers: { 'user-token': 'abc' },
      payload: {
        paymentType: 'XENDIT',
        paymentInformation: {
          type: 'DIRECT_DEBIT',
          reusability: 'ONETIME',
          channelCode: 'BPI',
          directDebit: { successUrl: 's', failureUrl: 'f' },
        },
      },
    };
    expect(esimXenditValidation(req)).to.be.true();
  });

  it('should pass for valid EWALLET PAYMAYA', () => {
    const req = {
      payload: {
        paymentType: 'XENDIT',
        paymentInformation: {
          type: 'EWALLET',
          reusability: 'ONETIME',
          channelCode: 'PAYMAYA',
          eWallet: { successUrl: 's', failureUrl: 'f', cancelUrl: 'c' },
        },
      },
    };
    expect(esimXenditValidation(req)).to.be.true();
  });

  it('should pass for valid EWALLET GRABPAY', () => {
    const req = {
      payload: {
        paymentType: 'XENDIT',
        paymentInformation: {
          type: 'EWALLET',
          reusability: 'ONETIME',
          channelCode: 'GRABPAY',
          eWallet: { successUrl: 's', failureUrl: 'f' },
        },
      },
    };
    expect(esimXenditValidation(req)).to.be.true();
  });
});
