import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import { validateBuyVoucherRequest } from '../../../src/models/paymentTypes/BuyVoucher.js';

const lab = Lab.script();
const { describe, it } = lab;
export { lab };

describe('Util :: RequestValidator :: BuyVoucherRequestValidator :: validateBuyVoucherRequest', () => {
  it('should pass with valid payload', () => {
    const payload = [
      {
        serviceNumber: '09171234567',
        voucherCategory: 'PROMO_100',
        amount: 100,
      },
    ];

    expect(() => validateBuyVoucherRequest(payload)).to.not.throw();
  });

  it('should throw InsufficientParameters when voucherCategory is missing', () => {
    const payload = [
      {
        serviceNumber: '09171234567',
        amount: 100,
      },
    ];

    expect(() => validateBuyVoucherRequest(payload)).to.throw();
  });

  it('should throw InsufficientParameters when amount is missing', () => {
    const payload = [
      {
        serviceNumber: '09171234567',
        voucherCategory: 'PROMO_100',
      },
    ];

    expect(() => validateBuyVoucherRequest(payload)).to.throw();
  });

  it('should throw InvalidParameter when voucherCategory is blank', () => {
    const payload = [
      {
        serviceNumber: '09171234567',
        voucherCategory: ' ',
        amount: 50,
      },
    ];

    expect(() => validateBuyVoucherRequest(payload)).to.throw();
  });

  it('should throw InvalidParameter when amount is invalid', () => {
    const payload = [
      {
        serviceNumber: '09171234567',
        voucherCategory: 'PROMO_50',
        amount: 0,
      },
    ];

    expect(() => validateBuyVoucherRequest(payload)).to.throw();
  });

  it('should throw InsufficientParameters when payload is empty', () => {
    const payload = [];

    expect(() => validateBuyVoucherRequest(payload)).to.throw();
  });

  it('should throw InvalidParameter when serviceNumber is blank', () => {
    const payload = [
      {
        serviceNumber: ' ',
        voucherCategory: 'PROMO_100',
        amount: 50,
      },
    ];

    expect(() => validateBuyVoucherRequest(payload)).to.throw();
  });
});
