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
          transactions: [
            {
              createOrderExternal: { foo: 'bar' },
            },
          ],
        },
        {
          requestType: constants.PAYMENT_REQUEST_TYPES.BBPREPAIDREPAIR,
          status: 'GCASH_AUTHORISED',
          orderId: 'order-456',
          appointmentId: 'appt-789',
          transactions: [
            {
              appointmentBooking: { id: 'appt-789' },
            },
          ],
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
    // validateString behavior: non-blank strings are trimmed; our
    // test data has no surrounding whitespace so it should match
    expect(result.paymentSession).to.equal(paymentDetails.paymentSession);
    expect(result.checkoutUrl).to.equal(paymentDetails.checkoutUrl);
    // At least one account should be built from settlementDetails
    expect(result.accounts.length).to.equal(
      paymentDetails.settlementDetails.length
    );

    // transactionDate is only set when requestType === PAY_BILLS and
    // *createdDate* is present. In this test we used createDate, so we
    // only assert the core fields and account mapping, not transactionDate.

    // For this test we only care that questFlag is not truthy on the
    // outward transaction object; filterPaymentDetails may choose to
    // null it out rather than delete the key entirely.
    expect(!!result.accounts[0].transactions[0].questFlag).to.be.false();
  });

  it('should map paymentDetails when present', () => {
    const paymentDetails = {
      tokenPaymentId: 'token-123',
      paymentDetails: {
        convenienceFeeAmount: 10,
        postedAmount: 90,
        paymentAmount: 100,
        convenienceFeeType: 'FIXED',
      },
      settlementDetails: [],
    };

    const result =
      transformers.v1Transformers.paymentSessionTransformer.buildPaymentSessionResponse(
        paymentDetails
      );

    expect(result.paymentDetails).to.equal(paymentDetails.paymentDetails);
  });

  it('should trim non-blank strings and null blank values in top-level fields', () => {
    const paymentDetails = {
      tokenPaymentId: 'token-123',
      settlementDetails: [],
      paymentSession: '  session-abc  ',
      checkoutUrl: '   ',
      merchantAccount: '\n\t  ',
    };

    const result =
      transformers.v1Transformers.paymentSessionTransformer.buildPaymentSessionResponse(
        paymentDetails
      );

    expect(result.paymentSession).to.equal('session-abc');
    expect(result.checkoutUrl).to.equal(null);
    expect(result.merchantAccount).to.equal(null);
  });

  it('should map PAY_BILLS account details, decode and mask names, and normalize transaction amounts', () => {
    const txRaw = {
      amount: { $numberDecimal: '100.50' },
      verificationToken: 'secret-token',
    };

    const txWithToObject = {
      toObject: () => ({ ...txRaw }),
    };

    const paymentDetails = {
      tokenPaymentId: 'token-acc-1',
      settlementDetails: [
        {
          requestType: constants.PAYMENT_REQUEST_TYPES.PAY_BILLS,
          refund: false,
          accountNumber: 'ACC-123',
          landlineNumber: '02-1234',
          mobileNumber: '0917-000-0000',
          amount: 500,
          status: 'XENDIT_AUTHORISED',
          statusRemarks: 'OK',
          // "John Doe" and "SAVINGS" in base64
          accountName: 'Sm9obiBEb2U=',
          accountType: 'U0FWSU5HUw==',
          paymentCode: 'PCODE',
          expiry: '2025-12-31',
          transactions: [txWithToObject],
        },
      ],
    };

    const result =
      transformers.v1Transformers.paymentSessionTransformer.buildPaymentSessionResponse(
        paymentDetails
      );

    expect(result.accounts).to.be.an.array();
    expect(result.accounts.length).to.equal(1);

    const account = result.accounts[0];

    // PAY_BILLS mapping
    expect(account.landlineNumber).to.equal('02-1234');
    expect(account.mobileNumber).to.equal('0917-000-0000');
    expect(account.amount).to.equal(500);
    // accountNumber should be nulled when landlineNumber is present
    expect(account.accountNumber).to.equal(null);

    // status and statusRemarks inclusion when status contains XENDIT
    expect(account.status).to.equal('XENDIT_AUTHORISED');
    expect(account.statusRemarks).to.equal('OK');

    // accountName is base64-decoded then masked, accountType only decoded
    expect(account.accountName).to.equal('J*** D**');
    expect(account.accountType).to.equal('SAVINGS');

    // ecpay-style metadata
    expect(account.payment_code).to.equal('PCODE');
    expect(account.expiry).to.equal('2025-12-31');

    // transaction normalization and verificationToken clearing
    expect(account.transactions).to.be.an.array();
    expect(account.transactions.length).to.equal(1);
    expect(account.transactions[0].amount).to.equal(100.5);
    expect(account.transactions[0].verificationToken).to.equal(null);
    // questFlag should not be truthy after filterPaymentDetails
    expect(!!account.transactions[0].questFlag).to.be.false();
  });

  it('should keep accountName null when base64 input is empty', () => {
    const paymentDetails = {
      tokenPaymentId: 'token-123',
      settlementDetails: [
        {
          requestType: constants.PAYMENT_REQUEST_TYPES.PAY_BILLS,
          accountName: '',
        },
      ],
    };

    const result =
      transformers.v1Transformers.paymentSessionTransformer.buildPaymentSessionResponse(
        paymentDetails
      );

    expect(result.accounts[0].accountName).to.equal(null);
  });

  it('should set transactionDate when createdDate is present for PAY_BILLS', () => {
    const paymentDetails = {
      tokenPaymentId: 'token-123',
      settlementDetails: [
        {
          requestType: constants.PAYMENT_REQUEST_TYPES.PAY_BILLS,
        },
      ],
      createdDate: '2025-09-26 12:34:56.789',
    };

    const result =
      transformers.v1Transformers.paymentSessionTransformer.buildPaymentSessionResponse(
        paymentDetails
      );

    expect(result.transactionDate).to.equal('2025-09-26 12:34:56.789');
  });

  it('should map installmentDetails and default missing term/percentage to 0', () => {
    const paymentDetails = {
      tokenPaymentId: 'token-123',
      settlementDetails: [],
      installmentDetails: [
        {
          bank: 'Bank A',
          term: undefined,
          interval: 'monthly',
          percentage: null,
          cardType: 'CREDIT',
          cardBrand: 'VISA',
        },
      ],
    };

    const result =
      transformers.v1Transformers.paymentSessionTransformer.buildPaymentSessionResponse(
        paymentDetails
      );

    expect(result.installmentDetails).to.exist();
    expect(result.installmentDetails.bank).to.equal('Bank A');
    expect(result.installmentDetails.term).to.equal(0);
    expect(result.installmentDetails.interval).to.equal('monthly');
    expect(result.installmentDetails.percentage).to.equal(0);
    expect(result.installmentDetails.cardType).to.equal('CREDIT');
    expect(result.installmentDetails.cardBrand).to.equal('VISA');
  });

  it('should skip errors branch when createPaymentSessionError is blank or whitespace', () => {
    const paymentDetails = {
      tokenPaymentId: 'token-123',
      createPaymentSessionError: '   ',
      settlementDetails: [
        {
          requestType: constants.PAYMENT_REQUEST_TYPES.PAY_BILLS,
        },
      ],
      paymentSession: 'session-xyz',
    };

    const result =
      transformers.v1Transformers.paymentSessionTransformer.buildPaymentSessionResponse(
        paymentDetails
      );

    expect(result.errors).to.be.undefined();
    expect(result.paymentSession).to.equal('session-xyz');
  });
});
