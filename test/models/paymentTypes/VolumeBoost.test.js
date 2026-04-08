import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import sinon from 'sinon';
import { validateVolumeBoostRequest } from '../../../src/models/paymentTypes/VolumeBoost.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;
export { lab };

describe('Util :: RequestValidator :: VolumeBoostValidator :: validateVolumeBoostRequest', () => {
  let validPayload;

  beforeEach(() => {
    validPayload = [
      {
        verificationToken: 'VALID_TOKEN_123',
      },
    ];
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should pass with valid payload', () => {
    expect(() => validateVolumeBoostRequest(validPayload)).to.not.throw();
  });

  it('should throw InvalidParameter when payload is empty array', () => {
    try {
      validateVolumeBoostRequest([]);
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
    }
  });

  it('should throw InsufficientParameters when verificationToken missing', () => {
    const payload = [{}];
    try {
      validateVolumeBoostRequest(payload);
    } catch (err) {
      expect(err.type).to.equal('InsufficientParameters');
    }
  });

  it('should throw InvalidParameter when verificationToken is empty string', () => {
    const payload = [
      {
        verificationToken: '',
      },
    ];
    try {
      validateVolumeBoostRequest(payload);
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
    }
  });

  it('should throw InvalidParameter when unknown field is present', () => {
    const payload = [
      {
        verificationToken: 'VALID_TOKEN',
        extraField: 'notAllowed',
      },
    ];
    try {
      validateVolumeBoostRequest(payload);
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
    }
  });

  it('should throw InvalidParameter when payload is not an array', () => {
    const payload = { verificationToken: 'VALID_TOKEN_123' };
    try {
      validateVolumeBoostRequest(payload);
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
    }
  });
});
