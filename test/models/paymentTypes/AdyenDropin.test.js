import { expect } from '@hapi/code';
import Lab from '@hapi/lab';

import {
  processAdyenDropinRequest,
  validateAdyenDropinRequest,
} from '../../../src/models/paymentTypes/AdyenDropin.js';
import { constants } from '../../../src/util/index.js';

const lab = Lab.script();
const { describe, it } = lab;
export { lab };

describe('Util :: RequestValidator :: AdyenDropinRequestValidator :: validateAdyenDropinRequest', () => {
  it('should pass with valid payload', () => {
    const payload = {
      shopperLocale: 'en_PH',
      browserInformation: { acceptHeader: 'text/html', userAgent: 'Mozilla' },
      responseUrl: 'https://return.url',
      entityType: 'SA-BPROMO',
      shopperReference: '12345',
    };

    const result = validateAdyenDropinRequest(payload);
    expect(result.shopperLocale).to.equal('en_PH');
  });

  it('should throw InsufficientParameters when missing required fields', () => {
    const payload = {};
    expect(() => validateAdyenDropinRequest(payload)).to.throw();
  });

  it('should throw InvalidParameter when browserInformation has extra field', () => {
    const payload = {
      shopperLocale: 'en_PH',
      browserInformation: {
        acceptHeader: 'text/html',
        userAgent: 'Mozilla',
        extra: 'nope',
      },
      responseUrl: 'https://return.url',
    };

    expect(() => validateAdyenDropinRequest(payload)).to.throw();
  });
});

describe('Util :: RequestValidator :: AdyenDropinRequestValidator :: processAdyenDropinRequest', () => {
  const settlementInfo = {
    requestType: constants.PAYMENT_REQUEST_TYPES.BUY_PROMO,
    transactions: [{ keyword: 'a', wallet: '' }],
  };

  it('should pass for BUY_PROMO with valid entityType', async () => {
    const payload = { entityType: constants.PAYMENT_ENTITY_TYPES.ENTITY_PROMO };
    await expect(
      processAdyenDropinRequest(payload, settlementInfo)
    ).to.not.reject();
  });

  it('should throw InsufficientParameters when entityType is missing', async () => {
    const payload = {};
    const settlement = {
      requestType: constants.PAYMENT_REQUEST_TYPES.BUY_PROMO,
      transactions: [],
    };
    await expect(processAdyenDropinRequest(payload, settlement)).to.reject();
  });

  it('should throw InvalidOutboundRequest when entityType mismatches for BUY_PROMO', async () => {
    const payload = { entityType: 'WRONG' };
    await expect(
      processAdyenDropinRequest(payload, settlementInfo)
    ).to.reject();
  });

  it('should pass for ECPAY with valid entityType', async () => {
    const payload = { entityType: constants.PAYMENT_ENTITY_TYPES.ENTITY_ECPAY };
    const settlement = {
      requestType: constants.PAYMENT_REQUEST_TYPES.ECPAY,
      transactions: [],
    };
    await expect(
      processAdyenDropinRequest(payload, settlement)
    ).to.not.reject();
  });

  it('should throw InvalidOutboundRequest for ECPAY when entityType mismatches', async () => {
    const payload = { entityType: 'WRONG' };
    const settlement = {
      requestType: constants.PAYMENT_REQUEST_TYPES.ECPAY,
      transactions: [],
    };
    await expect(processAdyenDropinRequest(payload, settlement)).to.reject();
  });

  it('should pass for BUY_LOAD with matching ENTITY_LOAD', async () => {
    const payload = { entityType: constants.PAYMENT_ENTITY_TYPES.ENTITY_LOAD };
    const settlement = {
      requestType: constants.PAYMENT_REQUEST_TYPES.BUY_LOAD,
      transactions: [{ keyword: 'x', wallet: '' }],
    };
    await expect(
      processAdyenDropinRequest(payload, settlement)
    ).to.not.reject();
  });

  it('should throw InvalidOutboundRequest for BUY_LOAD with mismatched entityType', async () => {
    const payload = { entityType: 'INVALID_TYPE' };
    const settlement = {
      requestType: constants.PAYMENT_REQUEST_TYPES.BUY_LOAD,
      transactions: [{ keyword: 'x', wallet: '' }],
    };
    await expect(processAdyenDropinRequest(payload, settlement)).to.reject();
  });
});
