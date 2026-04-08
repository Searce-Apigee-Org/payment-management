import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import { constants } from '../../../src/util/index.js';
import {
  generateAdyenDropinRequest,
  generateDropinPaymentServiceRequest,
} from '../../../src/util/transformers/adyenDropin.js';

const lab = Lab.script();
const { describe, it } = lab;
export { lab };

describe('Util :: Transformers :: AdyenDropinTransformer :: generateAdyenDropinRequest', () => {
  it('should generate request with all fields', () => {
    const request = {
      platform: 'WEB',
      shopperLocale: 'en_PH',
      browserInformation: {
        userAgent: 'Mozilla/5.0',
        acceptHeader: 'text/html',
      },
      responseUrl: 'https://callback.url',
      entityType: 'BUY_PROMO',
      shopperReference: 'uuid-123',
    };

    const result = generateAdyenDropinRequest(request);

    expect(result).to.equal({
      platform: 'WEB',
      shopperLocale: 'en_PH',
      browserInformation: {
        userAgent: 'Mozilla/5.0',
        acceptHeader: 'text/html',
      },
      responseUrl: 'https://callback.url',
      entityType: 'BUY_PROMO',
      shopperReference: 'uuid-123',
    });
  });

  it('should default missing optional fields to null', () => {
    const request = { shopperLocale: 'en_PH' };
    const result = generateAdyenDropinRequest(request);

    expect(result.platform).to.be.null();
    expect(result.responseUrl).to.be.null();
    expect(result.entityType).to.be.null();
    expect(result.shopperReference).to.be.null();
    expect(result.shopperLocale).to.equal('en_PH');
    expect(result.browserInformation).to.be.an.object();
  });
});

describe('Util :: Transformers :: AdyenDropinTransformer :: generateDropinPaymentServiceRequest', () => {
  it('should generate correct paymentInfo and gatewayProcessor', () => {
    const cxsRequest = {
      currency: 'PHP',
      countryCode: 'PH',
    };

    const dropinRequest = {
      platform: 'WEB',
      shopperLocale: 'en_PH',
      responseUrl: 'https://return.url',
      browserInformation: {
        userAgent: 'Mozilla/5.0',
        acceptHeader: 'application/json',
      },
      entityType: 'BUY_PROMO',
      shopperReference: 'uuid-321',
    };

    const result = generateDropinPaymentServiceRequest(
      cxsRequest,
      dropinRequest
    );

    expect(result.gatewayProcessor).to.equal('generic');
    expect(result.paymentInfo.currency).to.equal('PHP');
    expect(result.paymentInfo.countryCode).to.equal('PH');
    expect(result.paymentInfo.paymentMethod).to.equal(
      constants.PAYMENT_TYPES.DROPIN.toLowerCase()
    );
    expect(result.paymentInfo.platform).to.equal('WEB');
    expect(result.paymentInfo.responseURL).to.equal('https://return.url');
    expect(result.paymentInfo.browserInfo.userAgent).to.equal('Mozilla/5.0');
    expect(result.paymentInfo.browserInfo.acceptHeader).to.equal(
      'application/json'
    );
    expect(result.paymentInfo.entityType).to.equal('BUY_PROMO');
    expect(result.paymentInfo.shopperReference).to.equal('uuid-321');
  });

  it('should trim fields and handle missing optional data', () => {
    const cxsRequest = {};
    const dropinRequest = {
      platform: ' WEB ',
      shopperLocale: 'en_PH',
      responseUrl: ' https://test.url ',
      browserInformation: {},
    };

    const result = generateDropinPaymentServiceRequest(
      cxsRequest,
      dropinRequest
    );

    expect(result.paymentInfo.platform).to.equal('WEB');
    expect(result.paymentInfo.responseURL).to.equal('https://test.url');
    expect(result.paymentInfo.browserInfo).to.exist();
  });

  it('should set null for missing fields', () => {
    const cxsRequest = {};
    const dropinRequest = {};

    const result = generateDropinPaymentServiceRequest(
      cxsRequest,
      dropinRequest
    );

    expect(result.paymentInfo.currency).to.be.null();
    expect(result.paymentInfo.countryCode).to.be.null();
    expect(result.paymentInfo.platform).to.be.null();
    expect(result.paymentInfo.responseURL).to.be.null();
    expect(result.paymentInfo.paymentMethod).to.equal(
      constants.PAYMENT_TYPES.DROPIN.toLowerCase()
    );
  });
});
