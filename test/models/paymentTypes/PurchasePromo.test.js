import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import sinon from 'sinon';
import { validatePurchasePromoRequest } from '../../../src/models/paymentTypes/PurchasePromo.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;
export { lab };

describe('Util :: RequestValidator :: PurchasePromoValidator :: validatePurchasePromoRequest', () => {
  let validPayload;

  beforeEach(() => {
    validPayload = [
      {
        keyword: 'PROMO123',
        amount: 100,
      },
      {
        serviceId: '12345',
        amount: 50,
      },
      {
        serviceId: '12345',
        param: 'PARAM001',
        amount: 0,
      },
    ];
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should pass with valid payloads', () => {
    const result = validatePurchasePromoRequest(validPayload);
    expect(result).to.exist();
    expect(result).to.be.an.array();
  });

  it('should throw InsufficientParameters when payload is empty array', () => {
    try {
      validatePurchasePromoRequest([]);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('InsufficientParameters');
    }
  });

  it('should throw InvalidParameter when amount < 1 and serviceId/param missing', () => {
    const payload = [
      {
        keyword: 'PROMO123',
        amount: 0,
      },
    ];
    try {
      validatePurchasePromoRequest(payload);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
    }
  });

  it('should throw InvalidParameter when amount < 0 and serviceId+param provided', () => {
    const payload = [
      {
        serviceId: '12345',
        param: 'PARAM1',
        amount: -5,
      },
    ];
    try {
      validatePurchasePromoRequest(payload);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
    }
  });

  it('should pass when serviceId and param provided and amount = 0', () => {
    const payload = [
      {
        serviceId: '98765',
        param: 'ABC',
        amount: 0,
      },
    ];
    const result = validatePurchasePromoRequest(payload);
    expect(result).to.exist();
    expect(result[0].amount).to.equal(0);
  });

  it('should throw InvalidParameter when all of keyword, serviceId, and param missing', () => {
    const payload = [
      {
        amount: 50,
      },
    ];
    try {
      validatePurchasePromoRequest(payload);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
    }
  });

  it('should throw InvalidParameter when both keyword and serviceId provided', () => {
    const payload = [
      {
        keyword: 'PROMO',
        serviceId: '1234',
        amount: 10,
      },
    ];
    try {
      validatePurchasePromoRequest(payload);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
    }
  });

  it('should pass when booster array is valid', () => {
    const payload = [
      {
        serviceId: '12345',
        param: 'PARAM1',
        amount: 10,
        booster: [
          { sid: 'B1', param: 'Boost1' },
          { sid: 'B2', param: 'Boost2' },
        ],
      },
    ];
    const result = validatePurchasePromoRequest(payload);
    expect(result).to.exist();
    expect(result[0].booster).to.be.an.array();
  });

  it('should throw InvalidParameter when booster array has invalid structure', () => {
    const payload = [
      {
        serviceId: '12345',
        param: 'PARAM1',
        amount: 10,
        booster: [{ sid: '', param: '' }],
      },
    ];
    try {
      validatePurchasePromoRequest(payload);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
    }
  });

  it('should throw InvalidParameter when object has unknown fields', () => {
    const payload = [
      {
        serviceId: '12345',
        param: 'PARAM',
        amount: 10,
        randomField: 'notAllowed',
      },
    ];
    try {
      validatePurchasePromoRequest(payload);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
    }
  });
});
