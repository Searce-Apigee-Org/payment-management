import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import { constants } from '../../../src/util/index.js';
import {
  generateAdyenPaymentServiceRequest,
  generateAdyenSDKRequest,
} from '../../../src/util/transformers/adyenSDK.js';

const lab = Lab.script();
const { describe, it } = lab;
export { lab };

describe('Util :: Transformers :: AdyenSDKTransformer :: generateAdyenSDKRequest', () => {
  it('should generate full Adyen SDK request with all fields', () => {
    const request = {
      allowedPaymentMethods: ['card', 'gcash'],
      blockedPaymentMethods: ['paypal'],
      tokenSDK: 'tok123',
      platform: 'WEB',
      returnUrl: 'https://return.url',
      origin: 'https://origin.url',
      shopperLocale: 'en_PH',
      browserInformation: {
        acceptHeader: 'application/json',
        colorDepth: 24,
        javaEnabled: true,
        language: 'en',
        screenHeight: 1080,
        screenWidth: 1920,
        timeZoneOffset: -480,
        userAgent: 'Mozilla/5.0',
      },
      captureDelayHours: 1,
      configuration: { key: 'value' },
      dccQuote: { rate: 1.23 },
      enableOneClick: true,
      enablePayOut: false,
      enableRecurring: true,
      entityType: 'BUY_PROMO',
      fraudOffset: 5,
      lineItems: [{ name: 'Item1', amount: 100 }],
      mcc: '1234',
      merchantData: 'merchant123',
      merchantOrderReference: 'order123',
      metadata: 'meta',
      orderReference: 'order-ref',
      customer: { name: 'John' },
      splitList: [{ part: 1 }],
      trustedShopper: true,
      deliveryDate: '2025-11-06',
    };

    const result = generateAdyenSDKRequest(request);

    expect(result.allowedPaymentMethods).to.equal(['card', 'gcash']);
    expect(result.blockedPaymentMethods).to.equal(['paypal']);
    expect(result.tokenSDK).to.equal('tok123');
    expect(result.browserInformation.userAgent).to.equal('Mozilla/5.0');
    expect(result.configuration).to.equal({ key: 'value' });
    expect(result.customer.name).to.equal('John');
    expect(result.deliveryDate).to.equal('2025-11-06');
  });

  it('should handle missing optional fields gracefully', () => {
    const result = generateAdyenSDKRequest({});

    expect(result.allowedPaymentMethods).to.be.an.array();
    expect(result.blockedPaymentMethods).to.be.an.array();
    expect(result.browserInformation).to.be.an.object();
    expect(result.platform).to.be.null();
    expect(result.tokenSDK).to.be.null();
    expect(result.origin).to.be.null();
  });

  it('should default nested browserInformation properties to null', () => {
    const result = generateAdyenSDKRequest({ browserInformation: {} });

    const info = result.browserInformation;
    expect(info.acceptHeader).to.be.null();
    expect(info.userAgent).to.be.null();
    expect(info.colorDepth).to.be.null();
    expect(info.language).to.be.null();
  });
});

/**
 * Tests for generateAdyenPaymentServiceRequest
 */
describe('Util :: Transformers :: AdyenSDKTransformer :: generateAdyenPaymentServiceRequest', () => {
  it('should build valid Adyen payment info', () => {
    const cxsRequest = {
      countryCode: 'PH',
      currency: 'PHP',
    };

    const cxsAdyenRequest = {
      returnUrl: 'https://return.url',
      origin: 'https://origin.url',
      browserInformation: {
        acceptHeader: 'application/json',
        colorDepth: 32,
        javaEnabled: true,
        language: 'en',
        screenHeight: 1080,
        screenWidth: 1920,
        timeZoneOffset: -480,
        userAgent: 'Mozilla/5.0',
      },
      entityType: 'BUY_PROMO',
      shopperLocale: 'en_PH',
      orderReference: 'order123',
      metadata: 'meta123',
      platform: 'WEB',
    };

    const result = generateAdyenPaymentServiceRequest(
      cxsRequest,
      cxsAdyenRequest
    );

    expect(result.gatewayProcessor).to.equal(
      constants.PAYMENT_TYPES.ADYEN.toLowerCase()
    );
    expect(result.adyenPaymentInfo.countryCode).to.equal('PH');
    expect(result.adyenPaymentInfo.amountCurrency).to.equal('PHP');
    expect(result.adyenPaymentInfo.returnUrl).to.equal('https://return.url');
    expect(result.adyenPaymentInfo.platform).to.equal('WEB');
    expect(result.adyenPaymentInfo.browserInfo.userAgent).to.equal(
      'Mozilla/5.0'
    );
    expect(result.adyenPaymentInfo.lang).to.equal('en');
  });

  it('should trim fields and assign only when non-empty', () => {
    const cxsRequest = {};
    const cxsAdyenRequest = {
      entityType: '  BUY_PROMO ',
      shopperLocale: ' en_PH ',
      orderReference: ' order123 ',
      metadata: ' meta ',
      platform: ' WEB ',
      browserInformation: { language: ' en ' },
    };

    const result = generateAdyenPaymentServiceRequest(
      cxsRequest,
      cxsAdyenRequest
    );

    expect(result.adyenPaymentInfo.entityType).to.equal('BUY_PROMO');
    expect(result.adyenPaymentInfo.shopperLocale).to.equal('en_PH');
    expect(result.adyenPaymentInfo.orderReference).to.equal('order123');
    expect(result.adyenPaymentInfo.metadata).to.equal('meta');
    expect(result.adyenPaymentInfo.platform).to.equal('WEB');
    expect(result.adyenPaymentInfo.lang).to.equal('en');
  });

  it('should handle missing optional fields safely', () => {
    const result = generateAdyenPaymentServiceRequest({}, {});

    expect(result.adyenPaymentInfo.countryCode).to.be.null();
    expect(result.adyenPaymentInfo.amountCurrency).to.be.null();
    expect(result.adyenPaymentInfo.returnUrl).to.be.null();
    expect(result.adyenPaymentInfo.origin).to.be.null();
  });
});
