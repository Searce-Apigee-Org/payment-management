import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import { esimGcashValidation } from '../../../src/services/paymentTypes/gcashValidations.js';

const lab = Lab.script();
const { describe, it } = lab;

export { lab };

describe('Util :: paymentUtil :: esimGcashValidation', () => {
  it('should throw InsufficientParameters if required keys are missing', () => {
    const req = { payload: { paymentType: 'GCASH', paymentInformation: {} } };
    try {
      esimGcashValidation(req);
      throw new Error('Expected throw');
    } catch (err) {
      expect(err.type).to.equal('InsufficientParameters');
    }
  });

  it('should throw InvalidParameter if forbidden keys exist', () => {
    const req = {
      payload: {
        paymentType: 'GCASH',
        paymentInformation: { type: 'CC_DC', notificationUrls: [] },
      },
    };
    try {
      esimGcashValidation(req);
      throw new Error('Expected throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
    }
  });

  it('should pass for valid GCASH request', () => {
    const req = {
      payload: {
        paymentType: 'GCASH',
        paymentInformation: {
          notificationUrls: [{ url: 'https://notify', type: 'PAY_RETURN' }],
          envInfo: { orderTerminalType: 'WEB', terminalType: 'MOBILE' },
          order: { orderTitle: 'ESIM Order' },
        },
      },
    };
    expect(esimGcashValidation(req)).to.be.true();
  });
});
