import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import { constants } from '../../../src/util/index.js';
import {
  generateGcashPaymentServiceRequest,
  generateGcashRequest,
} from '../../../src/util/transformers/gcash.js';

const lab = Lab.script();
const { describe, it } = lab;
export { lab };

/**
 * Tests for generateGcashRequest
 */
describe('Util :: Transformers :: GcashTransformer :: generateGcashRequest', () => {
  it('should generate GCASH request with all fields populated', () => {
    const payload = {
      notificationUrls: ['https://notify.url'],
      signAgreementPay: true,
      extendedInformation: { key: 'val' },
      environmentInformation: {
        orderTerminalType: 'APP',
        terminalType: 'MOBILE',
        appVersion: '1.0.0',
        osType: 'iOS',
        clientIp: '127.0.0.1',
        merchantTerminalId: 'M123',
        merchantIp: '10.10.10.10',
        extendedInfo: { region: 'PH' },
      },
      productCode: 'PROD001',
      subMerchantId: 'SUBM001',
      subMerchantName: 'Merchant A',
      order: { orderTitle: 'Order 1', merchantTransId: 'T123' },
      bindingRequestID: 'BIND001',
      budgetProtect: { active: true },
      oonaSkus: ['SKU123', 'SKU456'],
    };

    const result = generateGcashRequest(payload);

    expect(result.notificationUrls).to.equal(['https://notify.url']);
    expect(result.environmentInformation.appVersion).to.equal('1.0.0');
    expect(result.subMerchantId).to.equal('SUBM001');
    expect(result.oonaSkus).to.equal(['SKU123', 'SKU456']);
    expect(result.bindingRequestID).to.equal('BIND001');
  });

  it('should default missing fields to null or empty structures', () => {
    const result = generateGcashRequest({});

    expect(result.notificationUrls).to.be.an.array();
    expect(result.signAgreementPay).to.be.null();
    expect(result.environmentInformation).to.be.an.object();
    expect(result.order).to.be.an.object();
    expect(result.oonaSkus).to.be.an.array();
  });
});

/**
 * Tests for generateGcashPaymentServiceRequest
 */
describe('Util :: Transformers :: GcashTransformer :: generateGcashPaymentServiceRequest', () => {
  it('should generate GCASH payment info correctly', () => {
    const cxsRequest = {
      paymentType: constants.PAYMENT_TYPES.GCASH,
    };

    const gcashRequest = {
      notificationUrls: ['https://notify.url'],
      signAgreementPay: true,
      extendedInformation: { extra: 'info' },
      subMerchantName: 'Merchant A',
      environmentInformation: {
        orderTerminalType: 'APP',
        terminalType: 'MOBILE',
        appVersion: '1.0.0',
        osType: 'iOS',
        clientIp: '127.0.0.1',
        merchantTerminalId: 'M123',
        merchantIp: '10.10.10.10',
        extendedInfo: { device: 'iPhone' },
      },
      order: {
        orderTitle: 'My Order',
        merchantTransId: 'TXN001',
        merchantTransType: 'SALE',
        orderMemo: 'Notes here',
        buyer: { name: 'John' },
        seller: { name: 'Store' },
      },
    };

    const result = generateGcashPaymentServiceRequest(cxsRequest, gcashRequest);

    expect(result.gatewayProcessor).to.equal(
      constants.PAYMENT_TYPES.GCASH.toLowerCase()
    );
    expect(result.gcashPaymentInfo.envInfo.appVersion).to.equal('1.0.0');
    expect(result.gcashPaymentInfo.order.orderTitle).to.equal('My Order');
    expect(result.gcashPaymentInfo.order.merchantTransType).to.equal('SALE');
    expect(result.gcashPaymentInfo.order.orderMemo).to.equal('Notes here');
    expect(result.gcashPaymentInfo.buyer.name).to.equal('John');
    expect(result.gcashPaymentInfo.seller.name).to.equal('Store');
  });

  it('should set all optional values to null when missing', () => {
    const result = generateGcashPaymentServiceRequest({}, {});

    expect(result.gcashPaymentInfo.envInfo.orderTerminalType).to.be.null();
    expect(result.gcashPaymentInfo.order.orderTitle).to.be.null();
    // Optional fields are omitted (undefined) when missing/blank, aligning with
    // legacy Java behavior (@JsonInclude NON_NULL).
    expect(result.gcashPaymentInfo.subMerchantName).to.be.undefined();
    expect(result.gcashPaymentInfo.extendedInfo).to.be.undefined();
  });

  it('should handle partially filled environmentInformation safely', () => {
    const gcashRequest = {
      environmentInformation: { terminalType: 'WEB' },
      order: { orderTitle: 'OrderX' },
    };

    const result = generateGcashPaymentServiceRequest({}, gcashRequest);

    expect(result.gcashPaymentInfo.envInfo.terminalType).to.equal('WEB');
    expect(result.gcashPaymentInfo.order.orderTitle).to.equal('OrderX');
  });
});
