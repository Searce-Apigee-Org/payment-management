import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import { validateECPayRequest } from '../../../src/models/paymentTypes/ECPay.js';

const lab = Lab.script();
const { describe, it } = lab;
export { lab };

describe('Util :: RequestValidator :: ECPayRequestValidator :: validateECPayRequest', () => {
  it('should pass with valid payload', () => {
    const payload = [
      {
        partnerReferenceNumber: '12345',
        billerName: 'MERALCO',
        accountNumber: '987654321',
        accountIdentifier: 'CUST123',
        amountToPay: 500,
        serviceCharge: 10,
      },
    ];

    expect(() => validateECPayRequest(payload)).to.not.throw();
  });

  it('should throw InsufficientParameters when required field is missing', () => {
    const payload = [
      {
        partnerReferenceNumber: '12345',
        billerName: 'MERALCO',
        amountToPay: 500,
        serviceCharge: 10,
      },
    ];

    expect(() => validateECPayRequest(payload)).to.throw();
  });

  it('should throw InvalidParameter when partnerReferenceNumber has letters', () => {
    const payload = [
      {
        partnerReferenceNumber: '12AB45',
        billerName: 'MERALCO',
        accountNumber: '987654321',
        accountIdentifier: 'CUST123',
        amountToPay: 500,
        serviceCharge: 10,
      },
    ];

    expect(() => validateECPayRequest(payload)).to.throw();
  });

  it('should throw InvalidParameter when billerName is blank', () => {
    const payload = [
      {
        partnerReferenceNumber: '12345',
        billerName: '',
        accountNumber: '987654321',
        accountIdentifier: 'CUST123',
        amountToPay: 500,
        serviceCharge: 10,
      },
    ];

    expect(() => validateECPayRequest(payload)).to.throw();
  });

  it('should throw InvalidParameter when amountToPay is below minimum', () => {
    const payload = [
      {
        partnerReferenceNumber: '12345',
        billerName: 'MERALCO',
        accountNumber: '987654321',
        accountIdentifier: 'CUST123',
        amountToPay: 0,
        serviceCharge: 10,
      },
    ];

    expect(() => validateECPayRequest(payload)).to.throw();
  });

  it('should throw InvalidParameter when serviceCharge is negative', () => {
    const payload = [
      {
        partnerReferenceNumber: '12345',
        billerName: 'MERALCO',
        accountNumber: '987654321',
        accountIdentifier: 'CUST123',
        amountToPay: 500,
        serviceCharge: -1,
      },
    ];

    expect(() => validateECPayRequest(payload)).to.throw();
  });

  it('should throw InsufficientParameters when payload is empty array', () => {
    const payload = [];

    expect(() => validateECPayRequest(payload)).to.throw();
  });
});
