import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import { constants } from '../../src/util/index.js';
import {
  buildPaymentEntity,
  calculateVoucherAmount,
  checkMaxVoucherAllowed,
  checkValidChannel,
  filterPayments,
  formatAmount,
  formatPayments,
  getChannelConfig,
  getRequestClientId,
  isPaymentEligibleForRefund,
  removeNullDeep,
  validateTokenSDK,
} from '../../src/util/paymentsUtil.js';

const lab = Lab.script();
const { describe, it } = lab;
export { lab };

describe('Util :: PaymentsUtil :: getRequestClientId', () => {
  it('should return principalId when present', () => {
    const req = { server: { app: { principalId: 'client123' } } };
    const result = getRequestClientId(req);
    expect(result).to.equal('client123');
  });

  it('should throw when principalId missing', () => {
    const req = { server: { app: {} } };
    expect(() => getRequestClientId(req)).to.throw();
  });
});

describe('Util :: PaymentsUtil :: checkValidChannel', () => {
  const {
    PAYMENT_TYPES: { XENDIT },
    PAYMENT_REQUEST_TYPES: { NON_BILL },
    CHANNELS: { GO, GOMO, GOR, DNO },
  } = constants;

  it('should return true for valid default channels', () => {
    expect(checkValidChannel(GO, XENDIT, '')).to.be.true();
    expect(checkValidChannel(GOMO, XENDIT)).to.be.true();
  });

  it('should return true for NON_BILL valid channels', () => {
    expect(checkValidChannel(DNO, XENDIT, NON_BILL)).to.be.true();
  });

  it('should return true for SAME_AS_GO valid channels', () => {
    expect(checkValidChannel(GOR, XENDIT, 'SAME_AS_GO')).to.be.true();
  });

  it('should return false for invalid channel or non-XENDIT type', () => {
    expect(checkValidChannel('invalid', XENDIT)).to.be.false();
    expect(checkValidChannel(GO, 'ADYEN')).to.be.false();
  });
});

describe('Util :: PaymentsUtil :: formatAmount', () => {
  it('should truncate to two decimals and remove trailing zeros', () => {
    expect(formatAmount(123.4567)).to.equal('123.45');
    expect(formatAmount(100.0)).to.equal('100');
    expect(formatAmount(100.1)).to.equal('100.1');
  });

  it('should handle string amounts', () => {
    expect(formatAmount('42.678')).to.equal('42.67');
  });
});

describe('Util :: PaymentsUtil :: calculateVoucherAmount', () => {
  it('should pass for percentage voucher with correct settlement', () => {
    const voucher = {
      type: 'percentage',
      discount_amount: 10,
      product: 'BUY_PROMO',
    };
    const settlementInformation = { transactions: [{ amount: 100 }] };
    const result = calculateVoucherAmount(
      voucher,
      100,
      90,
      'BUY_PROMO',
      settlementInformation
    );
    expect(result).to.equal(90);
  });

  it('should pass for fixed amount voucher with correct settlement', () => {
    const voucher = {
      type: 'fixed amount',
      discount_amount: 10,
      product: 'BUY_PROMO',
    };
    const settlementInformation = { transactions: [{ amount: 100 }] };
    const result = calculateVoucherAmount(
      voucher,
      100,
      90,
      'BUY_PROMO',
      settlementInformation
    );
    expect(result).to.equal(90);
  });

  it('should throw when voucher product mismatches', () => {
    const voucher = {
      type: 'percentage',
      discount_amount: 10,
      product: 'OTHER',
    };
    expect(() =>
      calculateVoucherAmount(voucher, 100, 90, 'BUY_PROMO', {
        transactions: [{ amount: 100 }],
      })
    ).to.throw();
  });

  it('should throw when calculation mismatches settlement', () => {
    const voucher = {
      type: 'percentage',
      discount_amount: 10,
      product: 'BUY_PROMO',
    };
    expect(() =>
      calculateVoucherAmount(voucher, 100, 80, 'BUY_PROMO', {
        transactions: [{ amount: 100 }],
      })
    ).to.throw();
  });
});

describe('Util :: PaymentsUtil :: checkMaxVoucherAllowed', () => {
  it('should calculate max discount correctly', () => {
    const result = checkMaxVoucherAllowed(10, 100, 50);
    expect(result).to.be.a.number();
  });

  it('should throw when calculatedVoucherDiscount > discountedAmount (bug path)', () => {
    expect(() => checkMaxVoucherAllowed(10, 100, 200)).to.throw();
  });
});

describe('Util :: PaymentsUtil :: validateTokenSDK', () => {
  it('should pass when platform is not WEB', () => {
    expect(() => validateTokenSDK({ platform: 'MOBILE' })).to.not.throw();
  });

  it('should throw when WEB and tokenSDK missing', () => {
    expect(() => validateTokenSDK({ platform: 'WEB' })).to.throw();
  });

  it('should throw when WEB and tokenSDK blank', () => {
    expect(() =>
      validateTokenSDK({ platform: 'WEB', tokenSDK: '   ' })
    ).to.throw();
  });

  it('should pass when WEB and tokenSDK valid', () => {
    expect(() =>
      validateTokenSDK({ platform: 'WEB', tokenSDK: 'abc123' })
    ).to.not.throw();
  });
});

describe('Util :: PaymentsUtil :: buildPaymentEntity', () => {
  const baseReq = {
    paymentType: constants.PAYMENT_TYPES.XENDIT,
    settlementInformation: [{ amount: 10, status: 'PENDING' }],
  };
  const headers = { 'user-token': 'token', DeviceId: 'dev-1' };

  it('should build payment entity for XENDIT', async () => {
    const result = await buildPaymentEntity(
      'tok123',
      baseReq,
      headers,
      'chan1',
      {
        command: {
          payload: { paymentInfo: { midLabel: 'MID', miscellaneous: 'misc' } },
        },
      }
    );

    const plain = result.toObject ? result.toObject() : result;

    expect(plain).to.exist();
    expect(plain).to.include(['paymentType', 'channelId']);
    expect(plain.paymentType).to.equal(constants.PAYMENT_TYPES.XENDIT);
    expect(plain.channelId).to.equal('chan1');
  });

  it('should build payment entity for GCASH', async () => {
    const req = {
      paymentType: constants.PAYMENT_TYPES.GCASH,
      paymentInformation: {
        bindingRequestID: 'bind123',
        oonaSkus: ['OonaCompTravel-1'],
      },
      settlementInformation: [
        {
          amount: 99,
          transactionType: 'N',
          requestType: 'BuyPromo',
          transactions: [
            {
              serviceId: '11656',
              param: '99',
              amount: 99,
            },
          ],
          metadata: {
            email: 'someone@gmail.com',
            endDate: '2026-03-14',
            firstName: 'some',
            lastName: 'one',
            mobileNumber: '09176884210',
            startDate: '2026-03-09',
          },
        },
      ],
    };
    const result = await buildPaymentEntity('tok456', req, headers, 'chan2', {
      command: { payload: { gcashPaymentInfo: { miscellaneous: 'misc' } } },
    });

    const plain = result.toObject ? result.toObject() : result;
    expect(plain).to.exist();
    expect(plain.settlementDetails[0].oona[0].oonaSku).to.equal([
      'OonaCompTravel-1',
    ]);
    expect(plain.settlementDetails[0].metadata.email).to.equal(
      'someone@gmail.com'
    );
  });

  it('should build payment entity for ECPAY', async () => {
    const req = {
      paymentType: constants.PAYMENT_TYPES.ECPAY,
      paymentInformation: { id: 'pmt' },
    };
    const result = await buildPaymentEntity(
      'tok789',
      req,
      headers,
      'chan3',
      {}
    );
    expect(result).to.exist();
  });
});

//
// ------------------------------
// PRE-DEV TESTS
// ------------------------------
//

describe('Util :: paymentsUtil :: formatPayments', () => {
  it('should map and sanitize payments, preserving extra fields', () => {
    const input = [
      {
        printable: '1',
        notified: '0',
        paymentAmount: 150.75,
        paymentDate: '20250102',
        accountId: 'ACC-001',
        msisdn: '639171234567',
        orId: 'OR-100',
        paymentSourceId: 'SRC-9',
        loadTime: '2025-01-02 11:12:13',
        extraField: 'keep-me',
      },
    ];

    const out = formatPayments(input, 'signed-token');

    expect(out.token).to.equal('signed-token');
    expect(out.payments).to.have.length(1);

    const payment = out.payments[0];
    expect(payment.amount).to.equal(150.75);
    expect(payment.date).to.equal('2025-01-02');
    expect(payment.accountNumber).to.equal('ACC-001');
    expect(payment.mobileNumber).to.equal('639171234567');
    expect(payment.receiptId).to.equal('OR-100');
    expect(payment.sourceId).to.equal('SRC-9');
    expect(payment.printable).to.be.true();
    expect(payment.notified).to.be.false();
    expect(payment.loadTime).to.equal('2025-01-02T11:12:13');
    expect(payment.extraField).to.equal('keep-me');
    expect(payment.paymentDate).to.be.undefined();
    expect(payment.paymentAmount).to.be.undefined();
    expect(payment.orId).to.be.undefined();
    expect(payment.paymentSourceId).to.be.undefined();
  });

  it('should throw on invalid paymentDate format', () => {
    const bad = [
      {
        printable: '1',
        notified: '1',
        paymentAmount: 10,
        paymentDate: '2025-01-02',
        accountId: 'ACC',
        msisdn: '63917',
        orId: 'OR-1',
        paymentSourceId: 'SRC',
        loadTime: '2025-01-02 00:00:00',
      },
    ];

    expect(() => formatPayments(bad, 'tkn')).to.throw(
      Error,
      'Invalid payment date format. Expected YYYYMMDD'
    );
  });
});

describe('Util :: paymentsUtil :: filterPayments', () => {
  const payments = [
    { paymentDate: '20250101', id: 1 },
    { paymentDate: '20250102', id: 2 },
    { paymentDate: '20250103', id: 3 },
  ];

  it('should filter inclusively by start and end dates', () => {
    const out = filterPayments(payments, '2025-01-02', '2025-01-03');
    expect(out.map((p) => p.id)).to.equal([2, 3]);
  });

  it('should include edges when equal to boundary', () => {
    const out = filterPayments(payments, '2025-01-01', '2025-01-01');
    expect(out.map((p) => p.id)).to.equal([1]);
  });
});

describe('Util :: paymentsUtil :: removeNullDeep', () => {
  it('should remove null/undefined values from nested structures', () => {
    const input = {
      a: null,
      b: undefined,
      c: 1,
      d: { x: null, y: 2 },
      e: [null, 3, undefined, { z: null, w: 4 }],
    };

    const out = removeNullDeep(input);

    expect(out).to.equal({
      c: 1,
      d: { y: 2 },
      e: [3, { w: 4 }],
    });
  });

  it('should return undefined for empty objects/arrays after cleanup', () => {
    expect(removeNullDeep({ a: null })).to.be.undefined();
    expect(removeNullDeep([null, undefined])).to.be.undefined();
  });
});

describe('Util :: paymentsUtil :: isPaymentEligibleForRefund', () => {
  it('should return true for authorized status with failed provisioning and no refund', () => {
    const data = {
      settlementDetails: [
        {
          status: 'GCASH_AUTHORISED',
          refund: null,
          transactions: [{ provisionStatus: 'FAILED' }],
        },
      ],
    };
    expect(isPaymentEligibleForRefund(data)).to.be.true();
  });

  it('should return false when refund already exists', () => {
    const data = {
      settlementDetails: [
        {
          status: 'XENDIT_AUTHORISED',
          refund: { amount: 10 },
          transactions: [{ provisionStatus: 'FAILED' }],
        },
      ],
    };
    expect(isPaymentEligibleForRefund(data)).to.be.false();
  });

  it('should return false when status or provisionStatus does not match', () => {
    const data = {
      settlementDetails: [
        {
          status: 'FAILED',
          refund: null,
          transactions: [{ provisionStatus: 'SUCCESS' }],
        },
      ],
    };
    expect(isPaymentEligibleForRefund(data)).to.be.false();
  });
});

describe('Util :: paymentsUtil :: getChannelConfig', () => {
  it('should return product config when prefix and requestType match', () => {
    const config = [
      {
        prefix: 'GLA',
        products: [{ type: 'BuyESIMLocal', refundable: true }],
      },
    ];

    const out = getChannelConfig('GLA123', 'BuyESIMLocal', config);
    expect(out).to.equal({ type: 'BuyESIMLocal', refundable: true });
  });

  it('should return false when prefix is not found', () => {
    const config = [{ prefix: 'GLB', products: [] }];
    const out = getChannelConfig('GLA123', 'BuyESIMLocal', config);
    expect(out).to.be.false();
  });

  it('should return false when requestType not found', () => {
    const config = [{ prefix: 'GLA', products: [{ type: 'Other' }] }];
    const out = getChannelConfig('GLA123', 'BuyESIMLocal', config);
    expect(out).to.be.false();
  });
});
