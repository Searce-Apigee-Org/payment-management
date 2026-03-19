import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import sinon from 'sinon';
import { paymentTypeModels } from '../../../src/models/index.js';
import {
  validateAccountBrand,
  validateBudgetProtect,
  validateCheckConvenienceFee,
  validateECPaySettlementAmount,
  validateECPayTableRequest,
  validateGCSBucketValues,
  validateGPFTransaction,
  validatePayBillsRequest,
  validatePaymentInformation,
  validateSecurityLimits,
  validateSettlementAmountDiscount,
  validateTransactions,
  validateVerificationToken,
} from '../../../src/services/v1/validationService.js';
import { PAYMENT_TYPES } from '../../../src/util/constants.js';
import { constants, paymentsUtil } from '../../../src/util/index.js';
import { getPaymentInfo } from '../../mocks/paymentInfoMock.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;
export { lab };

describe('Service :: v1 :: ValidationService :: validateAccountBrand', () => {
  let req;

  beforeEach(() => {
    req = {
      accountInfoService: {
        getInfo: sinon.stub(),
      },
    };
  });

  afterEach(() => sinon.restore());

  it('should return ENTITY_PROMO when mobileNumber is not provided', async () => {
    const result = await validateAccountBrand(null, req);
    expect(result).to.equal(constants.PAYMENT_ENTITY_TYPES.ENTITY_PROMO);
  });

  it('should throw InternalOperationFailed when accountInfoService.getInfo returns null', async () => {
    req.accountInfoService.getInfo.resolves(null);
    try {
      await validateAccountBrand('09171234567', req);
    } catch (err) {
      expect(err.type).to.equal('OutboundOperationFailed');
    }
  });

  it('should throw InternalOperationFailed when hipResponse is empty object', async () => {
    req.accountInfoService.getInfo.resolves({ hipResponse: {} });
    try {
      await validateAccountBrand('09171234567', req);
    } catch (err) {
      expect(err.type).to.equal('OutboundOperationFailed');
    }
  });

  it('should return ENTITY_PTPROMO when BRAND is exactly GHP', async () => {
    req.accountInfoService.getInfo.resolves({
      hipResponse: {
        UnifiedResourceDetails: {
          AttributesInfoList: {
            AttributesInfo: [{ AttrName: 'BRAND', AttrValue: 'GHP' }],
          },
        },
      },
    });

    const result = await validateAccountBrand('09171234567', req);
    expect(result).to.equal(constants.PAYMENT_ENTITY_TYPES.ENTITY_PTPROMO);

    // Ensure we call accountInfoService.getInfo in GetDetailsByMSISDN mode
    // (camelCase keys), so it doesn't fall back to GetAccountInfo.
    expect(req.accountInfoService.getInfo.calledOnce).to.be.true();
    const [, payload] = req.accountInfoService.getInfo.firstCall.args;
    expect(payload).to.include({ primaryResourceType: 'C' });
    expect(payload).to.include({ msisdn: '09171234567' });
  });

  it('should return ENTITY_PROMO when POSTPAID_IND is N even if BRAND is GHP-Prepaid', async () => {
    req.accountInfoService.getInfo.resolves({
      hipResponse: {
        UnifiedResourceDetails: {
          AttributesInfoList: {
            AttributesInfo: [
              { AttrName: 'POSTPAID_IND', AttrValue: 'N' },
              { AttrName: 'BRAND', AttrValue: 'GHP-Prepaid' },
            ],
          },
        },
      },
    });

    const result = await validateAccountBrand('09171234567', req);
    expect(result).to.equal(constants.PAYMENT_ENTITY_TYPES.ENTITY_PROMO);
  });

  it('should return ENTITY_PROMO when POSTPAID_IND is Y but BRAND is not exactly GHP (legacy ignores POSTPAID_IND)', async () => {
    req.accountInfoService.getInfo.resolves({
      hipResponse: {
        UnifiedResourceDetails: {
          AttributesInfoList: {
            AttributesInfo: [
              { AttrName: 'POSTPAID_IND', AttrValue: 'Y' },
              { AttrName: 'BRAND', AttrValue: 'GHP-REGULAR' },
            ],
          },
        },
      },
    });

    const result = await validateAccountBrand('09171234567', req);
    expect(result).to.equal(constants.PAYMENT_ENTITY_TYPES.ENTITY_PROMO);
  });

  it('should return ENTITY_PROMO when BRAND attribute is missing (fallback path)', async () => {
    req.accountInfoService.getInfo.resolves({
      hipResponse: {
        UnifiedResourceDetails: {
          AttributesInfoList: {
            AttributesInfo: [{ AttrName: 'POSTPAID_IND', AttrValue: 'N' }],
          },
        },
      },
    });

    const result = await validateAccountBrand('09171234567', req);
    expect(result).to.equal(constants.PAYMENT_ENTITY_TYPES.ENTITY_PROMO);
  });

  it('should return ENTITY_PROMO when brand is not GHP', async () => {
    req.accountInfoService.getInfo.resolves({
      hipResponse: {
        UnifiedResourceDetails: {
          AttributesInfoList: {
            AttributesInfo: [{ AttrName: 'BRAND', AttrValue: 'TM' }],
          },
        },
      },
    });

    const result = await validateAccountBrand('09171234567', req);
    expect(result).to.equal(constants.PAYMENT_ENTITY_TYPES.ENTITY_PROMO);
  });
});

describe('Service :: v1 :: ValidationService :: validatePaymentInformation', () => {
  let req;

  const settlement = [
    {
      requestType: constants.PAYMENT_REQUEST_TYPES.NON_BILL,
      amount: 100,
      mobileNumber: '09171234567',
      transactionType: 'TEST',
      transactions: [],
    },
  ];

  beforeEach(() => {
    req = {
      headers: { 'user-token': 'abc' },
      app: {
        channel: constants.CHANNELS.NG1,
        cxsRequest: {
          paymentType: PAYMENT_TYPES.DROPIN,
          paymentInformation: getPaymentInfo('AdyenDropin'),
          settlementInformation: settlement,
        },
      },
      paymentTypeModels: {
        AdyenDropinRequestType: {
          validateAdyenDropinRequest:
            paymentTypeModels.AdyenDropinRequestType.validateAdyenDropinRequest,
          processAdyenDropinRequest: sinon.stub().resolves(),
        },
        GcashRequestType: {
          validateGcashRequest:
            paymentTypeModels.GcashRequestType.validateGcashRequest,
          processGcashRequest: sinon.stub().resolves(),
        },
        XenditRequestType: {
          validateXenditRequest:
            paymentTypeModels.XenditRequestType.validateXenditRequest,
          processXenditRequest: sinon.stub().resolves(),
          processXenditRequestForOtherChannels: sinon.stub().resolves(),
        },
        DnoXenditRequestType: {
          validateDnoXenditRequest:
            paymentTypeModels.DnoXenditRequestType.validateDnoXenditRequest,
          processDnoXenditRequest: sinon.stub().resolves(),
        },
      },
    };
  });

  afterEach(() => sinon.restore());

  it('should run AdyenDropin flow for NG1', async () => {
    await validatePaymentInformation(req);

    expect(
      req.paymentTypeModels.AdyenDropinRequestType.processAdyenDropinRequest
        .calledOnce
    ).to.be.true();
  });

  it('should run Gcash flow for NG1', async () => {
    req.app.cxsRequest.paymentType = PAYMENT_TYPES.GCASH;
    req.app.cxsRequest.paymentInformation = getPaymentInfo('Gcash');

    await validatePaymentInformation(req);

    expect(
      req.paymentTypeModels.GcashRequestType.processGcashRequest.calledOnce
    ).to.be.true();
  });

  it('should run Xendit flow for NG1', async () => {
    req.app.cxsRequest.paymentType = PAYMENT_TYPES.XENDIT;
    req.app.cxsRequest.paymentInformation = getPaymentInfo('Xendit');

    await validatePaymentInformation(req);

    expect(
      req.paymentTypeModels.XenditRequestType.processXenditRequest.calledOnce
    ).to.be.true();
  });

  it('should run Xendit DNO flow for NON_BILL when channel is DNO', async () => {
    req.app.channel = constants.CHANNELS.DNO;
    req.app.cxsRequest.paymentType = PAYMENT_TYPES.XENDIT;
    req.app.cxsRequest.paymentInformation =
      getPaymentInfo('Xendit_Ewallet_DNO');

    await validatePaymentInformation(req);

    expect(
      req.paymentTypeModels.DnoXenditRequestType.processDnoXenditRequest
        .calledOnce
    ).to.be.true();
  });

  it('should run Xendit flow for valid channel that is not NG1/DNO', async () => {
    req.app.channel = constants.CHANNELS.GOR;
    req.app.cxsRequest.paymentType = constants.PAYMENT_TYPES.XENDIT;
    req.app.cxsRequest.paymentInformation = getPaymentInfo(
      'X_Direct_Debit_BuyLoad'
    );

    await validatePaymentInformation(req);

    expect(
      req.paymentTypeModels.XenditRequestType
        .processXenditRequestForOtherChannels.calledOnce
    ).to.be.true();
  });

  it('should throw InsufficientParameters when user-token is missing on NG1', async () => {
    delete req.headers['user-token'];

    try {
      await validatePaymentInformation(req);
      throw new Error('Should have thrown');
    } catch (err) {
      expect(err.type).to.equal('InsufficientParameters');
    }
  });

  it('should treat superapp-* as NG1 channel', async () => {
    req.app.channel = 'superapp-devs';

    await validatePaymentInformation(req);

    expect(
      req.paymentTypeModels.AdyenDropinRequestType.processAdyenDropinRequest
        .calledOnce
    ).to.be.true();
  });

  it('should return silently when channel is missing', async () => {
    req.app.channel = null;

    const result = await validatePaymentInformation(req);

    expect(result).to.be.undefined();
  });

  it('should throw InvalidRequest when cxsRequest is missing required fields', async () => {
    const badReq = {
      app: {
        channel: constants.CHANNELS.NG1,
        cxsRequest: {
          // paymentType is missing
          settlementInformation: [],
        },
      },
    };

    try {
      await validatePaymentInformation(badReq);
      throw new Error('Should have thrown');
    } catch (err) {
      expect(err.type).to.equal('InvalidRequest');
    }
  });
});

describe('Service :: v1 :: ValidationService :: validateTransactions', () => {
  let req;

  const USER_TOKEN =
    'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiIsImtpZCI6ImViYjk2YjU4ZjVkZGYyYzdkMmU0ZmVjOTJiNWQ4MTg2In0.eyJ1dWlkIjoiYTdkNTUyMTYtZjRmMC00NGY5LWE4YWMtZjk3OTgzN2MyMmMzIiwicmVmcmVzaFRva2VuIjoiYXNkc2FkIiwiYWNjZXNzVG9rZW4iOiJzYWQiLCJpc3MiOiJDWFMiLCJtb2JpbGVOdW1iZXJWZXJpZmljYXRpb25EYXRlIjoiMjAyMy0xMS0wMlQxNDozODowMi41NDMrMDg6MDAiLCJyZWdpc3RyYXRpb25Nb2JpbGVOdW1iZXIiOiIwOTI3MDAxMTkxMCIsImlhdCI6MTc2MTcyODU5OCwiZXhwIjoxNzYxODE0OTk4fQ.nDazaAs4DAdIOhBVA_vCXDUNa1_K7vx3bZWx8ZB37s5DyFBX-XccI2jayo1LnOE5syvkbd8X6BV3_JpJ9UOijA';

  const mockChannelConfig = {
    clientId: 'UNIT-TESTING',
    channelCode: 'SUPERAPP',
    maximumDailyTransactions: 999,
    maximumDailyAmount: 999,
  };

  const createBaseSettlement = (overrides = {}) => ({
    accountNumber: '1234567890',
    mobileNumber: '09171234567',
    emailAddress: null,
    amount: 100,
    requestType: constants.PAYMENT_REQUEST_TYPES.BUY_PROMO,
    transactionType: 'X',
    transactions: [{ transactionId: 'TXN-1' }],
    referralCode: null,
    paymentCode: null,
    voucher: null,
    createOrderExternal: null,
    landlineNumber: null,
    accountType: null,
    accountName: null,
    billsType: null,
    metadata: null,
    ...overrides,
  });

  beforeEach(() => {
    req = {
      headers: { 'user-token': USER_TOKEN },
      app: {
        principalId: 'UNIT-TESTING',
        channel: constants.CHANNELS.NG1,
        additionalParams: {
          OVERRIDE_DISCOUNT: false,
        },
      },
      channelConfig: {
        buyLoadChannelConfigRepository: {
          findOneById: sinon.stub().resolves(mockChannelConfig),
        },
      },
      priceValidationService: {
        validateServiceIdPrice: sinon.stub().resolves(),
        validateSettlementAmountVoucher: sinon.stub().resolves(),
      },
      paymentTypeModels,
      cxsRequest: {
        settlementInformation: createBaseSettlement(),
      },

      validationService: {
        validateSecurityLimits: sinon.stub(),
        validateECPayTableRequest: sinon.stub(),
        validateECPaySettlementAmount: sinon.stub(),
        validateGPFTransaction: sinon.stub(),
        validateGCSBucketValues: sinon.stub(),
        validateSettlementAmountDiscount: sinon.stub(),
        validatePayBillsRequest: sinon.stub(),
        validateGCSBucketValues: sinon.stub(),
      },
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should validate BUY_PROMO flow and call serviceIdPrice when mobileNumber is present', async () => {
    const settlement = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.BUY_PROMO,
      mobileNumber: '09171234567',
    });

    const transactions = [
      { amount: 90.65, serviceId: '984947283' },
      { amount: 9.35, serviceId: '984947281' },
    ];
    settlement.transactions = transactions;

    const target = {};

    await validateTransactions(req, settlement);

    expect(
      req.priceValidationService.validateServiceIdPrice.calledOnce
    ).to.be.true();
  });

  it('should throw InsufficientParameters for BUY_PROMO when mobileNumber is missing', async () => {
    const settlement = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.BUY_PROMO,
      mobileNumber: null,
    });

    const target = {};

    try {
      await validateTransactions(req, settlement);
      throw new Error('Expected validateTransactions to throw');
    } catch (err) {
      expect(err.type).to.equal('InsufficientParameters');
    }
  });

  it('should validate BUY_LOAD flow, call validateSecurityLimits and discount settlement when OVERRIDE_DISCOUNT is false', async () => {
    const settlement = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.BUY_LOAD,
      mobileNumber: '09171234567',
      transactions: [{ keyword: 'TXN-LOAD-1', amount: 100.0 }],
    });

    const target = {};

    await validateTransactions(req, settlement);

    expect(
      req.validationService.validateSecurityLimits.calledOnce
    ).to.be.true();
    expect(
      req.priceValidationService.validateSettlementAmountVoucher.called
    ).to.be.false();
  });

  it('should use validateSettlementAmountVoucher for BUY_LOAD when OVERRIDE_DISCOUNT is true', async () => {
    req.app.additionalParams.OVERRIDE_DISCOUNT = true;

    const settlement = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.BUY_LOAD,
      mobileNumber: '09171234567',
      transactions: [{ keyword: 'TXN-LOAD-1', amount: 100.0 }],
    });

    const target = {};

    await validateTransactions(req, settlement);

    expect(
      req.priceValidationService.validateSettlementAmountVoucher.calledOnce
    ).to.be.true();
  });

  it('should throw InsufficientParameters for BUY_LOAD when mobileNumber is missing', async () => {
    const settlement = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.BUY_LOAD,
      mobileNumber: null,
    });

    const target = {};

    try {
      await validateTransactions(req, settlement);
      throw new Error('Expected validateTransactions to throw');
    } catch (err) {
      expect(err.type).to.equal('InsufficientParameters');
    }
  });

  it('should validate BUY_VOUCHER flow and call serviceIdPrice', async () => {
    const settlement = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.BUY_VOUCHER,
      transactions: [
        {
          amount: 100,
          voucherCategory: 'test-category',
          serviceNumber: '9848238428',
        },
      ],
      mobileNumber: null,
    });

    const target = {};

    await validateTransactions(req, settlement);

    expect(
      req.priceValidationService.validateServiceIdPrice.calledOnce
    ).to.be.true();
  });

  it('should throw InsufficientParameters for ECPAY when NG1 payload transactions are missing required fields', async () => {
    req.app.channel = constants.CHANNELS.NG1;
    const settlement = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.ECPAY,
      transactions: [{ transactionId: 'TXN-EC-1' }],
    });

    const target = {};

    try {
      await validateTransactions(req, settlement);
      throw new Error('Expected validateTransactions to throw');
    } catch (err) {
      // NG1 (SuperApp) supports ECPay and requires `transactions[]`.
      // This should fail schema validation because the ECPay model expects
      // partnerReferenceNumber/billerName/accountIdentifier/etc.
      expect(err.type).to.equal('InsufficientParameters');
    }
  });

  it('should throw InvalidUserToken for ECPAY when user-token header is missing', async () => {
    delete req.headers['user-token'];

    // ECPAY transactions[] are not allowed for NG1 channel.
    // Use a non-NG1 channel to reach the user-token validation.
    req.app.channel = constants.CHANNELS.GOR;
    req.app.principalId = 'SOME-OTHER-CHANNEL';
    const settlement = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.ECPAY,
      transactions: [
        {
          partnerReferenceNumber: '123456',
          accountIdentifier: '123',
          accountNumber: '123',
          billerName: 'biller',
          serviceCharge: 1.0,
          amountToPay: 10.0,
        },
      ],
    });

    const target = {};

    try {
      await validateTransactions(req, settlement);
      throw new Error('Expected validateTransactions to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidUserToken');
    }
  });

  it('should run ECPAY flow and set emailAddress from decoded user token', async () => {
    // ECPAY transactions[] are not allowed for NG1 channel.
    req.app.channel = constants.CHANNELS.GOR;
    req.app.principalId = 'SOME-OTHER-CHANNEL';
    const settlement = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.ECPAY,
      transactions: [
        {
          partnerReferenceNumber: '123456',
          accountIdentifier: '123',
          accountNumber: '123',
          billerName: 'biller',
          serviceCharge: 1.0,
          amountToPay: 10.0,
        },
      ],
      emailAddress: null,
    });

    const target = {};

    await validateTransactions(req, settlement);
    expect(settlement.emailAddress).to.exist();

    expect(
      req.validationService.validateECPayTableRequest.calledOnce
    ).to.be.true();
    expect(
      req.validationService.validateECPaySettlementAmount.calledOnce
    ).to.be.true();
  });

  it('should throw InvalidParameter when createOrderExternal is empty for BBPREPAIDPROMO', async () => {
    const settlement = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.BBPREPAIDPROMO,
      createOrderExternal: [],
    });
    const target = {};
    try {
      await validateTransactions(req, settlement);
    } catch (error) {
      expect(error.type).to.equal('InvalidParameter');
    }
  });

  // 12. BBPREPAIDPROMO valid createOrderExternal
  it('should validate BBPREPAIDPROMO flow and call validateGPFTransaction', async () => {
    const settlement = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.BBPREPAIDPROMO,
      emailAddress: 'test@gmail.com',
      transactionType: 'N',
      createOrderExternal: [
        {
          accountId: 'ACC-1',
          targetType: '12312',
          entityIds: [
            { id: 'E1', type: 'offer' },
            { id: 'E2', type: 'offer' },
          ],
        },
      ],
    });

    delete settlement.mobileNumber;
    delete settlement.transactions;
    delete settlement.referralCode;
    delete settlement.paymentCode;
    delete settlement.voucher;
    delete settlement.landlineNumber;
    delete settlement.accountType;
    delete settlement.accountName;
    delete settlement.billsType;
    delete settlement.metadata;

    const target = {};

    await validateTransactions(req, settlement);

    expect(
      req.validationService.validateGPFTransaction.calledOnce
    ).to.be.true();
  });

  it('should run PAY_BILLS flow and call validatePayBillsRequest when conditions match', async () => {
    const settlement = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.PAY_BILLS,
      transactionType: 'G',
      transactions: [],
    });

    const target = {
      accountType: null,
      accountName: null,
    };

    await validateTransactions(req, settlement);
    expect(
      req.validationService.validatePayBillsRequest.calledOnce
    ).to.be.true();
  });

  it('should throw InvalidParameter for CHANGE_SIM when channel is not NG1', async () => {
    req.app.channel = 'DNO';
    const settlement = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.CHANGE_SIM,
      transactions: [{ transactionId: 'TXN-CS-1' }],
    });

    const target = {};

    try {
      await validateTransactions(req, settlement);
      throw new Error('Expected validateTransactions to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
      expect(err.displayMessage).to.equal(
        'Additional Property not allowed(transactions[]).'
      );
    }
  });

  it('should throw InvalidParameter for CHANGE_SIM when transactions is empty', async () => {
    req.app.channel = constants.CHANNELS.NG1;
    const settlement = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.CHANGE_SIM,
      transactions: [],
    });

    const target = {};

    try {
      await validateTransactions(req, settlement);
      throw new Error('Expected validateTransactions to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
      expect(err.displayMessage).to.equal('Transactions should not be empty.');
    }
  });

  it('should throw MissingParameterValidateException when transactionId is missing in CHANGE_SIM', async () => {
    req.app.channel = constants.CHANNELS.NG1;
    const settlement = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.CHANGE_SIM,
      transactions: [{}],
    });

    const target = {};

    try {
      await validateTransactions(req, settlement);
      throw new Error('Expected validateTransactions to throw');
    } catch (err) {
      expect(err.type).to.equal('MissingParameterValidateException');
    }
  });

  it('should throw InvalidParameter when transactionId is blank in CHANGE_SIM', async () => {
    req.app.channel = constants.CHANNEL.NG1;
    const settlement = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.CHANGE_SIM,
      transactions: [{ transactionId: '   ' }],
    });

    const target = {};

    try {
      await validateTransactions(req, settlement);
      throw new Error('Expected validateTransactions to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
      expect(err.displayMessage).to.equal(
        'TransactionId should not empty or null'
      );
    }
  });

  it('should call validateGCSBucketValues for valid CHANGE_SIM flow', async () => {
    req.app.channel = constants.CHANNELS.NG1;
    const settlement = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.CHANGE_SIM,
      transactions: [{ transactionId: 'TXN-CS-OK' }],
    });

    const target = {};

    await validateTransactions(req, settlement);

    expect(
      req.validationService.validateGCSBucketValues.calledOnce
    ).to.be.true();
    // Ensure signature is now (settlementObject, req)
    const [argSettlement, argReq] =
      req.validationService.validateGCSBucketValues.firstCall.args;
    expect(argSettlement).to.equal(settlement);
    expect(argReq).to.equal(req);
  });

  it('should throw InvalidParameter in default branch when requestType is unsupported but transactions exist', async () => {
    const settlement = createBaseSettlement({
      requestType: 'SomeOtherType',
      transactions: [{ transactionId: 'TXN-UNKNOWN' }],
    });

    const target = {};

    try {
      await validateTransactions(req, settlement);
      throw new Error('Expected validateTransactions to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
      expect(err.displayMessage).to.equal(
        'Additional Property not allowed(transactions[]).'
      );
    }
  });

  it('should validate BUYBBCONTENT flow (BuyBBContent) and NOT throw when transactions are present and amount matches total', async () => {
    const settlement = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.BUYBBCONTENT,
      amount: 299,
      transactions: [
        {
          productCode: 'APO_OTCSUB_NCHG',
          identityType: 'NETID',
          requestDate: '20220812094700',
          provisioningServiceProvider: 'PPS',
          identityValue: '903377490_272131518',
          amount: 299,
        },
      ],
    });

    await expect(validateTransactions(req, settlement)).to.not.reject();
  });

  it('should allow BUY_ROAMING with transactions for NG1 and validate amount match', async () => {
    const settlement = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.BUY_ROAMING,
      transactionType: 'N',
      mobileNumber: '09171234567',
      amount: 999,
      transactions: [{ serviceId: '323', param: '999', amount: 999 }],
    });

    await expect(validateTransactions(req, settlement)).to.not.reject();
  });

  it('should throw InvalidParameter for BUY_ROAMING when settlement amount does not equal sum(transactions.amount)', async () => {
    const settlement = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.BUY_ROAMING,
      transactionType: 'N',
      mobileNumber: '09171234567',
      amount: 10,
      transactions: [{ serviceId: '323', param: '999', amount: 999 }],
    });

    await expect(validateTransactions(req, settlement)).to.reject();
  });

  it('should throw InvalidParameter for BUY_ROAMING when transactions is empty', async () => {
    const settlement = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.BUY_ROAMING,
      transactionType: 'N',
      mobileNumber: '09171234567',
      amount: 999,
      transactions: [],
    });

    await expect(validateTransactions(req, settlement)).to.reject();
  });

  it('should throw InsufficientParameters for BUY_ROAMING when both mobileNumber and accountNumber are missing', async () => {
    const settlement = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.BUY_ROAMING,
      transactionType: 'N',
      mobileNumber: null,
      accountNumber: null,
      amount: 999,
      transactions: [{ serviceId: '323', amount: 999 }],
    });

    await expect(validateTransactions(req, settlement)).to.reject();
  });

  it('should throw InvalidRequestValidateException for BUY_ROAMING when transactionType is not N', async () => {
    const settlement = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.BUY_ROAMING,
      transactionType: 'G',
      mobileNumber: '09171234567',
      amount: 999,
      transactions: [{ serviceId: '323', amount: 999 }],
    });

    await expect(validateTransactions(req, settlement)).to.reject();
  });

  it('should throw InvalidParameter for BUY_ROAMING when transaction is missing serviceId and keyword', async () => {
    const settlement = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.BUY_ROAMING,
      transactionType: 'N',
      mobileNumber: '09171234567',
      amount: 999,
      transactions: [{ amount: 999 }],
    });

    await expect(validateTransactions(req, settlement)).to.reject();
  });

  it('should throw InvalidParameter for BUY_ROAMING when transaction has both keyword and serviceId', async () => {
    const settlement = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.BUY_ROAMING,
      transactionType: 'N',
      mobileNumber: '09171234567',
      amount: 999,
      transactions: [{ amount: 999, keyword: 'ROAM', serviceId: '323' }],
    });

    await expect(validateTransactions(req, settlement)).to.reject();
  });

  it('should throw InvalidParameter for BUY_ROAMING when keyword is used with param', async () => {
    const settlement = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.BUY_ROAMING,
      transactionType: 'N',
      mobileNumber: '09171234567',
      amount: 999,
      transactions: [{ amount: 999, keyword: 'ROAM', param: 'X' }],
    });

    await expect(validateTransactions(req, settlement)).to.reject();
  });

  it('should throw InvalidParameter for BUY_ROAMING when activationDate is provided but blank', async () => {
    const settlement = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.BUY_ROAMING,
      transactionType: 'N',
      mobileNumber: '09171234567',
      amount: 999,
      transactions: [{ amount: 999, serviceId: '323', activationDate: '   ' }],
    });

    await expect(validateTransactions(req, settlement)).to.reject();
  });

  it('should throw InvalidParameter for BUY_ROAMING when activationDate format is invalid', async () => {
    const settlement = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.BUY_ROAMING,
      transactionType: 'N',
      mobileNumber: '09171234567',
      amount: 999,
      transactions: [
        { amount: 999, serviceId: '323', activationDate: '2026-02-25' },
      ],
    });

    await expect(validateTransactions(req, settlement)).to.reject();
  });

  it('should throw InvalidParameter for BUY_ROAMING when targetDestination is provided but blank', async () => {
    const settlement = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.BUY_ROAMING,
      transactionType: 'N',
      mobileNumber: '09171234567',
      amount: 999,
      transactions: [
        { amount: 999, serviceId: '323', targetDestination: '   ' },
      ],
    });

    await expect(validateTransactions(req, settlement)).to.reject();
  });

  it('should throw InvalidParameter for BUY_ROAMING when serviceId is non-numeric', async () => {
    const settlement = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.BUY_ROAMING,
      transactionType: 'N',
      mobileNumber: '09171234567',
      amount: 999,
      transactions: [{ amount: 999, serviceId: 'ABC' }],
    });

    await expect(validateTransactions(req, settlement)).to.reject();
  });

  it('should throw InvalidParameter for BUYBBCONTENT when transactions is empty', async () => {
    const settlement = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.BUYBBCONTENT,
      amount: 299,
      transactions: [],
    });

    try {
      await validateTransactions(req, settlement);
      throw new Error('Expected validateTransactions to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
      expect(err.displayMessage).to.equal('Transactions should not be empty.');
    }
  });

  it('should throw InvalidParameter for BUYBBCONTENT when a transaction is missing required fields', async () => {
    const settlement = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.BUYBBCONTENT,
      amount: 299,
      // Missing required identityValue field
      transactions: [
        {
          productCode: 'APO_OTCSUB_NCHG',
          identityType: 'NETID',
          requestDate: '20220812094700',
          provisioningServiceProvider: 'PPS',
          amount: 299,
        },
      ],
    });

    try {
      await validateTransactions(req, settlement);
      throw new Error('Expected validateTransactions to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
      expect(err.displayMessage).to.equal('The request parameter is invalid.');
    }
  });

  it('should NOT throw in default branch when requestType is unsupported and transactions are missing', async () => {
    const settlement = createBaseSettlement({
      requestType: 'SomeOtherType',
      transactions: [],
    });

    await expect(validateTransactions(req, settlement)).to.not.reject();
  });
});

describe('Service :: v1 :: validationService :: validateSecurityLimits', () => {
  let req;

  beforeEach(() => {
    req = {
      app: {
        principalId: 'UNIT_TESTING',
      },
      channelConfig: {
        buyLoadChannelConfigRepository: {
          findOneById: sinon.stub(),
        },
      },
      transactions: {
        buyLoadTransactionsRepository: {
          findByMobileDateChannel: sinon.stub(),
          findByMobileDate: sinon.stub(),
        },
      },
    };
  });

  afterEach(() => sinon.restore());

  it('should NOT throw when under transaction count and under amount limit', async () => {
    req.channelConfig.buyLoadChannelConfigRepository.findOneById
      .withArgs('UNIT_TESTING', req)
      .resolves({
        clientId: 'UNIT_TESTING',
        channelCode: 'SUPERAPP',
        maximumDailyTransactions: 999,
        maximumDailyAmount: 999,
        startTime: { hh: 22, mm: 0, ss: 0 },
      });

    req.channelConfig.buyLoadChannelConfigRepository.findOneById
      .withArgs('shared', req)
      .resolves({
        clientId: 'shared',
        channelCode: 'SHARED',
        maximumDailyTransactions: 999,
        maximumDailyAmount: 999,
      });

    req.transactions.buyLoadTransactionsRepository.findByMobileDate.resolves([
      { amount: 45 },
    ]);

    const settlement = {
      mobileNumber: '09270011910',
      amount: 100,
    };

    const result = await validateSecurityLimits(settlement, req);
    expect(result).to.be.undefined();
  });

  it('should NOT crash when channel config startTime is missing (defaults to 22:00:00)', async () => {
    req.channelConfig.buyLoadChannelConfigRepository.findOneById
      .withArgs('UNIT_TESTING', req)
      .resolves({
        clientId: 'UNIT_TESTING',
        channelCode: 'SUPERAPP',
        maximumDailyTransactions: 999,
        maximumDailyAmount: 999,
        // startTime intentionally missing
      });

    req.channelConfig.buyLoadChannelConfigRepository.findOneById
      .withArgs('shared', req)
      .resolves({
        clientId: 'shared',
        channelCode: 'SHARED',
        maximumDailyTransactions: 999,
        maximumDailyAmount: 999,
      });

    req.transactions.buyLoadTransactionsRepository.findByMobileDate.resolves([
      { amount: 45 },
    ]);

    const settlement = {
      mobileNumber: '09270011910',
      amount: 100,
    };

    const result = await validateSecurityLimits(settlement, req);
    expect(result).to.be.undefined();
  });

  it('should throw CustomBadRequestError when transaction count exceeds limit', async () => {
    req.channelConfig.buyLoadChannelConfigRepository.findOneById
      .withArgs('UNIT_TESTING', req)
      .resolves({
        clientId: 'UNIT_TESTING',
        channelCode: 'SUPERAPP',
        maximumDailyTransactions: 1,
        maximumDailyAmount: 999,
        startTime: { hh: 22, mm: 0, ss: 0 },
      });

    req.channelConfig.buyLoadChannelConfigRepository.findOneById
      .withArgs('shared', req)
      .resolves({
        clientId: 'shared',
        channelCode: 'SHARED',
        maximumDailyTransactions: 1,
        maximumDailyAmount: 999,
      });

    // Already 1 transaction exists → LIMIT REACHED
    req.transactions.buyLoadTransactionsRepository.findByMobileDate.resolves([
      { amount: 20 },
    ]);

    const settlement = {
      mobileNumber: '09270011910',
      amount: 50,
    };

    try {
      await validateSecurityLimits(settlement, req);
    } catch (err) {
      expect(err.type).to.equal('CustomBadRequestError');
      expect(err.details).to.equal(
        'Daily transaction limit has been exceeded.'
      );
    }
  });

  it('should throw CustomBadRequestError when amount limit is exceeded', async () => {
    req.channelConfig.buyLoadChannelConfigRepository.findOneById
      .withArgs('UNIT_TESTING', req)
      .resolves({
        clientId: 'UNIT_TESTING',
        channelCode: 'SUPERAPP',
        maximumDailyTransactions: 999,
        maximumDailyAmount: 100,
        startTime: { hh: 22, mm: 0, ss: 0 },
      });

    req.channelConfig.buyLoadChannelConfigRepository.findOneById
      .withArgs('shared', req)
      .resolves({
        clientId: 'shared',
        channelCode: 'SHARED',
        maximumDailyTransactions: 999,
        maximumDailyAmount: 100,
      });

    req.transactions.buyLoadTransactionsRepository.findByMobileDate.resolves([
      { amount: 60 },
    ]);

    const settlement = {
      mobileNumber: '09270011910',
      amount: 50,
    };

    try {
      await validateSecurityLimits(settlement, req);
    } catch (err) {
      expect(err.type).to.equal('CustomBadRequestError');
      expect(err.details).to.equal(
        'Daily transaction limit has been exceeded.'
      );
    }
  });

  it('should throw Default error if channel config not found', async () => {
    req.channelConfig.buyLoadChannelConfigRepository.findOneById
      .withArgs('UNIT_TESTING', req)
      .resolves(null);

    req.channelConfig.buyLoadChannelConfigRepository.findOneById
      .withArgs('shared', req)
      .resolves(null);

    const settlement = {
      mobileNumber: '09270011910',
      amount: 10,
    };

    try {
      await validateSecurityLimits(settlement, req);
    } catch (err) {
      expect(err.type).to.equal('Default');
      expect(err.displayMessage).to.equal('No channel configuration found.');
    }
  });
});

describe('Service :: v1 :: validationService :: validateSettlementAmountDiscount', () => {
  let req;

  beforeEach(() => {
    req = {
      app: {
        channel: constants.CHANNELS.NG1,
      },
      headers: {},
      secretManager: {
        paymentServiceRepository: {
          get: sinon.stub().resolves('10'),
        },
      },
    };
  });

  afterEach(() => sinon.restore());

  it('should NOT require consumer/retailer param store headers when no discount is applied (amount == total)', async () => {
    const settlementInformation = {
      amount: 100,
      transactions: [{ keyword: 'K', amount: 100 }],
    };

    const buyLoadChannelConfigRepository = {
      extendsConfig: {
        channelDiscountAllowed: true,
      },
    };

    await expect(
      validateSettlementAmountDiscount(
        settlementInformation,
        buyLoadChannelConfigRepository,
        req
      )
    ).to.not.reject();
  });

  it('should validate consumer discount when discount is applied and ssmPathConsumer is configured', async () => {
    const settlementInformation = {
      amount: 90,
      transactions: [{ keyword: 'K', amount: 100 }],
    };

    const buyLoadChannelConfigRepository = {
      extendsConfig: {
        channelDiscountAllowed: true,
        ssmPathConsumer: '/ssm/consumer/discount',
      },
    };

    // 10% discount should be accepted: total 100 vs settled 90.
    req.secretManager.paymentServiceRepository.get.resolves('10');

    await expect(
      validateSettlementAmountDiscount(
        settlementInformation,
        buyLoadChannelConfigRepository,
        req
      )
    ).to.not.reject();

    expect(
      req.secretManager.paymentServiceRepository.get.calledOnce
    ).to.be.true();
  });

  it('should throw InvalidRequestValidateException when consumer_param_store header is missing or invalid and no ssmPathConsumer is configured', async () => {
    const settlementInformation = {
      amount: 90,
      transactions: [{ keyword: 'K', amount: 100 }],
    };

    const buyLoadChannelConfigRepository = {
      extendsConfig: {
        channelDiscountAllowed: true,
        // no ssmPathConsumer configured so it should fall back to headers
      },
    };

    // Case 1: header missing
    try {
      await validateSettlementAmountDiscount(
        settlementInformation,
        buyLoadChannelConfigRepository,
        req
      );
      throw new Error('Expected validateSettlementAmountDiscount to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidRequestValidateException');
      expect(err.displayMessage).to.equal(
        'The request parameters failed in validation.'
      );
    }

    // Case 2: header explicitly invalid
    req.headers.consumer_param_store = 'Invalid';

    try {
      await validateSettlementAmountDiscount(
        settlementInformation,
        buyLoadChannelConfigRepository,
        req
      );
      throw new Error('Expected validateSettlementAmountDiscount to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidRequestValidateException');
      expect(err.displayMessage).to.equal(
        'The request parameters failed in validation.'
      );
    }
  });

  it('should throw InvalidRequestValidateException when settled amount is greater than total transaction amount', async () => {
    const settlementInformation = {
      amount: 110,
      transactions: [{ keyword: 'K', amount: 100 }],
    };

    const buyLoadChannelConfigRepository = {
      extendsConfig: {
        channelDiscountAllowed: true,
      },
    };

    await expect(
      validateSettlementAmountDiscount(
        settlementInformation,
        buyLoadChannelConfigRepository,
        req
      )
    ).to.reject();
  });

  it('should throw InvalidRequestValidateException when both consumer and retailer fields are provided', async () => {
    const settlementInformation = {
      amount: 90,
      transactions: [{ keyword: 'K', wallet: 'W', amount: 100 }],
    };

    const buyLoadChannelConfigRepository = {
      extendsConfig: {
        channelDiscountAllowed: true,
        ssmPathConsumer: '/ssm/consumer/discount',
      },
    };

    await expect(
      validateSettlementAmountDiscount(
        settlementInformation,
        buyLoadChannelConfigRepository,
        req
      )
    ).to.reject();
  });

  it('should validate retailer discount when discount is applied and ssmPathRetailer is configured', async () => {
    const settlementInformation = {
      amount: 90,
      transactions: [{ wallet: 'W', amount: 100 }],
    };

    const buyLoadChannelConfigRepository = {
      extendsConfig: {
        channelDiscountAllowed: true,
        ssmPathRetailer: '/ssm/retailer/discount',
      },
    };

    req.secretManager.paymentServiceRepository.get.resolves('10');

    await expect(
      validateSettlementAmountDiscount(
        settlementInformation,
        buyLoadChannelConfigRepository,
        req
      )
    ).to.not.reject();
  });

  it('should throw InvalidRequestValidateException when retailer_param_store header is missing or invalid and no ssmPathRetailer is configured', async () => {
    const settlementInformation = {
      amount: 90,
      transactions: [{ wallet: 'W', amount: 100 }],
    };

    const buyLoadChannelConfigRepository = {
      extendsConfig: {
        channelDiscountAllowed: true,
        // no ssmPathRetailer configured so it should fall back to headers
      },
    };

    // Case 1: header missing
    try {
      await validateSettlementAmountDiscount(
        settlementInformation,
        buyLoadChannelConfigRepository,
        req
      );
      throw new Error('Expected validateSettlementAmountDiscount to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidRequestValidateException');
      expect(err.displayMessage).to.equal(
        'The request parameters failed in validation.'
      );
    }

    // Case 2: header explicitly invalid
    req.headers.retailer_param_store = 'Invalid';

    try {
      await validateSettlementAmountDiscount(
        settlementInformation,
        buyLoadChannelConfigRepository,
        req
      );
      throw new Error('Expected validateSettlementAmountDiscount to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidRequestValidateException');
      expect(err.displayMessage).to.equal(
        'The request parameters failed in validation.'
      );
    }
  });

  it('should allow non-NG1 channels to require exact amount match when discounts are not allowed', async () => {
    req.app.channel = constants.CHANNELS.GOR;
    const settlementInformation = {
      amount: 90,
      transactions: [{ keyword: 'K', amount: 100 }],
    };

    const buyLoadChannelConfigRepository = {
      extendsConfig: {
        channelDiscountAllowed: false,
      },
    };

    await expect(
      validateSettlementAmountDiscount(
        settlementInformation,
        buyLoadChannelConfigRepository,
        req
      )
    ).to.reject();
  });

  it('should throw InvalidRequestValidateException when neither consumer nor retailer discount is indicated', async () => {
    const settlementInformation = {
      amount: 90,
      // No keyword and no wallet on any transaction
      transactions: [{ amount: 100 }],
    };

    const buyLoadChannelConfigRepository = {
      extendsConfig: {
        channelDiscountAllowed: true,
      },
    };

    try {
      await validateSettlementAmountDiscount(
        settlementInformation,
        buyLoadChannelConfigRepository,
        req
      );
      throw new Error('Expected validateSettlementAmountDiscount to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidRequestValidateException');
      expect(err.displayMessage).to.equal(
        'The request parameters failed in validation.'
      );
    }
  });

  it('should throw InvalidRequestValidateException when settled discount percentage does not match SSM discount value', async () => {
    const settlementInformation = {
      amount: 95, // 5% discount on totalTransAmount 100
      transactions: [{ keyword: 'K', amount: 100 }],
    };

    const buyLoadChannelConfigRepository = {
      extendsConfig: {
        channelDiscountAllowed: true,
        ssmPathConsumer: '/ssm/consumer/discount',
      },
    };

    // SSM says 10% but actual computed discount is 5%
    req.secretManager.paymentServiceRepository.get.resolves('10');

    try {
      await validateSettlementAmountDiscount(
        settlementInformation,
        buyLoadChannelConfigRepository,
        req
      );
      throw new Error('Expected validateSettlementAmountDiscount to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidRequestValidateException');
      expect(err.displayMessage).to.equal(
        'The request parameters failed in validation.'
      );
    }
  });
});

describe('Service :: v1 :: validationService :: validateECPayTableRequest', () => {
  let req;

  beforeEach(() => {
    req = {
      transactions: {
        // Prefer the facade name used by the app wiring (`transactions/index.js`)
        ecpayTransactionsRepository: {
          findByPartnerRef: sinon.stub(),
        },
      },
    };
  });

  afterEach(() => sinon.restore());

  it('should throw InvalidOutboundRequest if no ECPay transaction found', async () => {
    const settlementInfo = {
      transactions: [{ partnerReferenceNumber: '123456' }],
    };

    req.transactions.ecpayTransactionsRepository.findByPartnerRef.resolves([]);

    try {
      await validateECPayTableRequest(settlementInfo, req);
      throw new Error('Should have thrown');
    } catch (err) {
      expect(err.type).to.equal('InvalidOutboundRequest');
    }
  });

  it('should run validateECPayTransactionEntity when record exists', async () => {
    const settlementInfo = {
      transactions: [
        {
          partnerReferenceNumber: '123456',
          accountIdentifier: '123',
          accountNumber: '123',
          billerName: 'bill',
          serviceCharge: 1,
          amountToPay: 100,
        },
      ],
    };

    const ecpayRecord = {
      partnerReferenceNumber: '123456',
      accountIdentifier: '123',
      accountNumber: '123',
      billerName: 'bill',
      serviceCharge: 1,
      amountToPay: 100,
    };

    req.transactions.ecpayTransactionsRepository.findByPartnerRef.resolves([
      ecpayRecord,
    ]);

    await validateECPayTableRequest(settlementInfo, req);

    expect(true).to.be.true();
  });

  it('should accept legacy injected name `ecpayTransactionRepository` (backward compatibility)', async () => {
    const settlementInfo = {
      transactions: [
        {
          partnerReferenceNumber: '123456',
          accountIdentifier: '123',
          accountNumber: '123',
          billerName: 'bill',
          serviceCharge: 1,
          amountToPay: 100,
        },
      ],
    };

    req.transactions = {
      ecpayTransactionRepository: {
        findByPartnerRef: sinon.stub().resolves({
          partnerReferenceNumber: '123456',
          accountIdentifier: '123',
          accountNumber: '123',
          billerName: 'bill',
          serviceCharge: 1,
          amountToPay: 100,
        }),
      },
    };

    await validateECPayTableRequest(settlementInfo, req);

    expect(true).to.be.true();
  });

  it('should throw InternalOperationFailed when ECPay repository is misconfigured', async () => {
    const settlementInfo = {
      transactions: [{ partnerReferenceNumber: '123456' }],
    };

    // Misconfigured: no ecpayTransactionsRepository/ecpayTransactionRepository
    req.transactions = {};

    try {
      await validateECPayTableRequest(settlementInfo, req);
      throw new Error('Should have thrown');
    } catch (err) {
      expect(err.type).to.equal('InternalOperationFailed');
      expect(err.details).to.equal(
        'Missing transactions.ecpayTransactionsRepository.findByPartnerRef'
      );
    }
  });
});

describe('Service :: v1 :: validationService :: validateECPaySettlementAmount', () => {
  afterEach(() => sinon.restore());

  it('should use cxsRequest.paymentType when headers.paymentType is missing', async () => {
    const settlementInformation = {
      amount: 1,
      transactions: [{ amountToPay: 1, serviceCharge: 0 }],
      requestType: constants.PAYMENT_REQUEST_TYPES.ECPAY,
    };

    const req = {
      headers: {},
      app: {
        cxsRequest: { paymentType: PAYMENT_TYPES.GCASH },
      },
      secretManager: {
        paymentServiceRepository: {
          getGcashProcessingFee: sinon.stub().resolves('0'),
        },
      },
      secret: {},
    };

    await expect(
      validateECPaySettlementAmount(settlementInformation, req)
    ).to.not.reject();
  });

  it('should auto-correct settlementInformation.amount for ECPAY+GCASH when provided amount excludes processing fee', async () => {
    const settlementInformation = {
      // Client sent base amount (amountToPay + serviceCharge)
      amount: 1,
      requestType: constants.PAYMENT_REQUEST_TYPES.ECPAY,
      transactions: [{ amountToPay: 1, serviceCharge: 0 }],
    };

    const req = {
      headers: {},
      app: {
        cxsRequest: { paymentType: PAYMENT_TYPES.GCASH },
      },
      secretManager: {
        paymentServiceRepository: {
          // 10% processing fee => total 1.1
          getGcashProcessingFee: sinon.stub().resolves('0.10'),
        },
      },
      secret: {},
    };

    await expect(
      validateECPaySettlementAmount(settlementInformation, req)
    ).to.not.reject();

    expect(Number(settlementInformation.amount)).to.equal(1.1);
  });

  it('should throw InvalidRequestValidateException when settlementInformation.amount does not match computed total and is not the base-without-fee case', async () => {
    const settlementInformation = {
      amount: 999,
      requestType: constants.PAYMENT_REQUEST_TYPES.ECPAY,
      transactions: [{ amountToPay: 1, serviceCharge: 0 }],
    };

    const req = {
      headers: {},
      app: {
        cxsRequest: { paymentType: PAYMENT_TYPES.GCASH },
      },
      secretManager: {
        paymentServiceRepository: {
          getGcashProcessingFee: sinon.stub().resolves('0.00'),
        },
      },
      secret: {},
    };

    await expect(
      validateECPaySettlementAmount(settlementInformation, req)
    ).to.reject();
  });

  it('should throw InvalidParameter when paymentType is missing in both headers and cxsRequest', async () => {
    const settlementInformation = {
      amount: 1,
      requestType: constants.PAYMENT_REQUEST_TYPES.ECPAY,
      transactions: [{ amountToPay: 1, serviceCharge: 0 }],
    };

    const req = {
      headers: {},
      app: {},
      secretManager: {
        paymentServiceRepository: {
          getGcashProcessingFee: sinon.stub().resolves('0'),
        },
      },
      secret: {},
    };

    try {
      await validateECPaySettlementAmount(settlementInformation, req);
      throw new Error('Expected validateECPaySettlementAmount to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
      expect(err.displayMessage).to.equal('PaymentType is required');
    }
  });

  it('should compute totalAmount correctly for DROPIN payment type', async () => {
    const settlementInformation = {
      amount: 6,
      requestType: constants.PAYMENT_REQUEST_TYPES.ECPAY,
      transactions: [{ amountToPay: 5, serviceCharge: 1 }],
    };

    const req = {
      headers: { paymentType: PAYMENT_TYPES.DROPIN },
      app: {},
      secretManager: {
        paymentServiceRepository: {
          getGcashProcessingFee: sinon.stub().resolves('0'),
        },
      },
      secret: {},
    };

    await expect(
      validateECPaySettlementAmount(settlementInformation, req)
    ).to.not.reject();

    expect(settlementInformation.transactions[0].totalAmount).to.equal(6);
  });
});

describe('Service :: v1 :: validationService :: validateVerificationToken', () => {
  const buildVerificationToken = (payload) => {
    const body = Buffer.from(JSON.stringify(payload)).toString('base64');
    return `header.${body}.signature`;
  };

  afterEach(() => sinon.restore());
  it('should wrap unexpected errors as InvalidParameter', () => {
    const settlement = {
      transactions: [
        {
          // Malformed token so that decode/validation throws
          verificationToken: 'invalid-token-without-dots',
        },
      ],
    };

    try {
      validateVerificationToken(settlement);
      throw new Error('Expected validateVerificationToken to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
      expect(
        err.displayMessage.startsWith('verificationToken invalid :')
      ).to.be.true();
    }
  });
});

describe('Service :: v1 :: validationService :: validateBudgetProtect', () => {
  const USER_TOKEN = 'dummy-user-token';

  let req;

  beforeEach(() => {
    req = {
      app: {
        channel: constants.CHANNELS.NG1,
        cxsRequest: {
          settlementInformation: [
            {
              requestType: constants.PAYMENT_REQUEST_TYPES.BUY_LOAD,
              amount: 100,
            },
          ],
          budgetProtectProfile: {
            dateOfBirth: '1990-01-01',
            firstName: 'John',
            lastName: 'Doe',
          },
        },
      },
      headers: {
        'user-token': USER_TOKEN,
      },
      secretManager: {
        apiConfigRepository: {
          getApiConfig: sinon.stub(),
        },
      },
      secret: {},
    };
  });

  afterEach(() => sinon.restore());

  it('should throw InvalidRequestValidateException when channel is not NG1', async () => {
    req.app.channel = constants.CHANNELS.GOR;

    try {
      await validateBudgetProtect(req);
      throw new Error('Expected validateBudgetProtect to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidRequestValidateException');
    }
  });

  it('should throw InvalidRequestValidateException when user-token is missing or blank', async () => {
    req.headers['user-token'] = ' ';

    try {
      await validateBudgetProtect(req);
      throw new Error('Expected validateBudgetProtect to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidRequestValidateException');
    }
  });

  it('should throw InvalidRequestValidateException when settlementInformation is missing', async () => {
    req.app.cxsRequest.settlementInformation = [];

    req.secretManager.apiConfigRepository.getApiConfig.resolves({
      budgetProtectConfig: {
        requestTypeAllowed: [constants.PAYMENT_REQUEST_TYPES.BUY_LOAD],
        rate: 10,
        rateType: 'percentage',
      },
    });

    try {
      await validateBudgetProtect(req);
      throw new Error('Expected validateBudgetProtect to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidRequestValidateException');
    }
  });

  it('should throw CustomBadRequestMessageException when requestType is not eligible', async () => {
    req.app.cxsRequest.settlementInformation[0].requestType =
      'UNSUPPORTED_TYPE';

    req.secretManager.apiConfigRepository.getApiConfig.resolves({
      budgetProtectConfig: {
        requestTypeAllowed: [constants.PAYMENT_REQUEST_TYPES.BUY_LOAD],
        rate: 10,
        rateType: 'percentage',
      },
    });

    try {
      await validateBudgetProtect(req);
      throw new Error('Expected validateBudgetProtect to throw');
    } catch (err) {
      expect(err.type).to.equal('CustomBadRequestMessageException');
      expect(err.message).to.equal(
        'The request type is not eligible for budget protection.'
      );
    }
  });

  it('should throw InvalidRequestValidateException when dateOfBirth is invalid', async () => {
    // Provide an invalid dateOfBirth to force validation to fail
    req.app.cxsRequest.budgetProtectProfile.dateOfBirth = 'invalid-date';

    req.secretManager.apiConfigRepository.getApiConfig.resolves({
      budgetProtectConfig: {
        requestTypeAllowed: [constants.PAYMENT_REQUEST_TYPES.BUY_LOAD],
        rate: 10,
        rateType: 'percentage',
      },
    });

    try {
      await validateBudgetProtect(req);
      throw new Error('Expected validateBudgetProtect to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidRequestValidateException');
    }
  });

  it('should compute budgetProtectValue and enrich profile on happy path', async () => {
    // percentage: 10% of 100 => 10
    req.secretManager.apiConfigRepository.getApiConfig.resolves({
      budgetProtectConfig: {
        requestTypeAllowed: [constants.PAYMENT_REQUEST_TYPES.BUY_LOAD],
        rate: 10,
        rateType: 'percentage',
      },
    });

    const miscellaneous = await validateBudgetProtect(req);

    expect(miscellaneous.budgetProtectValue).to.be.a.number();
    expect(miscellaneous.budgetProtectValue).to.equal(10);

    const profile = req.app.cxsRequest.budgetProtectProfile;
    expect(profile.chargeAmount).to.equal(10);
    expect(profile.chargeRate).to.equal(10);
    expect(profile.chargeType).to.equal('percentage');
  });
});

describe('Service :: v1 :: validationService :: validateCheckConvenienceFee', () => {
  const USER_TOKEN =
    'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiIsImtpZCI6ImViYjk2YjU4ZjVkZGYyYzdkMmU0ZmVjOTJiNWQ4MTg2In0.eyJ1dWlkIjoiYTdkNTUyMTYtZjRmMC00NGY5LWE4YWMtZjk3OTgzN2MyMmMzIiwicmVmcmVzaFRva2VuIjoiYXNkc2FkIiwiYWNjZXNzVG9rZW4iOiJzYWQiLCJpc3MiOiJDWFMiLCJtb2JpbGVOdW1iZXJWZXJpZmljYXRpb25EYXRlIjoiMjAyMy0xMS0wMlQxNDozODowMi41NDMrMDg6MDAiLCJyZWdpc3RyYXRpb25Nb2JpbGVOdW1iZXIiOiIwOTI3MDAxMTkxMCIsImlhdCI6MTc2MTcyODU5OCwiZXhwIjoxNzYxODE0OTk4fQ.nDazaAs4DAdIOhBVA_vCXDUNa1_K7vx3bZWx8ZB37s5DyFBX-XccI2jayo1LnOE5syvkbd8X6BV3_JpJ9UOijA';

  let req;

  beforeEach(() => {
    req = {
      cxsRequest: {
        paymentType: PAYMENT_TYPES.GCASH,
        paymentInformation: {},
        settlementInformation: [
          {
            requestType: constants.PAYMENT_REQUEST_TYPES.PAY_BILLS,
            transactionType: 'N',
            mobileNumber: '09171234567',
            amount: 100,
            billsType: '',
          },
        ],
      },
      headers: {
        'user-token': USER_TOKEN,
      },
      app: {
        channel: constants.CHANNELS.NG1,
      },
      enrolledAccountsService: {
        validateEnrolledAccounts: sinon.stub().resolves([]),
      },
      accountInfoService: {
        getInfo: sinon.stub().resolves(null),
      },
    };
  });

  afterEach(() => sinon.restore());

  it('should return early for non-NG1 and non-CPT-preprod channels', async () => {
    req.app.channel = constants.CHANNELS.GOR;

    await expect(validateCheckConvenienceFee(req)).to.not.reject();
  });

  it('should return early when user-token header is missing', async () => {
    delete req.headers['user-token'];

    await expect(validateCheckConvenienceFee(req)).to.not.reject();
  });

  it('should throw InvalidParameter when billsType is invalid', async () => {
    req.cxsRequest.settlementInformation[0].billsType = 'invalid-billstype';

    try {
      await validateCheckConvenienceFee(req);
      throw new Error('Expected validateCheckConvenienceFee to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
    }
  });
});

describe('Service :: v1 :: validationService :: validatePayBillsRequest', () => {
  let req;

  beforeEach(() => {
    req = {
      accountInfoService: {
        getInfo: sinon.stub(),
      },
    };
  });

  afterEach(() => sinon.restore());

  it('should throw InvalidParameter when HIP status is not 00', async () => {
    const settlement = {
      mobileNumber: '09171234567',
    };

    const target = {};

    req.accountInfoService.getInfo.resolves({
      hipResponse: {
        Status: '01',
      },
    });

    try {
      await validatePayBillsRequest(settlement, target, req);
      throw new Error('Expected validatePayBillsRequest to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
    }
  });

  it('should populate accountNumber when landlineNumber is provided and HIP returns AccountNumber', async () => {
    const settlement = {
      landlineNumber: '0271234567',
    };

    const target = {};

    req.accountInfoService.getInfo.resolves({
      hipResponse: {
        Status: '00',
        AccountNumber: 'ACC-123',
        AccountType: 'TYPE',
        AccountName: 'NAME',
      },
    });

    await validatePayBillsRequest(settlement, target, req);

    expect(target.accountNumber).to.equal('ACC-123');
    expect(settlement.accountNumber).to.equal('ACC-123');
  });
});

describe('Service :: v1 :: validationService :: validateGCSBucketValues', () => {
  let req;

  beforeEach(() => {
    req = {
      app: {
        principalId: 'UNIT_TESTING',
      },
      gcs: {
        changeSimRepository: {
          getResult: sinon.stub(),
        },
      },
    };
  });

  afterEach(() => sinon.restore());

  it('should return matching GCS record when price matches and flag is allowed', async () => {
    const amount = 100;
    const settlement = {
      requestType: constants.PAYMENT_REQUEST_TYPES.CHANGE_SIM,
      amount,
    };

    const formattedPrice = paymentsUtil.formatAmount(amount);

    req.gcs.changeSimRepository.getResult.resolves([
      { price: formattedPrice, flag: '1', extra: 'ok' },
      { price: '999.00', flag: '1' },
    ]);

    const match = await validateGCSBucketValues(settlement, req);

    expect(match.price).to.equal(formattedPrice);
    expect(match.flag).to.equal('1');
  });

  it('should throw CustomBadRequestError when no matching price is found', async () => {
    const amount = 100;
    const settlement = {
      requestType: constants.PAYMENT_REQUEST_TYPES.CHANGE_SIM,
      amount,
    };

    const formattedPrice = paymentsUtil.formatAmount(amount);

    // Return records with non-matching prices
    req.gcs.changeSimRepository.getResult.resolves([
      { price: '999.00', flag: '1' },
      { price: '0.01', flag: '1' },
    ]);

    try {
      await validateGCSBucketValues(settlement, req);
      throw new Error('Expected validateGCSBucketValues to throw');
    } catch (err) {
      expect(err.type).to.equal('CustomBadRequestError');
      expect(err.details).to.equal('ServiceId and amount are not allowed.');
    }
  });

  it('should throw CustomBadRequestError when matching record has flag 0', async () => {
    const amount = 100;
    const settlement = {
      requestType: constants.PAYMENT_REQUEST_TYPES.CHANGE_SIM,
      amount,
    };

    const formattedPrice = paymentsUtil.formatAmount(amount);

    req.gcs.changeSimRepository.getResult.resolves([
      { price: formattedPrice, flag: '0' },
    ]);

    try {
      await validateGCSBucketValues(settlement, req);
      throw new Error('Expected validateGCSBucketValues to throw');
    } catch (err) {
      expect(err.type).to.equal('CustomBadRequestError');
      expect(err.details).to.equal('ServiceId and amount are not allowed.');
    }
  });
});

describe('Service :: v1 :: validationService :: validateGPFTransaction', () => {
  let req;

  beforeEach(() => {
    req = {
      dnoService: {
        dnoGetOffers: sinon.stub(),
      },
    };
  });

  afterEach(() => sinon.restore());

  it('should NOT throw when transactionType is N and amount matches offer', async () => {
    const settlement = {
      transactionType: 'N',
      amount: 100,
      createOrderExternal: [
        {
          entityIds: [{ id: 'OFR-1', type: 'offer' }],
        },
      ],
    };

    req.dnoService.dnoGetOffers.resolves([{ id: 'OFR-1', amount: 100 }]);

    await expect(validateGPFTransaction(settlement, req)).to.not.reject();

    expect(req.dnoService.dnoGetOffers.calledOnce).to.be.true();
  });

  it('should throw InvalidRequestValidateException when transactionType is not N', async () => {
    const settlement = {
      transactionType: 'G',
      amount: 100,
      createOrderExternal: [
        {
          entityIds: [{ id: 'OFR-1', type: 'offer' }],
        },
      ],
    };

    try {
      await validateGPFTransaction(settlement, req);
      throw new Error('Expected validateGPFTransaction to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidRequestValidateException');
      expect(err.displayMessage).to.equal('The transaction type is invalid.');
    }
  });

  it('should throw InvalidRequestValidateException when offer amount does not match settlement amount', async () => {
    const settlement = {
      transactionType: 'N',
      amount: 200,
      createOrderExternal: [
        {
          entityIds: [{ id: 'OFR-1', type: 'offer' }],
        },
      ],
    };

    req.dnoService.dnoGetOffers.resolves([{ id: 'OFR-1', amount: 100 }]);

    try {
      await validateGPFTransaction(settlement, req);
      throw new Error('Expected validateGPFTransaction to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidRequestValidateException');
      expect(err.displayMessage).to.equal('The amount parameter is invalid.');
    }
  });
});
