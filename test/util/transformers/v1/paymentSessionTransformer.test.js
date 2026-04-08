import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import { constants, transformers } from '../../../../src/util/index.js';

const lab = Lab.script();
const { describe, it } = lab;
export { lab };

describe('Util :: Transformer :: paymentSessionTransformer :: buildPaymentSessionResponse', () => {
  it('should build errors array if createPaymentSessionError exists and checkXendit returns true', () => {
    const paymentDetails = {
      tokenPaymentId: 'token-123',
      createPaymentSessionError: 'Error1|Error2',
      settlementDetails: [{ statusRemarks: 'ERR_CODE' }],
    };

    const result =
      transformers.v1Transformers.paymentSessionTransformer.buildPaymentSessionResponse(
        paymentDetails
      );

    expect(result.errors).to.exist();
    expect(result.errors).to.be.an.array();
    expect(result.errors).to.equal([
      { message: 'Error1', error_code: 'ERR_CODE' },
      { message: 'Error2', error_code: 'ERR_CODE' },
    ]);
  });

  it('should skip errors branch if checkXendit returns false', () => {
    const paymentDetails = {
      tokenPaymentId: 'token-123',
      createPaymentSessionError: 'Error1|Error2',
      paymentType: constants.PAYMENT_TYPES.XENDIT,
      settlementDetails: [{ refund: true, statusRemarks: 'ERR_CODE' }],
    };

    const result =
      transformers.v1Transformers.paymentSessionTransformer.buildPaymentSessionResponse(
        paymentDetails
      );

    expect(result.errors).to.be.undefined();
  });

  it('should include budgetProtectProfile if present', () => {
    const paymentDetails = {
      tokenPaymentId: 'token-123',
      settlementDetails: [
        { requestType: constants.PAYMENT_REQUEST_TYPES.PAY_BILLS },
      ],
      budgetProtectProfile: {
        budgetProtectEnabled: true,
        budgetProtectStatus: 'active',
        chargeAmount: 100,
        budgetProtectId: 'bp-123',
        policyCreatedAt: '2025-09-26',
      },
    };

    const result =
      transformers.v1Transformers.paymentSessionTransformer.buildPaymentSessionResponse(
        paymentDetails
      );

    expect(result.budgetProtect).to.exist();
    expect(result.budgetProtect.budgetProtectEnabled).to.be.true();
    expect(result.budgetProtect.budgetProtectId).to.equal('bp-123');
  });

  it('should include oona array if present', () => {
    const paymentDetails = {
      tokenPaymentId: 'token-123',
      settlementDetails: [
        { requestType: constants.PAYMENT_REQUEST_TYPES.PAY_BILLS },
      ],
      oona: [
        { oonaSku: 'sku1', oonaStatus: 'active', amount: 50 },
        { oonaSku: 'sku2', oonaStatus: 'inactive', amount: 30 },
      ],
    };

    const result =
      transformers.v1Transformers.paymentSessionTransformer.buildPaymentSessionResponse(
        paymentDetails
      );

    expect(result.oona).to.be.an.array();
    expect(result.oona.length).to.equal(2);
    expect(result.oona[0].oonaSku).to.equal('sku1');
    expect(result.oona[1].oonaStatus).to.equal('inactive');
  });

  it('should process BBPREPAIDPROMO and BBPREPAIDREPAIR transactions', () => {
    const paymentDetails = {
      tokenPaymentId: 'token-123',
      settlementDetails: [
        {
          requestType: constants.PAYMENT_REQUEST_TYPES.BBPREPAIDPROMO,
          status: 'GCASH_AUTHORISED',
          orderId: 'order-123',
        },
        {
          requestType: constants.PAYMENT_REQUEST_TYPES.BBPREPAIDREPAIR,
          status: 'GCASH_AUTHORISED',
          orderId: 'order-456',
          appointmentId: 'appt-789',
        },
      ],
    };

    const result =
      transformers.v1Transformers.paymentSessionTransformer.buildPaymentSessionResponse(
        paymentDetails
      );

    expect(result.accounts[0].transactions[0].createOrderExternal).to.exist();
    expect(result.accounts[1].transactions[0].appointmentBooking).to.exist();
  });

  it('should build normal paymentSession response with transactionDate', () => {
    const paymentDetails = {
      tokenPaymentId: 'token-123',
      settlementDetails: [
        {
          requestType: constants.PAYMENT_REQUEST_TYPES.PAY_BILLS,
          statusRemarks: 'OK',
          transactions: [{ transactionId: 'tx1' }],
        },
      ],
      createDate: '2025-09-26T12:34:56.789Z',
      paymentSession: 'session123',
      checkoutUrl: 'https://checkout.url',
      paymentMethods: ['card'],
      paymentResult: 'success',
      merchantAccount: 'merchant123',
      storedPaymentMethods: ['card1'],
      actions: ['action1'],
    };

    const result =
      transformers.v1Transformers.paymentSessionTransformer.buildPaymentSessionResponse(
        paymentDetails
      );

    expect(result.tokenPaymentId).to.equal(paymentDetails.tokenPaymentId);
    expect(result.paymentSession).to.equal(paymentDetails.paymentSession);
    expect(result.checkoutUrl).to.equal(paymentDetails.checkoutUrl);
    expect(result.accounts.length).to.equal(
      paymentDetails.settlementDetails.length
    );
    expect(result.transactionDate).to.exist();
    expect(result.accounts[0].transactions[0].questFlag).to.be.null();
  });
});
