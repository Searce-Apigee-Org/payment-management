import { errorList } from '@globetel/cxs-core/core/error/messages/index.js';
import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import {
  decodeJWTBody,
  determineChannel,
  extractChannelCode,
  extractDeviceInfo,
  extractUserTokenAndLoginId,
  extractUserUuid,
  getCurrentTimestamp,
  isSessionValid,
  populateRequestBody,
  setQuestIndicatorToN,
  updateSettlementDetailsWithRefund,
  validateAmaxResponse,
} from '../../src/util/buyLoadUtil.js';
import * as constants from '../../src/util/constants.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

const b64url = (obj) =>
  Buffer.from(JSON.stringify(obj))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

const makeJwt = (payloadObj) => {
  const header = { alg: 'none', typ: 'JWT' };
  return `${b64url(header)}.${b64url(payloadObj)}.`;
};

beforeEach(() => {
  Sinon.stub(logger, 'debug');
});

afterEach(() => {
  Sinon.restore();
});

describe('Util :: buyLoadUtil :: isSessionValid', () => {
  it('should return true when lastModifiedDate is within 15 minutes', () => {
    const now = Date.now();
    const param = {
      lastModifiedDate: new Date(now - 5 * 60_000).toISOString(),
    };
    expect(isSessionValid(param)).to.be.true();
  });

  it('should return false when lastModifiedDate is older than 15 minutes', () => {
    const now = Date.now();
    const param = {
      lastModifiedDate: new Date(now - 20 * 60_000).toISOString(),
    };
    expect(isSessionValid(param)).to.be.false();
  });

  it('should return true when lastModifiedDate is in the future and return false when invalid or missing', () => {
    expect(
      isSessionValid({
        lastModifiedDate: new Date(Date.now() + 60_000).toISOString(),
      })
    ).to.be.true();
    expect(isSessionValid({})).to.be.false();
    expect(isSessionValid({ lastModifiedDate: 'bad-date' })).to.be.false();
  });

  it('should return true when lastModifiedDate exists under parameter.lastModifiedDate', () => {
    const now = Date.now();
    const param = {
      parameter: { lastModifiedDate: new Date(now - 60_000).toISOString() },
    };
    expect(isSessionValid(param)).to.be.true();
  });
});

describe('Util :: buyLoadUtil :: getCurrentTimestamp', () => {
  it('should return formatted timestamp string (YYYY-MM-DD[T]HH:mm:ss.SSS)', () => {
    const ts = getCurrentTimestamp();
    const re = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/;
    expect(ts).to.match(re);
  });
});

describe('Util :: buyLoadUtil :: decodeJWTBody', () => {
  it('should return value for key when decoded token payload contains the key', () => {
    const jwt = makeJwt({ uuid: 'user-uuid', foo: 'bar' });
    const token = `Bearer ${jwt}`;
    expect(decodeJWTBody(token, 'uuid')).to.equal('user-uuid');
    expect(decodeJWTBody(token, 'foo')).to.equal('bar');
  });

  it('should return empty string when token or key is missing', () => {
    const jwt = makeJwt({ uuid: 'user-uuid' });
    const token = `Bearer ${jwt}`;
    expect(decodeJWTBody('', 'uuid')).to.equal('');
    expect(decodeJWTBody(token, '')).to.equal('');
    expect(decodeJWTBody(token, 'nope')).to.equal('undefined');
  });
});

describe('Util :: buyLoadUtil :: extractUserTokenAndLoginId', () => {
  it('should extract decoded user JWT and channelLoginId when token contains email', () => {
    const jwt = makeJwt({ email: 'user@example.com', foo: 'bar' });
    const headers = { 'user-token': `Bearer ${jwt}` };

    const res = extractUserTokenAndLoginId(headers);
    expect(res.userToken).to.be.an.object();
    expect(res.userToken.email).to.equal('user@example.com');
    expect(res.userToken.foo).to.equal('bar');
    expect(res.channelLoginId).to.equal('user@example.com');
  });

  it('should extract decoded user JWT and channelLoginId when token contains registrationMobileNumber', () => {
    const jwt = makeJwt({ registrationMobileNumber: '09171234567' });
    const headers = { 'user-token': `Bearer ${jwt}` };

    const res = extractUserTokenAndLoginId(headers);
    expect(res.userToken).to.be.an.object();
    expect(res.userToken.registrationMobileNumber).to.equal('09171234567');
    expect(res.userToken.email).to.equal('');
    expect(res.channelLoginId).to.equal('09171234567');
  });

  it('should return empty strings when header user-token is explicitly null', () => {
    const res = extractUserTokenAndLoginId({ 'user-token': null });
    expect(res.userToken).to.equal('');
    expect(res.channelLoginId).to.equal('');
  });

  it('should return empty values when token is invalid and decodeUserJWT throws', () => {
    const jwt = makeJwt({ any: 'thing' });
    const res = extractUserTokenAndLoginId({ 'user-token': `Bearer ${jwt}` });
    expect(res).to.equal({ userToken: '', channelLoginId: '' });
  });
});

describe('Util :: buyLoadUtil :: extractDeviceInfo', () => {
  it('should return APP platform and uniqueSessionIdentifier when deviceid is present', () => {
    const res = extractDeviceInfo({ deviceid: 'dev-1' });
    expect(res.platforms).to.equal(constants.PLATFORMS.APP);
    expect(res.uniqueSessionIdentifier).to.equal('dev-1');
  });

  it('should return APP with uniqueSessionIdentifier "undefined" when headers lacks deviceid and default to WEB when headers is invalid', () => {
    expect(extractDeviceInfo({})).to.equal({
      platforms: constants.PLATFORMS.APP,
      uniqueSessionIdentifier: 'undefined',
    });
    expect(extractDeviceInfo(null)).to.equal({
      platforms: constants.PLATFORMS.WEB,
    });
  });
});

describe('Util :: buyLoadUtil :: extractUserUuid', () => {
  it('should return uuid when user token contains uuid', () => {
    const jwt = makeJwt({ uuid: 'abc-123' });
    const res = extractUserUuid(`Bearer ${jwt}`);
    expect(res).to.equal('abc-123');
  });

  it('should return null when token is missing or uuid is empty', () => {
    expect(extractUserUuid('')).to.be.null();
    const jwt = makeJwt({ uuid: '' });
    expect(extractUserUuid(`Bearer ${jwt}`)).to.be.null();
  });
});

describe('Util :: buyLoadUtil :: determineChannel', () => {
  it('should return SuperApp when token contains SUPERAPP code', () => {
    expect(determineChannel('order-GLA-123')).to.equal(
      constants.CHANNEL.SUPERAPP
    );
  });

  it('should return GlobeOnline when token contains GLOBE_ONLINE code', () => {
    expect(determineChannel('order-GLE-123')).to.equal(
      constants.CHANNEL.GLOBE_ONLINE
    );
  });

  it('should return CXS code when token does not contain known channel codes', () => {
    expect(determineChannel('order-xyz')).to.equal(constants.CHANNEL_NAME.CXS);
  });
});

describe('Util :: buyLoadUtil :: extractChannelCode', () => {
  it('should return "GLA" for SUPERAPP, "GLE" for GLOBE_ONLINE, else "CXS" when token contains channel codes', () => {
    expect(extractChannelCode('X-GLA-1')).to.equal(
      constants.CHANNEL_NAME.SUPERAPP
    );
    expect(extractChannelCode('X-GLE-1')).to.equal(
      constants.CHANNEL_NAME.GLOBE_ONLINE
    );
    expect(extractChannelCode('X-OTHER-1')).to.equal(
      constants.CHANNEL_NAME.CXS
    );
  });
});

describe('Util :: buyLoadUtil :: updateSettlementDetailsWithRefund', () => {
  it('should set refund only on first settlement when channel is SUPERAPP', () => {
    const paymentEntity = { settlementDetails: [{}, {}] };
    updateSettlementDetailsWithRefund(
      paymentEntity,
      `any-${constants.CHANNEL_NAME.SUPERAPP}-id`,
      '12.34',
      constants.STATUS.PENDING,
      999
    );

    expect(paymentEntity.settlementDetails[0].refund).to.equal({
      amount: 12.34,
      status: constants.STATUS.PENDING,
    });
    expect(paymentEntity.settlementDetails[1].refund).to.be.undefined();
  });

  it('should set refund on all settlements when channel is not SUPERAPP', () => {
    const paymentEntity = { settlementDetails: [{}, {}] };
    updateSettlementDetailsWithRefund(
      paymentEntity,
      'CXS-123',
      '12.34',
      constants.STATUS.PENDING,
      88
    );

    for (const s of paymentEntity.settlementDetails) {
      expect(s.refund).to.equal({
        amount: 88,
        status: constants.STATUS.PENDING,
      });
    }
  });
});

describe('Util :: buyLoadUtil :: setQuestIndicatorToN', () => {
  it('should mark all transactions questIndicator to N when transactions exist', () => {
    const payments = {
      settlementDetails: [{ transactions: [{}, {}] }, { transactions: [{}] }],
    };
    setQuestIndicatorToN(payments);
    for (const d of payments.settlementDetails) {
      for (const t of d.transactions) {
        expect(t.questIndicator).to.equal(constants.QUEST_INDICATOR.N);
      }
    }
  });
});

describe('Util :: buyLoadUtil :: populateRequestBody', () => {
  it('should build request list with voucher, amount, mobileNumber, and products when inputs are valid', () => {
    const entity = {
      tokenPaymentId: 'TP-1',
      paymentType: constants.PAYMENT_TYPES.XENDIT,
      paymentInformation: { type: 'CC_DC' },
      settlementDetails: [
        {
          voucher: { code: 'ABC', category: 'PROMO' },
          mobileNumber: '9171234567',
          transactions: [
            { amount: 50, keyword: 'LOAD50' },
            { amount: 20, keyword: 'LOAD20' },
          ],
        },
      ],
    };

    const list = populateRequestBody(entity);
    expect(Array.isArray(list)).to.be.true();
    expect(list.length).to.equal(1);

    const req = list[0];
    expect(req.paymentReferenceId).to.equal('TP-1');
    expect(req.paymentMethod).to.equal(
      `${constants.PAYMENT_TYPES.XENDIT}${constants.PAYMENT_METHOD_SUFFIX.CCDC}`
    );
    expect(req.voucherCode).to.equal('ABC');
    expect(req.voucherCategory).to.equal('PROMO');
    expect(req.amount).to.equal(20);
    expect(req.products).to.equal([{ keyword: 'LOAD50', amount: 50 }]);
    expect(typeof req.mobileNumber).to.equal('string');
    expect(req.mobileNumber.length).to.be.greaterThan(0);
  });

  it('should skip settlement detail when voucher is null', () => {
    const entity = {
      tokenPaymentId: 'TP-2',
      paymentType: constants.PAYMENT_TYPES.XENDIT,
      paymentInformation: { type: 'CC_DC' },
      settlementDetails: [
        {
          voucher: null,
          mobileNumber: '917',
          transactions: [{ amount: 1, keyword: 'K1' }],
        },
        {
          voucher: { code: 'X', category: 'Y' },
          mobileNumber: '917',
          transactions: [{ amount: 2, keyword: 'K2' }],
        },
      ],
    };

    const list = populateRequestBody(entity);
    expect(list.length).to.equal(1);
    expect(list[0].voucherCode).to.equal('X');
  });
});

describe('Util :: buyLoadUtil :: validateAmaxResponse', () => {
  it('should return {success:true,data} when http status is 200 and statusCode is success', () => {
    const res = validateAmaxResponse({
      status: constants.HTTP_STATUS.SUCCESS,
      data: { statusCode: constants.STATUS_CODE.SUCCESS, hello: 'world' },
    });

    expect(res.success).to.be.true();
    expect(res.data).to.equal({
      statusCode: constants.STATUS_CODE.SUCCESS,
      hello: 'world',
    });
  });

  it('should throw BadGateway object when http status is not 200', () => {
    try {
      validateAmaxResponse({ status: 400, data: {} });
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err).to.be.an.object();
      expect(err.type).to.equal('BadGateway');
    }
  });

  it('should throw BadRequestError when statusCode is not successful', () => {
    try {
      validateAmaxResponse({
        status: constants.HTTP_STATUS.SUCCESS,
        data: { statusCode: '1' },
      });
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err).to.shallow.equal(errorList.BadRequestError);
    }
  });

  it('should throw BadRequestError when statusCode is null', () => {
    try {
      validateAmaxResponse({
        status: constants.HTTP_STATUS.SUCCESS,
        data: { statusCode: null },
      });
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err).to.shallow.equal(errorList.BadRequestError);
    }
  });
});

it('should log and rethrow when populateRequestBody throws due to non-iterable transactions', () => {
  const entity = {
    tokenPaymentId: 'TP-ERR',
    paymentType: constants.PAYMENT_TYPES.XENDIT,
    paymentInformation: { type: 'CC_DC' },
    settlementDetails: [
      {
        voucher: { code: 'X', category: 'Y' },
        mobileNumber: '9171234567',
        transactions: {},
      },
    ],
  };

  try {
    populateRequestBody(entity);
    throw new Error('Expected failure but succeeded');
  } catch (err) {
    Sinon.assert.calledWithMatch(logger.debug, 'populateRequestBody failed');
    expect(err).to.be.an.error();
  }
});

it('should return channelCode when paymentType is XENDIT and type is DIRECT_DEBIT (via populateRequestBody)', () => {
  const entity = {
    tokenPaymentId: 'TP-DD',
    paymentType: constants.PAYMENT_TYPES.XENDIT,
    paymentInformation: { type: 'DIRECT_DEBIT', channelCode: 'UBP' },
    settlementDetails: [
      {
        voucher: { code: 'AA', category: 'BB' },
        mobileNumber: '917',
        transactions: [{ amount: 1, keyword: 'K1' }],
      },
    ],
  };

  const list = populateRequestBody(entity);
  expect(list[0].paymentMethod).to.equal('UBP');
});

it('should return ADYEN_CCDC when paymentType is ADYEN and type is CC_DC (via populateRequestBody)', () => {
  const entity = {
    tokenPaymentId: 'TP-ADYEN-CC',
    paymentType: constants.PAYMENT_TYPES.ADYEN,
    paymentInformation: { type: 'CC_DC' },
    settlementDetails: [
      {
        voucher: { code: 'AA', category: 'BB' },
        mobileNumber: '917',
        transactions: [{ amount: 1, keyword: 'K1' }],
      },
    ],
  };

  const list = populateRequestBody(entity);
  expect(list[0].paymentMethod).to.equal(
    `${constants.PAYMENT_TYPES.ADYEN}${constants.PAYMENT_METHOD_SUFFIX.CCDC}`
  );
});

it('should return undefined when paymentType is ADYEN and type is not CC_DC (via populateRequestBody)', () => {
  const entity = {
    tokenPaymentId: 'TP-ADYEN-NOCC',
    paymentType: constants.PAYMENT_TYPES.ADYEN,
    paymentInformation: { type: 'DIRECT_DEBIT' },
    settlementDetails: [
      {
        voucher: { code: 'AA', category: 'BB' },
        mobileNumber: '917',
        transactions: [{ amount: 1, keyword: 'K1' }],
      },
    ],
  };

  const list = populateRequestBody(entity);
  expect(list[0].paymentMethod).to.be.undefined();
});

it('should return WEB when deviceid is null', () => {
  expect(extractDeviceInfo({ deviceid: null })).to.equal({
    platforms: constants.PLATFORMS.WEB,
  });
});

it('should log and return null when extractUserUuid fails to decode token', () => {
  const throwingToken = {
    toString() {
      throw new Error('boom');
    },
  };

  const res = extractUserUuid(throwingToken);
  expect(res).to.be.null();
  Sinon.assert.calledWithMatch(logger.debug, 'JWT decode failed:');
});

it('should return undefined when paymentType is XENDIT and type is unsupported', () => {
  const entity = {
    tokenPaymentId: 'TP-XENDIT-OTHER',
    paymentType: constants.PAYMENT_TYPES.XENDIT,
    paymentInformation: { type: 'EWALLET' },
    settlementDetails: [
      {
        voucher: { code: 'V', category: 'C' },
        mobileNumber: '917',
        transactions: [{ amount: 1, keyword: 'K' }],
      },
    ],
  };
  const list = populateRequestBody(entity);
  expect(list[0].paymentMethod).to.be.undefined();
});

it('should return undefined when paymentType is unsupported', () => {
  const entity = {
    tokenPaymentId: 'TP-OTHER-PT',
    paymentType: constants.PAYMENT_TYPES.PAYMAYA,
    paymentInformation: { type: 'CC_DC' },
    settlementDetails: [
      {
        voucher: { code: 'V', category: 'C' },
        mobileNumber: '917',
        transactions: [{ amount: 1, keyword: 'K' }],
      },
    ],
  };
  const list = populateRequestBody(entity);
  expect(list[0].paymentMethod).to.be.undefined();
});

it('should return empty values when extractUserTokenAndLoginId token toString throws', () => {
  const headers = {
    'user-token': {
      toString() {
        throw new Error('bad token');
      },
    },
  };
  const res = extractUserTokenAndLoginId(headers);
  expect(res.userToken).to.equal('');
  expect(res.channelLoginId).to.equal('');
});

it('should rethrow when setOneApiPaymentMethod fails due to paymentInformation getter throwing (via populateRequestBody)', () => {
  const entity = {
    tokenPaymentId: 'TP-THROW',
    paymentType: constants.PAYMENT_TYPES.XENDIT,
    get paymentInformation() {
      throw new Error('pi-getter');
    },
    settlementDetails: [
      {
        voucher: { code: 'X', category: 'Y' },
        mobileNumber: '917',
        transactions: [{ amount: 1, keyword: 'K' }],
      },
    ],
  };

  try {
    populateRequestBody(entity);
    throw new Error('Expected failure but succeeded');
  } catch (err) {
    expect(err).to.be.an.error();
    Sinon.assert.calledWithMatch(logger.debug, 'populateRequestBody failed');
  }
});

it('should return empty string when decodeJWTBody key exists but value is null', () => {
  const jwtStr = makeJwt({ foo: null });
  const token = `Bearer ${jwtStr}`;
  expect(decodeJWTBody(token, 'foo')).to.equal('');
});

it('should not set voucher fields when voucher code or category is blank', () => {
  const base = {
    tokenPaymentId: 'TP-X',
    paymentType: constants.PAYMENT_TYPES.XENDIT,
    paymentInformation: { type: 'CC_DC' },
  };

  const entity1 = {
    ...base,
    settlementDetails: [
      {
        voucher: { code: '   ', category: 'PROMO' },
        mobileNumber: '917',
        transactions: [{ amount: 1, keyword: 'K' }],
      },
    ],
  };
  const [req1] = populateRequestBody(entity1);
  expect(req1.voucherCode).to.be.undefined();
  expect(req1.voucherCategory).to.be.undefined();

  const entity2 = {
    ...base,
    settlementDetails: [
      {
        voucher: { code: 'X', category: '   ' },
        mobileNumber: '917',
        transactions: [{ amount: 1, keyword: 'K' }],
      },
    ],
  };
  const [req2] = populateRequestBody(entity2);
  expect(req2.voucherCode).to.be.undefined();
  expect(req2.voucherCategory).to.be.undefined();
});

it('should omit mobileNumber when detail.mobileNumber is null', () => {
  const entity = {
    tokenPaymentId: 'TP-MOB-NONE',
    paymentType: constants.PAYMENT_TYPES.XENDIT,
    paymentInformation: { type: 'CC_DC' },
    settlementDetails: [
      {
        voucher: { code: 'A', category: 'B' },
        mobileNumber: null,
        transactions: [{ amount: 1, keyword: 'K' }],
      },
    ],
  };
  const [req] = populateRequestBody(entity);
  expect(req.mobileNumber).to.be.undefined();
});

it('should set products [] and amount undefined when transactions is undefined', () => {
  const entity = {
    tokenPaymentId: 'TP-NO-TX',
    paymentType: constants.PAYMENT_TYPES.XENDIT,
    paymentInformation: { type: 'CC_DC' },
    settlementDetails: [
      {
        voucher: { code: 'A', category: 'B' },
        mobileNumber: '917',
        transactions: undefined,
      },
    ],
  };
  const [req] = populateRequestBody(entity);
  expect(req.products).to.equal([]);
  expect(req.amount).to.be.undefined();
});

it('should set products [] when first transaction keyword is null', () => {
  const entity = {
    tokenPaymentId: 'TP-NULL-KW',
    paymentType: constants.PAYMENT_TYPES.XENDIT,
    paymentInformation: { type: 'CC_DC' },
    settlementDetails: [
      {
        voucher: { code: 'A', category: 'B' },
        mobileNumber: '917',
        transactions: [{ amount: 50, keyword: null }],
      },
    ],
  };
  const [req] = populateRequestBody(entity);
  expect(req.products).to.equal([]);
  expect(req.amount).to.equal(50);
});

it('should set products [] and leave amount undefined when first transaction amount is null', () => {
  const entity = {
    tokenPaymentId: 'TP-NULL-AMT',
    paymentType: constants.PAYMENT_TYPES.XENDIT,
    paymentInformation: { type: 'CC_DC' },
    settlementDetails: [
      {
        voucher: { code: 'A', category: 'B' },
        mobileNumber: '917',
        transactions: [{ amount: null, keyword: 'K1' }],
      },
    ],
  };
  const [req] = populateRequestBody(entity);
  expect(req.products).to.equal([]);
  expect(req.amount).to.be.undefined();
});

it('should return undefined when paymentType is XENDIT DIRECT_DEBIT and channelCode is empty', () => {
  const entity = {
    tokenPaymentId: 'TP-DD-EMPTY',
    paymentType: constants.PAYMENT_TYPES.XENDIT,
    paymentInformation: { type: 'DIRECT_DEBIT', channelCode: '' },
    settlementDetails: [
      {
        voucher: { code: 'AA', category: 'BB' },
        mobileNumber: '917',
        transactions: [{ amount: 1, keyword: 'K1' }],
      },
    ],
  };
  const [req] = populateRequestBody(entity);
  expect(req.paymentMethod).to.be.undefined();
});

it('should handle missing user-token header when calling extractUserTokenAndLoginId', () => {
  const res1 = extractUserTokenAndLoginId({});
  expect(res1).to.equal({ userToken: '', channelLoginId: '' });

  const res2 = extractUserTokenAndLoginId(123);
  expect(res2).to.equal({ userToken: '', channelLoginId: '' });
});

it('should do nothing when settlementDetails is missing when calling setQuestIndicatorToN', () => {
  const payments = {};
  setQuestIndicatorToN(payments);
  expect(payments).to.equal({});
});

it('should safely handle details.transactions being undefined or null when calling setQuestIndicatorToN', () => {
  const payments = {
    settlementDetails: [
      {},
      { transactions: null },
      { transactions: [] },
      { transactions: [{}, { existing: true }] },
    ],
  };
  setQuestIndicatorToN(payments);
  expect(payments.settlementDetails[3].transactions[0].questIndicator).to.equal(
    constants.QUEST_INDICATOR.N
  );
  expect(payments.settlementDetails[3].transactions[1].questIndicator).to.equal(
    constants.QUEST_INDICATOR.N
  );
});

it('should return empty values when token has neither email nor registrationMobileNumber', () => {
  const jwtStr = makeJwt({ foo: 'bar' });
  const res = extractUserTokenAndLoginId({
    'user-token': `Bearer ${jwtStr}`,
  });
  expect(res.userToken).to.equal('');
  expect(res.channelLoginId).to.equal('');
});

it('should return undefined paymentMethod when paymentInformation is missing (via populateRequestBody)', () => {
  const entity = {
    tokenPaymentId: 'TP-NO-PI',
    paymentType: constants.PAYMENT_TYPES.XENDIT,
    settlementDetails: [
      {
        voucher: { code: 'A', category: 'B' },
        mobileNumber: '917',
        transactions: [{ amount: 1, keyword: 'K' }],
      },
    ],
  };
  const [req] = populateRequestBody(entity);
  expect(req.paymentMethod).to.be.undefined();
});

it('should return undefined paymentMethod when paymentInformation.type is not a string (via populateRequestBody)', () => {
  const entity = {
    tokenPaymentId: 'TP-PI-NONSTR',
    paymentType: constants.PAYMENT_TYPES.XENDIT,
    paymentInformation: { type: 123 },
    settlementDetails: [
      {
        voucher: { code: 'A', category: 'B' },
        mobileNumber: '917',
        transactions: [{ amount: 1, keyword: 'K' }],
      },
    ],
  };
  const [req] = populateRequestBody(entity);
  expect(req.paymentMethod).to.be.undefined();
});

it('should handle non-array settlementDetails and undefined tokenPaymentId when updating settlement details with refund', () => {
  const paymentEntity = { settlementDetails: null };
  updateSettlementDetailsWithRefund(
    paymentEntity,
    undefined,
    '12.34',
    constants.STATUS.PENDING,
    77
  );
  expect(Array.isArray(paymentEntity.settlementDetails)).to.be.true();
  expect(paymentEntity.settlementDetails.length).to.equal(0);
});
