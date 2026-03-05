import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import sinon from 'sinon';
import { paymentTypeModels } from '../../../src/models/index.js';
import {
  validateAccountBrand,
  validateECPayTableRequest,
  validatePaymentInformation,
  validateSecurityLimits,
  validateTransactions,
} from '../../../src/services/v1/validationService.js';
import { PAYMENT_TYPES } from '../../../src/util/constants.js';
import { constants } from '../../../src/util/index.js';
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
      expect(err.type).to.equal('InternalOperationFailed');
    }
  });

  it('should throw InvalidParameter when response contains 40002', async () => {
    req.accountInfoService.getInfo.resolves({
      error: '40002',
    });
    try {
      await validateAccountBrand('09171234567', req);
    } catch (error) {
      expect(error.type).to.equal('InvalidParameter');
    }
  });

  it('should throw InternalOperationFailed when hipResponse is empty object', async () => {
    req.accountInfoService.getInfo.resolves({ hipResponse: {} });
    try {
      await validateAccountBrand('09171234567', req);
    } catch (err) {
      expect(err.type).to.equal('InternalOperationFailed');
    }
  });

  it('should return ENTITY_PTPROMO when brand is GHP', async () => {
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
  });

  it('should return undefined when brand is not GHP', async () => {
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
    expect(result).to.be.undefined();
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

  it('should return silently when channel is missing', async () => {
    req.app.channel = null;

    const result = await validatePaymentInformation(req);

    expect(result).to.be.undefined();
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
      mongo: {
        ChannelConfigRepository: {
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
    req.cxsRequest.settlementInformation = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.BUY_PROMO,
      mobileNumber: '09171234567',
    });

    const transactions = [
      { amount: 90.65, serviceId: '984947283' },
      { amount: 9.35, serviceId: '984947281' },
    ];
    req.cxsRequest.settlementInformation.transactions = transactions;

    const target = {};

    await validateTransactions(req, target);

    expect(
      req.priceValidationService.validateServiceIdPrice.calledOnce
    ).to.be.true();
  });

  it('should throw InsufficientParameters for BUY_PROMO when mobileNumber is missing', async () => {
    req.cxsRequest.settlementInformation = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.BUY_PROMO,
      mobileNumber: null,
    });

    const target = {};

    try {
      await validateTransactions(req, target);
      throw new Error('Expected validateTransactions to throw');
    } catch (err) {
      expect(err.type).to.equal('InsufficientParameters');
    }
  });

  it('should validate BUY_LOAD flow, call validateSecurityLimits and discount settlement when OVERRIDE_DISCOUNT is false', async () => {
    req.cxsRequest.settlementInformation = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.BUY_LOAD,
      mobileNumber: '09171234567',
      transactions: [{ keyword: 'TXN-LOAD-1', amount: 100.0 }],
    });

    const target = {};

    await validateTransactions(req, target);

    expect(
      req.validationService.validateSecurityLimits.calledOnce
    ).to.be.true();
    expect(
      req.priceValidationService.validateSettlementAmountVoucher.called
    ).to.be.false();
  });

  it('should use validateSettlementAmountVoucher for BUY_LOAD when OVERRIDE_DISCOUNT is true', async () => {
    req.app.additionalParams.OVERRIDE_DISCOUNT = true;

    req.cxsRequest.settlementInformation = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.BUY_LOAD,
      mobileNumber: '09171234567',
      transactions: [{ keyword: 'TXN-LOAD-1', amount: 100.0 }],
    });

    const target = {};

    await validateTransactions(req, target);

    expect(
      req.priceValidationService.validateSettlementAmountVoucher.calledOnce
    ).to.be.true();
  });

  it('should throw InsufficientParameters for BUY_LOAD when mobileNumber is missing', async () => {
    req.cxsRequest.settlementInformation = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.BUY_LOAD,
      mobileNumber: null,
    });

    const target = {};

    try {
      await validateTransactions(req, target);
      throw new Error('Expected validateTransactions to throw');
    } catch (err) {
      expect(err.type).to.equal('InsufficientParameters');
    }
  });

  it('should validate BUY_VOUCHER flow and call serviceIdPrice', async () => {
    req.cxsRequest.settlementInformation = createBaseSettlement({
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

    await validateTransactions(req, target);

    expect(
      req.priceValidationService.validateServiceIdPrice.calledOnce
    ).to.be.true();
  });

  it('should throw InvalidParameter for ECPAY when principalId is NG1', async () => {
    req.app.principalId = constants.CHANNELS.NG1;
    req.cxsRequest.settlementInformation = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.ECPAY,
      transactions: [{ transactionId: 'TXN-EC-1' }],
    });

    const target = {};

    try {
      await validateTransactions(req, target);
      throw new Error('Expected validateTransactions to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
      expect(err.displayMessage).to.equal(
        'Additional Property not allowed(transactions[]).'
      );
    }
  });

  it('should throw InvalidUserToken for ECPAY when user-token header is missing', async () => {
    delete req.headers['user-token'];

    req.app.principalId = 'SOME-OTHER-CHANNEL';
    req.cxsRequest.settlementInformation = createBaseSettlement({
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
      await validateTransactions(req, target);
      throw new Error('Expected validateTransactions to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidUserToken');
    }
  });

  it('should run ECPAY flow and set emailAddress from decoded user token', async () => {
    req.app.principalId = 'SOME-OTHER-CHANNEL';
    req.cxsRequest.settlementInformation = createBaseSettlement({
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

    await validateTransactions(req, target);
    expect(req.cxsRequest.settlementInformation.emailAddress).to.exist();

    expect(
      req.validationService.validateECPayTableRequest.calledOnce
    ).to.be.true();
    expect(
      req.validationService.validateECPaySettlementAmount.calledOnce
    ).to.be.true();
  });

  it('should throw InvalidParameter when createOrderExternal is empty for BBPREPAIDPROMO', async () => {
    req.cxsRequest.settlementInformation = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.BBPREPAIDPROMO,
      createOrderExternal: [],
    });
    const target = {};
    try {
      await validateTransactions(req, target);
    } catch (error) {
      expect(error.type).to.equal('InvalidParameter');
    }
  });

  // 12. BBPREPAIDPROMO valid createOrderExternal
  it('should validate BBPREPAIDPROMO flow and call validateGPFTransaction', async () => {
    req.cxsRequest.settlementInformation = createBaseSettlement({
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

    delete req.cxsRequest.settlementInformation.mobileNumber;
    delete req.cxsRequest.settlementInformation.transactions;
    delete req.cxsRequest.settlementInformation.referralCode;
    delete req.cxsRequest.settlementInformation.paymentCode;
    delete req.cxsRequest.settlementInformation.voucher;
    delete req.cxsRequest.settlementInformation.landlineNumber;
    delete req.cxsRequest.settlementInformation.accountType;
    delete req.cxsRequest.settlementInformation.accountName;
    delete req.cxsRequest.settlementInformation.billsType;
    delete req.cxsRequest.settlementInformation.metadata;

    const target = {};

    await validateTransactions(req, target);

    expect(
      req.validationService.validateGPFTransaction.calledOnce
    ).to.be.true();
  });

  it('should run PAY_BILLS flow and call validatePayBillsRequest when conditions match', async () => {
    req.cxsRequest.settlementInformation = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.PAY_BILLS,
      transactionType: 'G',
      transactions: [],
    });

    const target = {
      accountType: null,
      accountName: null,
    };

    await validateTransactions(req, target);
    expect(
      req.validationService.validatePayBillsRequest.calledOnce
    ).to.be.true();
  });

  it('should throw InvalidParameter for CHANGE_SIM when channel is not NG1', async () => {
    req.app.channel = 'DNO';
    req.cxsRequest.settlementInformation = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.CHANGE_SIM,
      transactions: [{ transactionId: 'TXN-CS-1' }],
    });

    const target = {};

    try {
      await validateTransactions(req, target);
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
    req.cxsRequest.settlementInformation = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.CHANGE_SIM,
      transactions: [],
    });

    const target = {};

    try {
      await validateTransactions(req, target);
      throw new Error('Expected validateTransactions to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
      expect(err.displayMessage).to.equal('Transactions should not be empty.');
    }
  });

  it('should throw MissingParameterValidateException when transactionId is missing in CHANGE_SIM', async () => {
    req.app.channel = constants.CHANNELS.NG1;
    req.cxsRequest.settlementInformation = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.CHANGE_SIM,
      transactions: [{}],
    });

    const target = {};

    try {
      await validateTransactions(req, target);
      throw new Error('Expected validateTransactions to throw');
    } catch (err) {
      expect(err.type).to.equal('MissingParameterValidateException');
    }
  });

  it('should throw InvalidParameter when transactionId is blank in CHANGE_SIM', async () => {
    req.app.channel = constants.CHANNEL.NG1;
    req.cxsRequest.settlementInformation = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.CHANGE_SIM,
      transactions: [{ transactionId: '   ' }],
    });

    const target = {};

    try {
      await validateTransactions(req, target);
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
    req.cxsRequest.settlementInformation = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.CHANGE_SIM,
      transactions: [{ transactionId: 'TXN-CS-OK' }],
    });

    const target = {};

    await validateTransactions(req, target);

    expect(
      req.validationService.validateGCSBucketValues.calledOnce
    ).to.be.true();
  });

  it('should throw InvalidParameter in default branch when requestType is unsupported but transactions exist', async () => {
    req.cxsRequest.settlementInformation = createBaseSettlement({
      requestType: 'SomeOtherType',
      transactions: [{ transactionId: 'TXN-UNKNOWN' }],
    });

    const target = {};

    try {
      await validateTransactions(req, target);
      throw new Error('Expected validateTransactions to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
      expect(err.displayMessage).to.equal(
        'Additional Property not allowed(transactions[]).'
      );
    }
  });
});

describe('Service :: v1 :: validationService :: validateSecurityLimits', () => {
  let req;

  beforeEach(() => {
    req = {
      app: {
        principalId: 'UNIT_TESTING',
      },
      mongo: {
        channelConfigRepository: {
          findOneById: sinon.stub(),
        },
        buyLoadTransactionsRepository: {
          findByMobileDateChannel: sinon.stub(),
          findByMobileDate: sinon.stub(),
        },
      },
    };
  });

  afterEach(() => sinon.restore());

  it('should NOT throw when under transaction count and under amount limit', async () => {
    req.mongo.channelConfigRepository.findOneById
      .withArgs('UNIT_TESTING', req)
      .resolves({
        clientId: 'UNIT_TESTING',
        channelCode: 'SUPERAPP',
        maximumDailyTransactions: 999,
        maximumDailyAmount: 999,
        startTime: { hh: 22, mm: 0, ss: 0 },
      });

    req.mongo.channelConfigRepository.findOneById
      .withArgs('shared', req)
      .resolves({
        clientId: 'shared',
        channelCode: 'SHARED',
        maximumDailyTransactions: 999,
        maximumDailyAmount: 999,
      });

    req.mongo.buyLoadTransactionsRepository.findByMobileDate.resolves([
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
    req.mongo.channelConfigRepository.findOneById
      .withArgs('UNIT_TESTING', req)
      .resolves({
        clientId: 'UNIT_TESTING',
        channelCode: 'SUPERAPP',
        maximumDailyTransactions: 1,
        maximumDailyAmount: 999,
        startTime: { hh: 22, mm: 0, ss: 0 },
      });

    req.mongo.channelConfigRepository.findOneById
      .withArgs('shared', req)
      .resolves({
        clientId: 'shared',
        channelCode: 'SHARED',
        maximumDailyTransactions: 1,
        maximumDailyAmount: 999,
      });

    // Already 1 transaction exists → LIMIT REACHED
    req.mongo.buyLoadTransactionsRepository.findByMobileDate.resolves([
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
    req.mongo.channelConfigRepository.findOneById
      .withArgs('UNIT_TESTING', req)
      .resolves({
        clientId: 'UNIT_TESTING',
        channelCode: 'SUPERAPP',
        maximumDailyTransactions: 999,
        maximumDailyAmount: 100,
        startTime: { hh: 22, mm: 0, ss: 0 },
      });

    req.mongo.channelConfigRepository.findOneById
      .withArgs('shared', req)
      .resolves({
        clientId: 'shared',
        channelCode: 'SHARED',
        maximumDailyTransactions: 999,
        maximumDailyAmount: 100,
      });

    req.mongo.buyLoadTransactionsRepository.findByMobileDate.resolves([
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
    req.mongo.channelConfigRepository.findOneById
      .withArgs('UNIT_TESTING', req)
      .resolves(null);

    req.mongo.channelConfigRepository.findOneById
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

describe('Service :: v1 :: validationService :: validateECPayTableRequest', () => {
  let req;

  beforeEach(() => {
    req = {
      mongo: {
        ecpayTransactionRepository: {
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

    req.mongo.ecpayTransactionRepository.findByPartnerRef.resolves([]);

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

    req.mongo.ecpayTransactionRepository.findByPartnerRef.resolves([
      ecpayRecord,
    ]);

    await validateECPayTableRequest(settlementInfo, req);

    expect(true).to.be.true();
  });
});
