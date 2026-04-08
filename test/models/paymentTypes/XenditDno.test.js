import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import {
  processDnoXenditRequest,
  validateDnoXenditRequest,
} from '../../../src/models/paymentTypes/XenditDno.js';
import { constants } from '../../../src/util/index.js';

const lab = Lab.script();
const { describe, it, beforeEach } = lab;
export { lab };

describe('Util :: RequestValidator :: DnoXenditValidator :: validateDnoXenditRequest', () => {
  let validPayload;

  beforeEach(() => {
    validPayload = {
      type: 'CC_DC',
      reusability: 'ONE_TIME_USE',
      eWallet: {
        successUrl: '[https://success.com](https://success.com)',
      },
      directDebit: {
        failureUrl: '[https://fail.com](https://fail.com)',
        successUrl: '[https://ok.com](https://ok.com)',
      },
      productName: constants.PAYMENT_ENTITY_TYPES.ENTITY_GFPACQUI,
      customerUuid: 'UUID-123',
    };
  });

  it('should pass with valid payload', () => {
    const result = validateDnoXenditRequest(validPayload);
    expect(result).to.exist();
  });

  it('should throw InsufficientParameters when required field type missing', () => {
    const payload = {
      reusability: 'ONE_TIME_USE',
      eWallet: { successUrl: '[https://success.com](https://success.com)' },
    };
    try {
      validateDnoXenditRequest(payload);
    } catch (err) {
      expect(err.type).to.equal('InsufficientParameters');
    }
  });

  it('should throw InvalidParameter when unknown field is present', () => {
    const payload = { ...validPayload, extraField: 'notAllowed' };
    try {
      validateDnoXenditRequest(payload);
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
    }
  });

  it('should throw InsufficientParameters when nested required field missing', () => {
    const payload = {
      type: 'CC_DC',
      reusability: 'ONE_TIME_USE',
      eWallet: {},
      directDebit: { failureUrl: '[https://fail.com](https://fail.com)' },
    };
    try {
      validateDnoXenditRequest(payload);
    } catch (err) {
      expect(err.type).to.equal('InsufficientParameters');
    }
  });
});

describe('Util :: RequestValidator :: DnoXenditValidator :: processDnoXenditRequest', () => {
  let settlementInfo;
  let validPayload;

  beforeEach(() => {
    settlementInfo = {
      mobileNumber: '9876543210',
      accountNumber: 'ACC123',
    };

    validPayload = {
      type: 'CC_DC',
      reusability: 'ONE_TIME_USE',
      productName: constants.PAYMENT_ENTITY_TYPES.ENTITY_GFPACQUI,
    };
  });

  it('should pass for valid payload with correct productName and mobileNumber', () => {
    expect(() =>
      processDnoXenditRequest(validPayload, settlementInfo)
    ).to.not.throw();
  });

  it('should throw InvalidOutboundRequest when productName mismatched', () => {
    const payload = {
      ...validPayload,
      productName: 'INVALID_PRODUCT',
    };
    try {
      processDnoXenditRequest(payload, settlementInfo);
    } catch (err) {
      expect(err.type).to.equal('InvalidOutboundRequest');
    }
  });

  it('should throw InvalidOutboundRequest when mobileNumber missing but accountNumber present', () => {
    const payload = { ...validPayload };
    const info = { accountNumber: 'ACC123' };
    try {
      processDnoXenditRequest(payload, info);
    } catch (err) {
      expect(err.type).to.equal('InvalidOutboundRequest');
    }
  });

  it('should throw InsufficientParameters when mobileNumber completely missing', () => {
    const payload = { ...validPayload };
    const info = {};
    try {
      processDnoXenditRequest(payload, info);
    } catch (err) {
      expect(err.type).to.equal('InsufficientParameters');
    }
  });
});
