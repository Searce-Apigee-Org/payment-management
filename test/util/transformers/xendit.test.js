import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import {
  generateXenditBasePaymentInfo,
  generateXenditDnoRequest,
  generateXenditRequest,
} from '../../../src/util/transformers/xendit.js';

const lab = Lab.script();
const { describe, it } = lab;
export { lab };

describe('Util :: Transformers :: XenditTransformer :: generateXenditDnoRequest', () => {
  it('should generate valid DNO Xendit request with ewallet and directDebit', () => {
    const dnoXenditRequest = {
      type: 'EWALLET',
      channelCode: 'PAYMAYA',
      productName: 'XENDIT_PRODUCT',
      eWallet: {
        cancelUrl: 'cancel',
        failureUrl: 'fail',
        successUrl: 'success',
      },
      reusability: 'MULTIPLE_USE',
      paymentMethodId: 'pm123',
      customerUuid: 'uuid-1',
      directDebit: { failureUrl: 'fail', successUrl: 'ok' },
    };

    const result = generateXenditDnoRequest(dnoXenditRequest);

    expect(result.type).to.equal('EWALLET');
    expect(result.channelCode).to.equal('PAYMAYA');
    expect(result.productName).to.equal('XENDIT_PRODUCT');
    expect(result.reusability).to.equal('MULTIPLE_USE');
    expect(result.eWallet.cancelUrl).to.equal('cancel');
    expect(result.directDebit.successUrl).to.equal('ok');
  });

  it('should default missing fields to null and reusability ONE_TIME_USE', () => {
    const result = generateXenditDnoRequest({});
    expect(result.type).to.be.null();
    expect(result.eWallet).to.be.null();
    expect(result.directDebit).to.be.null();
    expect(result.reusability).to.equal('ONE_TIME_USE');
  });
});

describe('Util :: Transformers :: XenditTransformer :: generateXenditRequest', () => {
  it('should build Xendit request with nested ewallet and directDebit fields', () => {
    const request = {
      type: 'EWALLET',
      channelCode: 'GRABPAY',
      productName: 'PROMO',
      eWallet: { cancelUrl: 'cancel', failureUrl: 'fail', successUrl: 'ok' },
      reusability: 'MULTIPLE_USE',
      paymentMethodId: 'pay001',
      customerUuid: 'cust123',
      directDebit: { failureUrl: 'fail2', successUrl: 'ok2' },
      budgetProtect: { enabled: true },
      oonaSkus: ['sku1', 'sku2'],
    };

    const result = generateXenditRequest(request);

    expect(result.type).to.equal('EWALLET');
    expect(result.channelCode).to.equal('GRABPAY');
    expect(result.eWallet.failureUrl).to.equal('fail');
    expect(result.directDebit.successUrl).to.equal('ok2');
    expect(result.oonaSkus).to.include('sku1');
  });

  it('should NOT attach directDebit/eWallet objects for CC_DC', () => {
    const request = {
      type: 'CC_DC',
      productName: 'SA-LOAD',
      paymentMethodId: '698c47ece2da88a22a2fd96c',
      reusability: 'ONE_TIME_USE',
    };

    const result = generateXenditRequest(request);

    expect(result.type).to.equal('CC_DC');
    expect(result.paymentMethodId).to.equal('698c47ece2da88a22a2fd96c');
    expect(result).to.not.include(['directDebit']);
    expect(result).to.not.include(['eWallet']);
  });

  it('should default all optional values correctly', () => {
    const result = generateXenditRequest({});
    expect(result.eWallet.cancelUrl).to.be.undefined();
    expect(result.directDebit.failureUrl).to.be.null();
    expect(result.type).to.be.null();
    expect(result.oonaSkus).to.be.an.array();
  });
});

describe('Util :: Transformers :: XenditTransformer :: generateXenditBasePaymentInfo', () => {
  it('should generate correct base payment info for Xendit', () => {
    const cxsRequest = { paymentType: 'XENDIT', currency: 'PHP' };
    const xenditRequest = {
      type: 'DIRECT_DEBIT',
      channelCode: 'BPI',
      productName: 'LOAD',
      eWallet: { failureUrl: 'fail' },
      reusability: 'MULTIPLE_USE',
    };

    const result = generateXenditBasePaymentInfo(cxsRequest, xenditRequest);

    expect(result.gatewayProcessor).to.equal('generic');
    // Payment Service contract expects paymentMethod in [dropin, card, paybylink, gcash].
    expect(result.paymentInfo.paymentMethod).to.equal('xendit');
    expect(result.paymentInfo.currency).to.equal('PHP');
    expect(result.paymentInfo.type).to.equal('DIRECT_DEBIT');
    expect(result.paymentInfo.channelCode).to.equal('BPI');
    expect(result.paymentInfo.productName).to.equal('LOAD');
    expect(result.paymentInfo.reusability).to.equal('MULTIPLE_USE');
  });

  it('should handle null and missing properties safely', () => {
    const result = generateXenditBasePaymentInfo({}, {});
    // channelCode should be omitted when missing/null
    expect(result.paymentInfo).to.not.include(['channelCode']);
    expect(result.paymentInfo.reusability).to.be.null();
  });
});
