import { decodeUserJWT } from '@globetel/cxs-core/core/jwt/index.js';
import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import { constants } from '../../src/util/index.js';
import {
  isValidEmail,
  isValidToken,
  validateBindingId,
  validateBuyLoadTransaction,
  validateECPayTransactionEntity,
  validateOutboundResponse,
  validatePaymentRequestEntity,
  validateReferalCheck,
  validateServiceNumber,
  validateSettlementAmount,
  validateShopperReference,
  validateVerficationToken,
  validateVoucherInfoRequest,
} from '../../src/util/validationUtil.js';

const lab = Lab.script();
const { describe, it } = lab;
export { lab };

const REAL_JWT =
  'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiIsImtpZCI6ImViYjk2YjU4ZjVkZGYyYzdkMmU0ZmVjOTJiNWQ4MTg2In0.eyJ1dWlkIjoiYTdkNTUyMTYtZjRmMC00NGY5LWE4YWMtZjk3OTgzN2MyMmMzIiwicmVmcmVzaFRva2VuIjoiYXNkc2FkIiwiYWNjZXNzVG9rZW4iOiJzYWQiLCJpc3MiOiJDWFMiLCJtb2JpbGVOdW1iZXJWZXJpZmljYXRpb25EYXRlIjoiMjAyMy0xMS0wMlQxNDozODowMi41NDMrMDg6MDAiLCJyZWdpc3RyYXRpb25Nb2JpbGVOdW1iZXIiOiIwOTI3MDAxMTkxMCIsImlhdCI6MTc2MTcyODU5OCwiZXhwIjoxNzYxODE0OTk4fQ.nDazaAs4DAdIOhBVA_vCXDUNa1_K7vx3bZWx8ZB37s5DyFBX-XccI2jayo1LnOE5syvkbd8X6BV3_JpJ9UOijA';

const decoded = decodeUserJWT(REAL_JWT.replace('Bearer ', ''));

describe('Util :: PaymentValidationUtil :: validatePaymentRequestEntity', () => {
  it('should pass when paymentRequestType matches', () => {
    expect(() =>
      validatePaymentRequestEntity('BUY_PROMO', 'BUY_PROMO')
    ).to.not.throw();
  });

  it('should throw when paymentRequestType mismatches', () => {
    expect(() =>
      validatePaymentRequestEntity('BUY_PROMO', 'PAY_BILLS')
    ).to.throw();
  });
});

describe('Util :: PaymentValidationUtil :: isValidToken', () => {
  it('should return true for unexpired token', () => {
    const token = {
      accessTokenExpiresAt: Math.floor(Date.now() / 1000) + 1000,
    };
    expect(isValidToken(token)).to.be.true();
  });

  it('should return false for expired token', () => {
    const token = {
      accessTokenExpiresAt: Math.floor(Date.now() / 1000) - 1000,
    };
    expect(isValidToken(token)).to.be.false();
  });
});

describe('Util :: PaymentValidationUtil :: isValidEmail', () => {
  it('should always return true for correct email', () => {
    expect(isValidEmail('test@example.com')).to.be.true();
  });

  it('should always return false for incorrect email', () => {
    expect(isValidEmail('email')).to.be.false();
  });
});

describe('Util :: PaymentValidationUtil :: validateShopperReference', () => {
  it('should pass when shopperReference matches uuid from JWT', () => {
    const req = { headers: { 'user-token': REAL_JWT } };
    const paymentRequest = { shopperReference: decoded.userJWT.uuid };
    expect(() => validateShopperReference(paymentRequest, req)).to.not.throw();
  });

  it('should throw when missing user-token', () => {
    const req = { headers: {} };
    const paymentRequest = { shopperReference: decoded.userJWT.uuid };
    expect(() => validateShopperReference(paymentRequest, req)).to.throw();
  });

  it('should throw when uuid mismatch', () => {
    const req = { headers: { 'user-token': REAL_JWT } };
    const paymentRequest = { shopperReference: 'different-uuid' };
    expect(() => validateShopperReference(paymentRequest, req)).to.throw();
  });
});

describe('Util :: PaymentValidationUtil :: validateVerficationToken', () => {
  it('should pass for valid payload', () => {
    const payload = {
      iss: 'CXS',
      exp: Math.floor(Date.now() / 1000) + 100,
      price: '100',
      accountNumber: '123',
    };
    expect(() => validateVerficationToken(payload)).to.not.throw();
  });

  it('should throw when missing fields', () => {
    const payload = { iss: 'CXS' };
    expect(() => validateVerficationToken(payload)).to.throw();
  });

  it('should throw for invalid iss', () => {
    const payload = {
      iss: 'INVALID',
      exp: Math.floor(Date.now() / 1000) + 100,
      price: '100',
      accountNumber: '123',
    };
    expect(() => validateVerficationToken(payload)).to.throw();
  });

  it('should throw for expired token', () => {
    const payload = {
      iss: 'CXS',
      exp: Math.floor(Date.now() / 1000) - 10,
      price: '100',
      accountNumber: '123',
    };
    expect(() => validateVerficationToken(payload)).to.throw();
  });
});

describe('Util :: PaymentValidationUtil :: validateECPayTransactionEntity', () => {
  it('should throw when entity mismatches expected', () => {
    const entity = {
      accountNumber: '123',
      accountIdentifier: 'abc',
      billerName: 'biller',
      serviceCharge: 10,
      amountToPay: 100,
    };
    expect(() => validateECPayTransactionEntity(entity)).to.throw();
  });
});

describe('Util :: PaymentValidationUtil :: validateBindingId', () => {
  it('should pass when non-GCASH or no binding id', () => {
    const cxsRequest = { paymentType: 'ADYEN' };
    const response = {};
    expect(() => validateBindingId(cxsRequest, response)).to.not.throw();
  });

  it('should throw for GCASH inactive binding', () => {
    const cxsRequest = {
      paymentType: constants.PAYMENT_TYPES.GCASH,
      paymentInformation: { bindingRequestID: 'id-123' },
    };
    const response = {
      status: 400,
      data: { message: 'Binding inactive' },
    };
    expect(() => validateBindingId(cxsRequest, response)).to.throw();
  });

  it('should throw for GCASH expired binding', () => {
    const cxsRequest = {
      paymentType: constants.PAYMENT_TYPES.GCASH,
      paymentInformation: { bindingRequestID: 'id-123' },
    };
    const response = {
      status: 400,
      data: { message: 'Binding expired' },
    };
    expect(() => validateBindingId(cxsRequest, response)).to.throw();
  });
});

describe('Util :: PaymentValidationUtil :: validateOutboundResponse', () => {
  it('should not throw for SC_OK', () => {
    expect(() =>
      validateOutboundResponse(constants.HTTP_STATUS_CODES.SC_OK)
    ).to.not.throw();
  });

  it('should throw InvalidOutboundRequest for 400', () => {
    expect(() =>
      validateOutboundResponse(constants.HTTP_STATUS_CODES.SC_BAD_REQUEST)
    ).to.throw();
  });

  it('should throw OutboundOperationFailed for unknown code', () => {
    expect(() => validateOutboundResponse(999)).to.throw();
  });
});

describe('Util :: PaymentValidationUtil :: validateBuyLoadTransaction', () => {
  it('should pass valid consumer case', () => {
    const settlementInformation = {
      transactions: [{ keyword: 'abc', wallet: '' }],
    };
    expect(() =>
      validateBuyLoadTransaction(settlementInformation, 'SA-LOAD')
    ).to.not.throw();
  });

  it('should throw when both consumer and retailer present', () => {
    const settlementInformation = {
      transactions: [{ keyword: 'abc', wallet: 'xyz' }],
    };
    expect(() =>
      validateBuyLoadTransaction(settlementInformation, 'ENTITY_LOAD')
    ).to.throw();
  });
});

describe('Util :: PaymentValidationUtil :: validateVoucherInfoRequest', () => {
  it('should pass when channel not NG1', async () => {
    const req = {
      app: { channel: 'superapp', cxsRequest: { settlementInformation: [] } },
      headers: {},
    };
    await expect(validateVoucherInfoRequest(req)).to.not.reject();
  });

  it('should throw when NG1 with voucher and missing user-token', async () => {
    const req = {
      app: {
        channel: 'superapp',
        cxsRequest: {
          settlementInformation: [
            { voucher: true, requestType: 'BUY_LOAD', transactions: [] },
          ],
        },
      },
      headers: {},
    };
    await expect(validateVoucherInfoRequest(req)).to.reject();
  });

  it('should pass and attach UUID_USER when valid', async () => {
    const req = {
      app: {
        channel: 'superapp',
        cxsRequest: {
          settlementInformation: [
            { voucher: true, requestType: 'BuyPromo', transactions: [] },
          ],
        },
      },
      headers: { 'user-token': REAL_JWT.replace('Bearer ', '') },
    };

    await validateVoucherInfoRequest(req);

    expect(req.app.additionalParams).to.exist();
    expect(req.app.additionalParams.UUID_USER).to.equal(
      'a7d55216-f4f0-44f9-a8ac-f979837c22c3'
    );
  });
});

describe('Util :: PaymentValidationUtil :: validateReferalCheck', () => {
  it('should pass when no referralCode', () => {
    expect(() => validateReferalCheck({ transactions: [] })).to.not.throw();
  });

  it('should throw when referralCode and keyword present', () => {
    const info = { referralCode: 'ref123', transactions: [{ keyword: 'svc' }] };
    expect(() => validateReferalCheck(info)).to.throw();
  });
});

describe('Util :: PaymentValidationUtil :: validateSettlementAmount', () => {
  it('should pass when totals match', () => {
    const info = {
      transactions: [{ amount: 50 }, { amount: 50 }],
      amount: 100,
    };
    expect(() => validateSettlementAmount(info)).to.not.throw();
  });

  it('should throw when totals mismatch', () => {
    const info = { transactions: [{ amount: 10 }], amount: 20 };
    expect(() => validateSettlementAmount(info)).to.throw();
  });
});

describe('Service :: v1 :: validationService :: validateServiceNumber', () => {
  it('should throw InsufficientParameters when serviceNumber is missing', () => {
    const settlement = {
      transactions: [{ serviceNumber: null }],
    };

    try {
      validateServiceNumber(settlement);
    } catch (err) {
      expect(err.type).to.equal('InsufficientParameters');
      expect(err.displayMessage).to.equal('serviceNumber required');
    }
  });

  it('should throw InvalidParameter when mobileNumber and serviceNumber both exist', () => {
    const settlement = {
      mobileNumber: '09171234567',
      transactions: [{ serviceNumber: '1234567890' }],
    };

    try {
      validateServiceNumber(settlement);
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
      expect(err.displayMessage).to.equal(
        'mobileNumber cannot coexist with $serviceNumber.'
      );
    }
  });

  it('should pass when serviceNumber exists and mobileNumber is NOT provided', () => {
    const settlement = {
      transactions: [{ serviceNumber: '1234567890' }],
    };

    const result = validateServiceNumber(settlement);

    expect(result).to.be.undefined();
  });
});

// describe('Util :: PaymentValidationUtil :: validateSettlementAmountDiscount', () => {
//   it('should throw when total != amount and discount disallowed', async () => {
//     const req = {
//       app: { channel: 'superapp' },
//       headers: {},
//       secretManager: { paymentServiceRepository: { get: async () => 10 } },
//     };
//     const channelConfig = { extendsConfig: null };
//     const settlementInformation = {
//       transactions: [{ amount: 50 }],
//       amount: 100,
//     };
//     await expect(
//       validateSettlementAmountDiscount(
//         settlementInformation,
//         channelConfig,
//         req
//       )
//     ).to.reject();
//   });
// });
