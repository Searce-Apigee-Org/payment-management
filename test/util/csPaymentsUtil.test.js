import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import {
  formatAccessToken,
  isTokenExpired,
} from '../../src/util/csPaymentsUtil.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

let clock;

beforeEach(() => {
  clock = Sinon.useFakeTimers(1_700_000_000_000);
});

afterEach(() => {
  if (clock && typeof clock.restore === 'function') {
    clock.restore();
  }
  Sinon.restore();
});

describe('Utils :: csPayments :: isTokenExpired', () => {
  it('should return true when retrieved_at is missing', () => {
    const token = { expires_in: 60 };
    const result = isTokenExpired(token);
    expect(result).to.be.true();
  });

  it('should return true when expires_in is missing', () => {
    const token = { retrieved_at: Date.now() };
    const result = isTokenExpired(token);
    expect(result).to.be.true();
  });

  it('should return false when token has not yet expired', () => {
    const token = {
      retrieved_at: Date.now(),
      expires_in: 2,
    };
    const result = isTokenExpired(token);
    expect(result).to.be.false();
  });

  it('should return true when token has expired', () => {
    const token = {
      retrieved_at: Date.now(),
      expires_in: 1,
    };
    clock.tick(1500);
    const result = isTokenExpired(token);
    expect(result).to.be.true();
  });

  it('should handle string values for retrieved_at and expires_in', () => {
    const token = {
      retrieved_at: String(Date.now()),
      expires_in: '2',
    };
    const result = isTokenExpired(token);
    expect(result).to.be.false();
    clock.tick(2500);
    const resultAfter = isTokenExpired(token);
    expect(resultAfter).to.be.true();
  });

  it('should support retrieved_at provided in seconds', () => {
    const token = {
      retrieved_at: Math.floor(Date.now() / 1000),
      expires_in: 2,
    };
    let result = isTokenExpired(token);
    expect(result).to.be.false();
    clock.tick(2500);
    result = isTokenExpired(token);
    expect(result).to.be.true();
  });

  it('should be expired exactly at the expiry boundary', () => {
    const token = {
      retrieved_at: Date.now(),
      expires_in: 2,
    };
    clock.tick(2000);
    const result = isTokenExpired(token);
    expect(result).to.be.true();
  });
});

describe('Utils :: csPayments :: formatAccessToken', () => {
  it('should format token as "type value"', () => {
    const tokenResponse = { tokenType: 'Bearer', access_token: 'abc123' };
    const result = formatAccessToken(tokenResponse);
    expect(result).to.equal('Bearer abc123');
  });
});
