import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import { constants } from '../../src/util/index.js';
import { validateXenditRequest } from '../../src/util/xenditUtil.js';

const lab = Lab.script();
const { describe, it } = lab;
export { lab };

describe('Util :: XenditUtil :: validateXenditRequest', () => {
  const {
    XENDIT_PAYMENT_METHODS: { TYPE_EWALLET, TYPE_CC_DC, TYPE_DIRECT_DEBIT },
    XENDIT_PAYMENT_OPTIONS: {
      CHANNEL_CODE_PAYMAYA,
      CHANNEL_CODE_GRABPAY,
      CHANNEL_CODE_BPI,
      CHANNEL_CODE_RCBC,
      CHANNEL_CODE_UBP,
    },
    PAYMENT_REQUEST_TYPES: { BUY_PROMO, BBPREPAIDPROMO },
    PAYMENT_TYPES: { XENDIT },
  } = constants;

  const baseReq = {
    app: {
      channel: 'superapp',
      cxsRequest: {
        paymentType: XENDIT,
        settlementInformation: [{ requestType: BUY_PROMO }],
      },
      headers: { 'user-token': 'token' },
    },
  };

  it('should pass TYPE_EWALLET with PAYMAYA having valid URLs', () => {
    const req = JSON.parse(JSON.stringify(baseReq));
    const xenditReq = {
      type: TYPE_EWALLET,
      channelCode: CHANNEL_CODE_PAYMAYA,
      eWallet: {
        cancelUrl: 'https://a.com',
        failureUrl: 'https://b.com',
      },
    };
    expect(() => validateXenditRequest(req, xenditReq)).to.not.throw();
  });

  it('should throw if TYPE_EWALLET is missing channelCode', () => {
    const req = JSON.parse(JSON.stringify(baseReq));
    const xenditReq = {
      type: TYPE_EWALLET,
      eWallet: {
        cancelUrl: 'https://a.com',
        failureUrl: 'https://b.com',
      },
    };
    expect(() => validateXenditRequest(req, xenditReq)).to.throw();
  });

  it('should throw if TYPE_EWALLET is missing eWallet object', () => {
    const req = JSON.parse(JSON.stringify(baseReq));
    const xenditReq = {
      type: TYPE_EWALLET,
      channelCode: CHANNEL_CODE_PAYMAYA,
    };
    expect(() => validateXenditRequest(req, xenditReq)).to.throw();
  });

  it('should throw if PAYMAYA cancelUrl or failureUrl missing', () => {
    const req = JSON.parse(JSON.stringify(baseReq));
    const xenditReq = {
      type: TYPE_EWALLET,
      channelCode: CHANNEL_CODE_PAYMAYA,
      eWallet: {
        failureUrl: 'https://b.com',
      },
    };
    expect(() => validateXenditRequest(req, xenditReq)).to.throw();
  });

  it('should throw if PAYMAYA cancelUrl or failureUrl blank', () => {
    const req = JSON.parse(JSON.stringify(baseReq));
    const xenditReq = {
      type: TYPE_EWALLET,
      channelCode: CHANNEL_CODE_PAYMAYA,
      eWallet: {
        cancelUrl: '   ',
        failureUrl: '',
      },
    };
    expect(() => validateXenditRequest(req, xenditReq)).to.throw();
  });

  it('should throw if GRABPAY failureUrl missing', () => {
    const req = JSON.parse(JSON.stringify(baseReq));
    const xenditReq = {
      type: TYPE_EWALLET,
      channelCode: CHANNEL_CODE_GRABPAY,
      eWallet: {},
    };
    expect(() => validateXenditRequest(req, xenditReq)).to.throw();
  });

  it('should throw if GRABPAY failureUrl blank', () => {
    const req = JSON.parse(JSON.stringify(baseReq));
    const xenditReq = {
      type: TYPE_EWALLET,
      channelCode: CHANNEL_CODE_GRABPAY,
      eWallet: {
        failureUrl: '   ',
      },
    };
    expect(() => validateXenditRequest(req, xenditReq)).to.throw();
  });

  it('should pass TYPE_CC_DC with valid paymentMethodId', () => {
    const req = JSON.parse(JSON.stringify(baseReq));
    const xenditReq = { type: TYPE_CC_DC, paymentMethodId: 'PM123' };
    expect(() => validateXenditRequest(req, xenditReq)).to.not.throw();
  });

  it('should throw TYPE_CC_DC if missing paymentMethodId', () => {
    const req = JSON.parse(JSON.stringify(baseReq));
    const xenditReq = { type: TYPE_CC_DC };
    expect(() => validateXenditRequest(req, xenditReq)).to.throw();
  });

  it('should throw TYPE_CC_DC if paymentMethodId is blank', () => {
    const req = JSON.parse(JSON.stringify(baseReq));
    const xenditReq = { type: TYPE_CC_DC, paymentMethodId: '   ' };
    expect(() => validateXenditRequest(req, xenditReq)).to.throw();
  });

  it('should throw TYPE_CC_DC if contains directDebit', () => {
    const req = JSON.parse(JSON.stringify(baseReq));
    const xenditReq = {
      type: TYPE_CC_DC,
      paymentMethodId: 'PM123',
      directDebit: {},
    };
    expect(() => validateXenditRequest(req, xenditReq)).to.throw();
  });

  it('should throw TYPE_CC_DC if contains eWallet', () => {
    const req = JSON.parse(JSON.stringify(baseReq));
    const xenditReq = {
      type: TYPE_CC_DC,
      paymentMethodId: 'PM123',
      eWallet: {},
    };
    expect(() => validateXenditRequest(req, xenditReq)).to.throw();
  });

  it('should throw TYPE_CC_DC when requestType is BBPREPAIDPROMO', () => {
    const req = JSON.parse(JSON.stringify(baseReq));
    req.app.cxsRequest.settlementInformation[0].requestType = BBPREPAIDPROMO;

    const xenditReq = {
      type: TYPE_CC_DC,
      paymentMethodId: 'PM123',
    };

    expect(() => validateXenditRequest(req, xenditReq)).to.throw();
  });

  it('should pass TYPE_DIRECT_DEBIT with valid data', () => {
    const req = JSON.parse(JSON.stringify(baseReq));
    const xenditReq = {
      type: TYPE_DIRECT_DEBIT,
      channelCode: CHANNEL_CODE_BPI,
      directDebit: {
        failureUrl: 'https://f.com',
        successUrl: 'https://s.com',
      },
    };
    expect(() => validateXenditRequest(req, xenditReq)).to.not.throw();
  });

  it('should throw TYPE_DIRECT_DEBIT with invalid channel code', () => {
    const req = JSON.parse(JSON.stringify(baseReq));
    const xenditReq = {
      type: TYPE_DIRECT_DEBIT,
      channelCode: 'INVALID',
      directDebit: {
        failureUrl: 'https://f.com',
        successUrl: 'https://s.com',
      },
    };
    expect(() => validateXenditRequest(req, xenditReq)).to.throw();
  });

  it('should throw TYPE_DIRECT_DEBIT if paymentMethodId is present', () => {
    const req = JSON.parse(JSON.stringify(baseReq));
    const xenditReq = {
      type: TYPE_DIRECT_DEBIT,
      channelCode: CHANNEL_CODE_RCBC,
      paymentMethodId: 'PM123',
      directDebit: {
        failureUrl: 'https://f.com',
        successUrl: 'https://s.com',
      },
    };
    expect(() => validateXenditRequest(req, xenditReq)).to.throw();
  });

  it('should throw TYPE_DIRECT_DEBIT if missing directDebit object', () => {
    const req = JSON.parse(JSON.stringify(baseReq));
    const xenditReq = {
      type: TYPE_DIRECT_DEBIT,
      channelCode: CHANNEL_CODE_RCBC,
    };
    expect(() => validateXenditRequest(req, xenditReq)).to.throw();
  });

  it('should throw TYPE_DIRECT_DEBIT if directDebit URLs are blank', () => {
    const req = JSON.parse(JSON.stringify(baseReq));
    const xenditReq = {
      type: TYPE_DIRECT_DEBIT,
      channelCode: CHANNEL_CODE_BPI,
      directDebit: {
        failureUrl: '   ',
        successUrl: '',
      },
    };
    expect(() => validateXenditRequest(req, xenditReq)).to.throw();
  });

  it('should throw TYPE_DIRECT_DEBIT if eWallet present', () => {
    const req = JSON.parse(JSON.stringify(baseReq));
    const xenditReq = {
      type: TYPE_DIRECT_DEBIT,
      channelCode: CHANNEL_CODE_RCBC,
      directDebit: {
        failureUrl: 'https://f.com',
        successUrl: 'https://s.com',
      },
      eWallet: {},
    };
    expect(() => validateXenditRequest(req, xenditReq)).to.throw();
  });

  it('should throw TYPE_DIRECT_DEBIT if missing user-token', () => {
    const req = JSON.parse(JSON.stringify(baseReq));
    delete req.app.headers['user-token'];
    const xenditReq = {
      type: TYPE_DIRECT_DEBIT,
      channelCode: CHANNEL_CODE_UBP,
      directDebit: {
        failureUrl: 'https://f.com',
        successUrl: 'https://s.com',
      },
    };
    expect(() => validateXenditRequest(req, xenditReq)).to.throw();
  });

  it('should throw InvalidParameter when requestType is not valid for Xendit', () => {
    const req = JSON.parse(JSON.stringify(baseReq));
    req.app.cxsRequest.settlementInformation[0].requestType =
      'SOME_INVALID_TYPE';

    const xenditReq = {
      type: TYPE_CC_DC,
      paymentMethodId: 'PM123',
    };

    expect(() => validateXenditRequest(req, xenditReq)).to.throw();
  });

  it('should throw InvalidParameter when channel is invalid for Xendit payment type', () => {
    const req = JSON.parse(JSON.stringify(baseReq));
    req.app.channel = 'invalid-channel';

    const xenditReq = {
      type: TYPE_CC_DC,
      paymentMethodId: 'PM123',
    };

    expect(() => validateXenditRequest(req, xenditReq)).to.throw();
  });
});
