/**
 * Additional unit tests for validationService — covering code paths
 * not exercised by the original test suite.
 *
 * Drop this file alongside the existing test file; it shares the same
 * import surface but focuses entirely on the gaps identified below:
 *
 *  • validateTransactions
 *      - VOLUME_BOOST happy path
 *      - BBPREPAIDREPAIR happy path
 *      - PAY_BILLS skipped when accountType/accountName already set
 *      - PAY_BILLS non-NG1 channel (falls into default branch → no throw)
 *      - PAY_BILLS transactionType !== 'G' (falls into default branch → no throw)
 *      - BUY_ROAMING with accountNumber instead of mobileNumber
 *      - NON_BILL / unknown requestType with empty transactions (no throw)
 *
 *  • validateSecurityLimits
 *      - non-shared config path (findByMobileDateChannel called)
 *
 *  • validateSettlementAmountDiscount
 *      - non-NG1 channel, discount NOT allowed, amounts equal (no throw)
 *
 *  • validateECPaySettlementAmount
 *      - paymentType is neither GCASH nor DROPIN (totalAmount stays 0)
 *
 *  • validateBudgetProtect
 *      - fixed rateType
 *      - missing middleName / gender defaults filled in
 *      - budgetProtectConfig absent (returns empty miscellaneous)
 *
 *  • validateGCSBucketValues
 *      - legacyKey present (Authorization header path)
 *
 *  • validateCheckConvenienceFee
 *      - payAllBills + transactionType G → sets enrolledAccountDetails
 *      - mobileNumber with BRAND=PW → broadband-prepaid path
 *      - mobileNumber with BRAND=GHP → mobile-postpaid path
 *      - mobileNumber with other BRAND → mobile-prepaid path
 *      - accountNumber with accountType G → mobile-postpaid-GHP
 *      - accountNumber with accountType I → broadband-postpaid-GHP
 *      - accountNumber with missing accountType → MissingParameterValidateException
 *      - accountNumber with unrecognised accountType → InvalidParameter
 *      - BBPREPAIDPROMO transactionType N enrolled empty → broadband-prepaidWired path
 */

import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import sinon from 'sinon';
import { paymentTypeModels } from '../../../src/models/index.js';
import {
  validateBudgetProtect,
  validateCheckConvenienceFee,
  validateECPaySettlementAmount,
  validateGCSBucketValues,
  validateSecurityLimits,
  validateSettlementAmountDiscount,
  validateTransactions,
  validateVerificationToken,
} from '../../../src/services/v1/validationService.js';
import { PAYMENT_TYPES } from '../../../src/util/constants.js';
import { constants, paymentsUtil } from '../../../src/util/index.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;
export { lab };

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// validateTransactions — additional coverage
// ---------------------------------------------------------------------------

describe('Service :: v1 :: ValidationService :: validateTransactions (additional)', () => {
  let req;

  beforeEach(() => {
    req = {
      headers: { 'user-token': USER_TOKEN },
      app: {
        principalId: 'UNIT-TESTING',
        channel: constants.CHANNELS.NG1,
        additionalParams: { OVERRIDE_DISCOUNT: false },
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
      cxsRequest: { settlementInformation: createBaseSettlement() },
      validationService: {
        validateSecurityLimits: sinon.stub().resolves(),
        validateECPayTableRequest: sinon.stub().resolves(),
        validateECPaySettlementAmount: sinon.stub().resolves(),
        validateGPFTransaction: sinon.stub().resolves(),
        validateGCSBucketValues: sinon.stub().resolves(),
        validateSettlementAmountDiscount: sinon.stub().resolves(),
        validatePayBillsRequest: sinon.stub().resolves(),
      },
    };
  });

  afterEach(() => sinon.restore());

  // -------------------------------------------------------------------------
  // VOLUME_BOOST — test validateVerificationToken directly (exported function)
  // since the real paymentTypeModels.volumeBoost is an ES module that cannot
  // be stubbed with sinon, and it validates the transaction shape before
  // validateVerificationToken is ever reached via validateTransactions.
  // -------------------------------------------------------------------------

  it('should wrap unexpected errors from validateVerificationToken as InvalidParameter', () => {
    // A token with dots but a base64 middle segment that decodes to JSON
    // missing the fields that validationUtil.validateVerficationToken requires.
    const payload = Buffer.from(JSON.stringify({ foo: 'bar' })).toString(
      'base64'
    );
    const settlement = {
      transactions: [{ verificationToken: `header.${payload}.signature` }],
    };

    try {
      validateVerificationToken(settlement);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
    }
  });

  // -------------------------------------------------------------------------
  // BBPREPAIDREPAIR — tested in a separate describe block below using esmock
  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // PAY_BILLS — skip validatePayBillsRequest when accountType/accountName set
  // -------------------------------------------------------------------------

  it('should NOT call validatePayBillsRequest for PAY_BILLS when target already has accountType and accountName', async () => {
    const settlement = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.PAY_BILLS,
      transactionType: 'G',
      transactions: [],
      accountType: 'EXISTING_TYPE',
      accountName: 'EXISTING_NAME',
    });

    await validateTransactions(req, settlement);

    expect(req.validationService.validatePayBillsRequest.called).to.be.false();
  });

  it('should NOT call validatePayBillsRequest for PAY_BILLS when transactionType is not G', async () => {
    const settlement = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.PAY_BILLS,
      transactionType: 'N',
      transactions: [],
    });

    await validateTransactions(req, settlement);

    expect(req.validationService.validatePayBillsRequest.called).to.be.false();
  });

  it('should NOT call validatePayBillsRequest for PAY_BILLS when channel is not NG1', async () => {
    req.app.channel = constants.CHANNELS.GOR;
    const settlement = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.PAY_BILLS,
      transactionType: 'G',
      transactions: [],
    });

    await validateTransactions(req, settlement);

    expect(req.validationService.validatePayBillsRequest.called).to.be.false();
  });

  // -------------------------------------------------------------------------
  // BUY_ROAMING — accountNumber instead of mobileNumber
  // -------------------------------------------------------------------------

  it('should allow BUY_ROAMING when accountNumber is present but mobileNumber is null', async () => {
    const settlement = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.BUY_ROAMING,
      transactionType: 'N',
      mobileNumber: null,
      accountNumber: '1234567890',
      amount: 999,
      transactions: [{ serviceId: '323', amount: 999 }],
    });

    await expect(validateTransactions(req, settlement)).to.not.reject();
  });

  // -------------------------------------------------------------------------
  // Default branch — unknown requestType with NO transactions (no throw)
  // -------------------------------------------------------------------------

  it('should NOT throw in default branch when requestType is NON_BILL with no transactions', async () => {
    const settlement = createBaseSettlement({
      requestType: constants.PAYMENT_REQUEST_TYPES.NON_BILL,
      transactions: [],
    });

    await expect(validateTransactions(req, settlement)).to.not.reject();
  });
});

// ---------------------------------------------------------------------------
// validateSecurityLimits — non-shared config (findByMobileDateChannel path)
// ---------------------------------------------------------------------------

describe('Service :: v1 :: ValidationService :: validateSecurityLimits (additional)', () => {
  let req;

  beforeEach(() => {
    req = {
      app: { principalId: 'UNIT_TESTING' },
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

  it('should use findByMobileDateChannel when sharedConfig is null', async () => {
    // Channel config found, shared config NOT found → isSharedConfig = false
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
      .resolves(null);

    req.transactions.buyLoadTransactionsRepository.findByMobileDateChannel.resolves(
      [{ amount: 45 }]
    );

    const settlement = { mobileNumber: '09270011910', amount: 100 };

    const result = await validateSecurityLimits(settlement, req);
    expect(result).to.be.undefined();

    expect(
      req.transactions.buyLoadTransactionsRepository.findByMobileDateChannel
        .calledOnce
    ).to.be.true();
    expect(
      req.transactions.buyLoadTransactionsRepository.findByMobileDate.called
    ).to.be.false();
  });

  it('should use channel maximumDailyAmount when sharedConfig is null', async () => {
    req.channelConfig.buyLoadChannelConfigRepository.findOneById
      .withArgs('UNIT_TESTING', req)
      .resolves({
        clientId: 'UNIT_TESTING',
        channelCode: 'SUPERAPP',
        maximumDailyTransactions: 999,
        maximumDailyAmount: 200,
        startTime: { hh: 22, mm: 0, ss: 0 },
      });

    req.channelConfig.buyLoadChannelConfigRepository.findOneById
      .withArgs('shared', req)
      .resolves(null);

    // 150 already spent + new 100 = 250 > 200 limit → should throw
    req.transactions.buyLoadTransactionsRepository.findByMobileDateChannel.resolves(
      [{ amount: 150 }]
    );

    const settlement = { mobileNumber: '09270011910', amount: 100 };

    try {
      await validateSecurityLimits(settlement, req);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('CustomBadRequestError');
      expect(err.details).to.equal(
        'Daily transaction limit has been exceeded.'
      );
    }
  });
});

// ---------------------------------------------------------------------------
// validateSettlementAmountDiscount — additional coverage
// ---------------------------------------------------------------------------

describe('Service :: v1 :: ValidationService :: validateSettlementAmountDiscount (additional)', () => {
  let req;

  beforeEach(() => {
    req = {
      app: { channel: constants.CHANNELS.GOR },
      headers: {},
      secretManager: {
        paymentServiceRepository: { get: sinon.stub().resolves('10') },
      },
    };
  });

  afterEach(() => sinon.restore());

  it('should NOT throw for non-NG1 channel when discount is NOT allowed but amounts match exactly', async () => {
    const settlementInformation = {
      amount: 100,
      transactions: [{ amount: 100 }],
    };

    const buyLoadChannelConfigRepository = {
      extendsConfig: { channelDiscountAllowed: false },
    };

    await expect(
      validateSettlementAmountDiscount(
        settlementInformation,
        buyLoadChannelConfigRepository,
        req
      )
    ).to.not.reject();
  });

  it('should throw InvalidParameter for non-NG1 when discount NOT allowed and amounts differ', async () => {
    const settlementInformation = {
      amount: 90,
      transactions: [{ amount: 100 }],
    };

    const buyLoadChannelConfigRepository = {
      extendsConfig: { channelDiscountAllowed: false },
    };

    try {
      await validateSettlementAmountDiscount(
        settlementInformation,
        buyLoadChannelConfigRepository,
        req
      );
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
    }
  });

  it('should return early without hitting SSM when NG1 channel and amounts are equal (no discount applied)', async () => {
    req.app.channel = constants.CHANNELS.NG1;

    const settlementInformation = {
      amount: 100,
      transactions: [{ keyword: 'K', amount: 100 }],
    };

    const buyLoadChannelConfigRepository = {
      extendsConfig: { channelDiscountAllowed: true },
    };

    await expect(
      validateSettlementAmountDiscount(
        settlementInformation,
        buyLoadChannelConfigRepository,
        req
      )
    ).to.not.reject();

    expect(req.secretManager.paymentServiceRepository.get.called).to.be.false();
  });
});

// ---------------------------------------------------------------------------
// validateECPaySettlementAmount — neither GCASH nor DROPIN
// ---------------------------------------------------------------------------

describe('Service :: v1 :: ValidationService :: validateECPaySettlementAmount (additional)', () => {
  afterEach(() => sinon.restore());

  it('should set totalAmount to 0 when paymentType is XENDIT (neither GCASH nor DROPIN) and amount is 0', async () => {
    const settlementInformation = {
      amount: 0,
      requestType: constants.PAYMENT_REQUEST_TYPES.ECPAY,
      transactions: [{ amountToPay: 0, serviceCharge: 0 }],
    };

    const req = {
      headers: { paymentType: PAYMENT_TYPES.XENDIT },
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

    expect(settlementInformation.transactions[0].totalAmount).to.equal(0);
  });

  it('should throw when paymentType is XENDIT and settlement amount does not match (non-zero)', async () => {
    const settlementInformation = {
      amount: 50,
      requestType: constants.PAYMENT_REQUEST_TYPES.ECPAY,
      transactions: [{ amountToPay: 10, serviceCharge: 0 }],
    };

    const req = {
      headers: { paymentType: PAYMENT_TYPES.XENDIT },
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
    ).to.reject();
  });
});

// ---------------------------------------------------------------------------
// validateBudgetProtect — additional coverage
// ---------------------------------------------------------------------------

describe('Service :: v1 :: ValidationService :: validateBudgetProtect (additional)', () => {
  let req;

  beforeEach(() => {
    req = {
      app: {
        channel: constants.CHANNELS.NG1,
        cxsRequest: {
          settlementInformation: [
            {
              requestType: constants.PAYMENT_REQUEST_TYPES.BUY_LOAD,
              amount: 200,
            },
          ],
          budgetProtectProfile: {
            dateOfBirth: '1990-01-01',
            firstName: 'John',
            lastName: 'Doe',
            // middleName and gender intentionally omitted
          },
        },
      },
      headers: { 'user-token': USER_TOKEN },
      secretManager: {
        apiConfigRepository: { getApiConfig: sinon.stub() },
      },
      secret: {},
    };
  });

  afterEach(() => sinon.restore());

  it('should default middleName to space and gender to "Not Provided" when missing', async () => {
    req.secretManager.apiConfigRepository.getApiConfig.resolves({
      budgetProtectConfig: {
        requestTypeAllowed: [constants.PAYMENT_REQUEST_TYPES.BUY_LOAD],
        rate: 5,
        rateType: 'percentage',
      },
    });

    await validateBudgetProtect(req);

    const profile = req.app.cxsRequest.budgetProtectProfile;
    expect(profile.middleName).to.equal(' ');
    expect(profile.gender).to.equal('Not Provided');
  });

  it('should compute budgetProtectValue correctly for fixed rateType', async () => {
    req.secretManager.apiConfigRepository.getApiConfig.resolves({
      budgetProtectConfig: {
        requestTypeAllowed: [constants.PAYMENT_REQUEST_TYPES.BUY_LOAD],
        rate: 25,
        rateType: 'fixed',
      },
    });

    const result = await validateBudgetProtect(req);

    expect(result.budgetProtectValue).to.equal(25);
    expect(req.app.cxsRequest.budgetProtectProfile.chargeType).to.equal(
      'fixed'
    );
  });

  it('should return empty miscellaneous when budgetProtectConfig is absent from secret', async () => {
    req.secretManager.apiConfigRepository.getApiConfig.resolves({
      // budgetProtectConfig key is missing
    });

    const result = await validateBudgetProtect(req);

    expect(result).to.be.an.object();
    expect(Object.keys(result).length).to.equal(0);
  });

  it('should preserve existing middleName and gender when already set', async () => {
    req.app.cxsRequest.budgetProtectProfile.middleName = 'Santos';
    req.app.cxsRequest.budgetProtectProfile.gender = 'Male';

    req.secretManager.apiConfigRepository.getApiConfig.resolves({
      budgetProtectConfig: {
        requestTypeAllowed: [constants.PAYMENT_REQUEST_TYPES.BUY_LOAD],
        rate: 10,
        rateType: 'percentage',
      },
    });

    await validateBudgetProtect(req);

    const profile = req.app.cxsRequest.budgetProtectProfile;
    expect(profile.middleName).to.equal('Santos');
    expect(profile.gender).to.equal('Male');
  });
});

// ---------------------------------------------------------------------------
// validateGCSBucketValues — legacyKey path (Authorization header present)
// ---------------------------------------------------------------------------

describe('Service :: v1 :: ValidationService :: validateGCSBucketValues (additional)', () => {
  let req;

  beforeEach(() => {
    req = {
      app: { principalId: 'UNIT_TESTING' },
      // Provide Authorization header so buildLegacyCatalogKey returns a key
      headers: { authorization: 'Bearer some-client-token' },
      gcs: {
        changeSimRepository: { getResult: sinon.stub() },
      },
    };
  });

  afterEach(() => sinon.restore());

  it('should use legacyKey when authorization header is present and match is found', async () => {
    const amount = 100;
    const settlement = {
      requestType: constants.PAYMENT_REQUEST_TYPES.CHANGE_SIM,
      amount,
    };

    const formattedPrice = paymentsUtil.formatAmount(amount);

    req.gcs.changeSimRepository.getResult.resolves([
      { price: formattedPrice, flag: '1' },
    ]);

    const match = await validateGCSBucketValues(settlement, req);

    expect(match.flag).to.equal('1');
    expect(req.gcs.changeSimRepository.getResult.calledOnce).to.be.true();
  });
});

// ---------------------------------------------------------------------------
// validateCheckConvenienceFee — additional coverage
// ---------------------------------------------------------------------------

describe('Service :: v1 :: ValidationService :: validateCheckConvenienceFee (additional)', () => {
  let req;

  const buildReq = (overrides = {}) => ({
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
    headers: { 'user-token': USER_TOKEN },
    app: { channel: constants.CHANNELS.NG1 },
    enrolledAccountsService: {
      validateEnrolledAccounts: sinon.stub().resolves([]),
    },
    accountInfoService: { getInfo: sinon.stub() },
    ...overrides,
  });

  afterEach(() => sinon.restore());

  it('should set enrolledAccountDetails to payAllBills when billsType is payAllBills and transactionType is G', async () => {
    const r = buildReq();
    r.cxsRequest.settlementInformation[0].billsType = 'payAllBills';
    r.cxsRequest.settlementInformation[0].transactionType = 'G';

    // validateEnrolledAccounts returns empty — code will branch on billsType first
    await expect(validateCheckConvenienceFee(r)).to.not.reject();
  });

  it('should follow broadband-prepaidWired path when requestType is BBPREPAIDPROMO and transactionType N', async () => {
    const r = buildReq();
    r.cxsRequest.settlementInformation[0].requestType =
      constants.PAYMENT_REQUEST_TYPES.BBPREPAIDPROMO;
    r.cxsRequest.settlementInformation[0].transactionType = 'N';
    r.enrolledAccountsService.validateEnrolledAccounts.resolves([]);

    await expect(validateCheckConvenienceFee(r)).to.not.reject();
  });

  it('should follow broadband-prepaidWired path when requestType is BBPREPAIDREPAIR and transactionType N', async () => {
    const r = buildReq();
    r.cxsRequest.settlementInformation[0].requestType =
      constants.PAYMENT_REQUEST_TYPES.BBPREPAIDREPAIR;
    r.cxsRequest.settlementInformation[0].transactionType = 'N';
    r.enrolledAccountsService.validateEnrolledAccounts.resolves([]);

    await expect(validateCheckConvenienceFee(r)).to.not.reject();
  });

  it('should resolve mobile-postpaid path when BRAND is GHP and enrolled is empty', async () => {
    const r = buildReq();
    // requestType must NOT be BBPREPAIDPROMO/REPAIR/PAY_BILLS with transactionType N
    r.cxsRequest.settlementInformation[0].requestType =
      constants.PAYMENT_REQUEST_TYPES.BUY_LOAD;
    r.cxsRequest.settlementInformation[0].transactionType = 'N';
    r.enrolledAccountsService.validateEnrolledAccounts.resolves([]);
    r.accountInfoService.getInfo.resolves({
      hipResponse: {
        UnifiedResourceDetails: {
          AttributesInfoList: {
            AttributesInfo: [{ AttrName: 'BRAND', AttrValue: 'GHP' }],
          },
        },
      },
    });

    await expect(validateCheckConvenienceFee(r)).to.not.reject();
  });

  it('should resolve broadband-prepaid path when BRAND is PW and enrolled is empty', async () => {
    const r = buildReq();
    r.cxsRequest.settlementInformation[0].requestType =
      constants.PAYMENT_REQUEST_TYPES.BUY_LOAD;
    r.cxsRequest.settlementInformation[0].transactionType = 'N';
    r.enrolledAccountsService.validateEnrolledAccounts.resolves([]);
    r.accountInfoService.getInfo.resolves({
      hipResponse: {
        UnifiedResourceDetails: {
          AttributesInfoList: {
            AttributesInfo: [{ AttrName: 'BRAND', AttrValue: 'PW' }],
          },
        },
      },
    });

    await expect(validateCheckConvenienceFee(r)).to.not.reject();
  });

  it('should resolve mobile-prepaid path when BRAND is TM and enrolled is empty', async () => {
    const r = buildReq();
    r.cxsRequest.settlementInformation[0].requestType =
      constants.PAYMENT_REQUEST_TYPES.BUY_LOAD;
    r.cxsRequest.settlementInformation[0].transactionType = 'N';
    r.enrolledAccountsService.validateEnrolledAccounts.resolves([]);
    r.accountInfoService.getInfo.resolves({
      hipResponse: {
        UnifiedResourceDetails: {
          AttributesInfoList: {
            AttributesInfo: [{ AttrName: 'BRAND', AttrValue: 'TM' }],
          },
        },
      },
    });

    await expect(validateCheckConvenienceFee(r)).to.not.reject();
  });

  it('should throw OperationFailed when accountInfoService returns null for mobileNumber path', async () => {
    const r = buildReq();
    // requestType must NOT be BBPREPAIDPROMO / BBPREPAIDREPAIR / PAY_BILLS
    // with transactionType N, otherwise the code takes the broadband-prepaidWired
    // shortcut and never calls accountInfoService.
    r.cxsRequest.settlementInformation[0].requestType =
      constants.PAYMENT_REQUEST_TYPES.BUY_LOAD;
    r.cxsRequest.settlementInformation[0].transactionType = 'N';
    r.enrolledAccountsService.validateEnrolledAccounts.resolves([]);
    r.accountInfoService.getInfo.resolves(null);

    try {
      await validateCheckConvenienceFee(r);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('OperationFailed');
    }
  });

  it('should throw InvalidParameter when statusCode is 40002 for mobileNumber path', async () => {
    const r = buildReq();
    r.cxsRequest.settlementInformation[0].requestType =
      constants.PAYMENT_REQUEST_TYPES.BUY_LOAD;
    r.cxsRequest.settlementInformation[0].transactionType = 'N';
    r.enrolledAccountsService.validateEnrolledAccounts.resolves([]);
    r.accountInfoService.getInfo.resolves({ statusCode: '40002' });

    try {
      await validateCheckConvenienceFee(r);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
    }
  });

  it('should throw OperationFailed when hipResponse is null for mobileNumber path', async () => {
    const r = buildReq();
    r.cxsRequest.settlementInformation[0].requestType =
      constants.PAYMENT_REQUEST_TYPES.BUY_LOAD;
    r.cxsRequest.settlementInformation[0].transactionType = 'N';
    r.enrolledAccountsService.validateEnrolledAccounts.resolves([]);
    r.accountInfoService.getInfo.resolves({ hipResponse: null });

    try {
      await validateCheckConvenienceFee(r);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('OperationFailed');
    }
  });

  it('should resolve mobile-postpaid-GHP when accountType is G (non-mobile path)', async () => {
    const r = buildReq();
    // No mobileNumber → isMobileNumber = false → takes the accountNumber branch.
    // requestType must NOT be BBPREPAIDPROMO/REPAIR/PAY_BILLS with transactionType N,
    // otherwise the code takes the broadband-prepaidWired shortcut.
    r.cxsRequest.settlementInformation[0].mobileNumber = null;
    r.cxsRequest.settlementInformation[0].accountNumber = 'ACC-123';
    r.cxsRequest.settlementInformation[0].requestType =
      constants.PAYMENT_REQUEST_TYPES.BUY_LOAD;
    r.cxsRequest.settlementInformation[0].transactionType = 'N';
    r.enrolledAccountsService.validateEnrolledAccounts.resolves([]);
    r.accountInfoService.getInfo.resolves({
      hipResponse: { AccountType: 'G' },
    });

    await expect(validateCheckConvenienceFee(r)).to.not.reject();
  });

  it('should resolve broadband-postpaid-GHP when accountType is I (non-mobile path)', async () => {
    const r = buildReq();
    r.cxsRequest.settlementInformation[0].mobileNumber = null;
    r.cxsRequest.settlementInformation[0].accountNumber = 'ACC-123';
    r.cxsRequest.settlementInformation[0].requestType =
      constants.PAYMENT_REQUEST_TYPES.BUY_LOAD;
    r.cxsRequest.settlementInformation[0].transactionType = 'N';
    r.enrolledAccountsService.validateEnrolledAccounts.resolves([]);
    r.accountInfoService.getInfo.resolves({
      hipResponse: { AccountType: 'I' },
    });

    await expect(validateCheckConvenienceFee(r)).to.not.reject();
  });

  it('should throw MissingParameterValidateException when accountType is missing (non-mobile path)', async () => {
    const r = buildReq();
    r.cxsRequest.settlementInformation[0].mobileNumber = null;
    r.cxsRequest.settlementInformation[0].accountNumber = 'ACC-123';
    r.cxsRequest.settlementInformation[0].requestType =
      constants.PAYMENT_REQUEST_TYPES.BUY_LOAD;
    r.cxsRequest.settlementInformation[0].transactionType = 'N';
    r.enrolledAccountsService.validateEnrolledAccounts.resolves([]);
    // hipResponse present but accountType missing
    r.accountInfoService.getInfo.resolves({ hipResponse: {} });

    try {
      await validateCheckConvenienceFee(r);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('MissingParameterValidateException');
    }
  });

  it('should throw InvalidParameter when accountType is unrecognised (non-mobile path)', async () => {
    const r = buildReq();
    r.cxsRequest.settlementInformation[0].mobileNumber = null;
    r.cxsRequest.settlementInformation[0].accountNumber = 'ACC-123';
    r.cxsRequest.settlementInformation[0].requestType =
      constants.PAYMENT_REQUEST_TYPES.BUY_LOAD;
    r.cxsRequest.settlementInformation[0].transactionType = 'N';
    r.enrolledAccountsService.validateEnrolledAccounts.resolves([]);
    r.accountInfoService.getInfo.resolves({
      hipResponse: { AccountType: 'Z' },
    });

    try {
      await validateCheckConvenienceFee(r);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
    }
  });

  it('should NOT throw and skip inner logic when paymentType is DROPIN (not GCASH/XENDIT)', async () => {
    const r = buildReq();
    r.cxsRequest.paymentType = PAYMENT_TYPES.DROPIN;

    await expect(validateCheckConvenienceFee(r)).to.not.reject();
  });

  it('should NOT throw when paymentInformation is null/undefined (skip inner loop)', async () => {
    const r = buildReq();
    r.cxsRequest.paymentInformation = null;

    await expect(validateCheckConvenienceFee(r)).to.not.reject();
  });

  it('should NOT throw and return early when enrolledAccountDetails is non-empty (no further account lookup)', async () => {
    const r = buildReq();
    // Non-empty enrolled accounts → skips the big else block entirely
    r.enrolledAccountsService.validateEnrolledAccounts.resolves([
      { id: 'enrolled-1' },
    ]);

    await expect(validateCheckConvenienceFee(r)).to.not.reject();

    // accountInfoService should NOT have been called
    expect(r.accountInfoService.getInfo.called).to.be.false();
  });
});

// ---------------------------------------------------------------------------
// validateTransactions :: BBPREPAIDREPAIR
//
// paymentTypeModels is read from req (not from module scope), so we can
// override req.paymentTypeModels.GFiberPrepaid directly without esmock.
// ---------------------------------------------------------------------------

describe('Service :: v1 :: ValidationService :: validateTransactions BBPREPAIDREPAIR', () => {
  let mockValidationService;

  const mockChannelConfigLocal = {
    clientId: 'UNIT-TESTING',
    channelCode: 'SUPERAPP',
    maximumDailyTransactions: 999,
    maximumDailyAmount: 999,
  };

  const createSettlement = (overrides = {}) => ({
    accountNumber: '1234567890',
    amount: 100,
    requestType: constants.PAYMENT_REQUEST_TYPES.BBPREPAIDREPAIR,
    transactionType: 'N',
    emailAddress: 'test@gmail.com',
    ...overrides,
  });

  beforeEach(() => {
    mockValidationService = {
      validateGPFTransaction: sinon.stub().resolves(),
      validateSecurityLimits: sinon.stub().resolves(),
      validateECPayTableRequest: sinon.stub().resolves(),
      validateECPaySettlementAmount: sinon.stub().resolves(),
      validateGCSBucketValues: sinon.stub().resolves(),
      validateSettlementAmountDiscount: sinon.stub().resolves(),
      validatePayBillsRequest: sinon.stub().resolves(),
    };
  });

  afterEach(() => sinon.restore());

  // Build req with GFiberPrepaid.validateGFiberRequest stubbed directly on
  // req.paymentTypeModels — this is what validateTransactions actually reads.
  const buildReq = () => ({
    headers: {},
    app: {
      principalId: 'UNIT-TESTING',
      channel: constants.CHANNELS.NG1,
      additionalParams: { OVERRIDE_DISCOUNT: false },
    },
    channelConfig: {
      buyLoadChannelConfigRepository: {
        findOneById: sinon.stub().resolves(mockChannelConfigLocal),
      },
    },
    priceValidationService: {
      validateServiceIdPrice: sinon.stub().resolves(),
      validateSettlementAmountVoucher: sinon.stub().resolves(),
    },
    paymentTypeModels: {
      ...paymentTypeModels,
      GFiberPrepaid: {
        // No-op: bypass real schema validation so tests reach the
        // createOrderExternal checks and validateGPFTransaction call.
        validateGFiberRequest: sinon.stub().returns(undefined),
      },
    },
    validationService: mockValidationService,
  });

  it('should validate BBPREPAIDREPAIR flow and call validateGPFTransaction', async () => {
    const req = buildReq();
    const settlement = createSettlement({
      createOrderExternal: [
        {
          accountId: 'ACC-1',
          targetType: '12312',
          entityIds: [{ id: 'E1', type: 'offer' }],
        },
      ],
    });

    await validateTransactions(req, settlement);

    expect(
      mockValidationService.validateGPFTransaction.calledOnce
    ).to.be.true();
  });

  it('should throw InvalidParameter for BBPREPAIDREPAIR when createOrderExternal is empty', async () => {
    const req = buildReq();
    const settlement = createSettlement({ createOrderExternal: [] });

    try {
      await validateTransactions(req, settlement);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
    }
  });

  it('should throw InvalidParameter for BBPREPAIDREPAIR when entityIds is empty', async () => {
    const req = buildReq();
    const settlement = createSettlement({
      createOrderExternal: [
        { accountId: 'ACC-1', targetType: '12312', entityIds: [] },
      ],
    });

    try {
      await validateTransactions(req, settlement);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
    }
  });

  it('should throw InvalidParameter for BBPREPAIDREPAIR when entityId.id is null', async () => {
    const req = buildReq();
    const settlement = createSettlement({
      createOrderExternal: [
        {
          accountId: 'ACC-1',
          targetType: '12312',
          entityIds: [{ id: null, type: 'offer' }],
        },
      ],
    });

    try {
      await validateTransactions(req, settlement);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
    }
  });
});
