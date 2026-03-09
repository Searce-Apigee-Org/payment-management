import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import {
  checkForbiddenKeys,
  checkRequiredKeys,
  getRequestClientId,
  isEmptyObject,
  isMissingParameter,
  validateChannel,
} from '../../src/util/esimUtil.js';

const lab = Lab.script();
const { describe, it } = lab;

export { lab };

describe('Util :: esimUtil :: checkRequiredKeys', () => {
  it('should throw InsufficientParameters if required key is missing', () => {
    const info = { key1: 'value1' };
    const requiredKeys = ['key1', 'key2'];
    try {
      checkRequiredKeys(info, requiredKeys);
      throw new Error('Expected throw');
    } catch (err) {
      expect(err.type).to.equal('InsufficientParameters');
    }
  });

  it('should pass if all required keys exist', () => {
    const info = { key1: 'value1', key2: 'value2' };
    const requiredKeys = ['key1', 'key2'];
    expect(() => checkRequiredKeys(info, requiredKeys)).to.not.throw();
  });
});

describe('Util :: esimUtil :: checkForbiddenKeys', () => {
  it('should throw InvalidParameter if forbidden key exists', () => {
    const info = { type: 'CC_DC', amount: 10 };
    const forbiddenKeys = ['type', 'merchantId'];
    try {
      checkForbiddenKeys(info, forbiddenKeys);
      throw new Error('Expected throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
    }
  });

  it('should pass if no forbidden key exists', () => {
    const info = { amount: 10, description: 'desc' };
    const forbiddenKeys = ['type', 'merchantId'];
    expect(() => checkForbiddenKeys(info, forbiddenKeys)).to.not.throw();
  });
});

describe('Util :: paymentUtil :: getRequestClientId', () => {
  it('should throw CredentialsNotFound if principalId is missing', () => {
    const req = { app: {} };
    try {
      getRequestClientId(req);
      throw new Error('Expected throw');
    } catch (err) {
      expect(err.type).to.equal('CredentialsNotFound');
    }
  });

  it('should return principalId if present', () => {
    const req = { app: { principalId: 'client-123' } };
    const result = getRequestClientId(req);
    expect(result).to.equal('client-123');
  });
});

describe('Util :: esimUtil :: isEmptyObject', () => {
  it('should return false for non-empty object', () => {
    expect(isEmptyObject({ key: 'value' })).to.be.false();
  });

  it('should return true for empty object', () => {
    expect(isEmptyObject({})).to.be.true();
  });
});

describe('Util :: esimUtil :: isMissingParameter', () => {
  const source = { key1: 'value1', key2: 'value2' };

  it('should return false if parameter exists', () => {
    expect(isMissingParameter(source, 'key1')).to.be.false();
  });

  it('should return true if parameter is missing', () => {
    expect(isMissingParameter(source, 'key3')).to.be.true();
  });
});

describe('Util :: esimUtil :: validateChannel', () => {
  it('should throw InvalidParameter if channelCode is not in valid list', () => {
    const channelCode = 'INVALID';
    const validList = ['BPI', 'UBP', 'RCBC'];
    try {
      validateChannel(channelCode, validList);
      throw new Error('Expected throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
    }
  });

  it('should pass if channelCode is in valid list', () => {
    const channelCode = 'BPI';
    const validList = ['BPI', 'UBP', 'RCBC'];
    expect(() => validateChannel(channelCode, validList)).to.not.throw();
  });
});
