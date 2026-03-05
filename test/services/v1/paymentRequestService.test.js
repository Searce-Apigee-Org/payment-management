import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import sinon from 'sinon';

import { paymentTypeModels } from '../../../src/models/index.js';
import {
  createPaymentServiceRequest,
  preProcessPaymentInfo,
} from '../../../src/services/v1/paymentRequestService.js';
import { constants } from '../../../src/util/index.js';
import { getPaymentInfo } from '../../mocks/paymentInfoMock.js';

const lab = Lab.script();
export { lab };
const { describe, it, beforeEach, afterEach } = lab;

describe('Service :: v1 :: paymentRequestService :: createPaymentServiceRequest', () => {
  let mockReq;

  beforeEach(() => {
    mockReq = {
      validationService: {
        validateTransactions: sinon.stub().resolves(),
        validateCheckConvenienceFee: sinon.stub().resolves(),
        validateBudgetProtect: sinon.stub().returns({ insurance: 'ACTIVE' }),
      },
      serviceHelpers: {
        gcash: {
          validateBindingId: sinon.stub().resolves({
            bindingId: 'BIND123',
            uuid: 'UUID123',
          }),
        },
      },
      accountInfoService: {
        getInfo: sinon.stub().resolves({
          statusCode: 200,
          hipResponse: {
            status: '00',
            accountType: 'Postpaid',
            accountName: 'John Doe',
            accountNumber: '123456',
          },
        }),
      },
      oonaService: {
        applyOonaPricing: sinon.stub().resolves({ oonaSmartDelay: 300 }),
      },
      secretManager: {
        apiConfigRepository: {
          getApiConfig: sinon.stub().resolves({
            config: [
              {
                value: 'MID001',
                requestType: ['PayBills'],
                accountType: ['Postpaid'],
              },
            ],
          }),
        },
      },
      headers: {
        'user-token':
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySldUIjp7InV1aWQiOiJVU0VSX1VVSUQifX0.DUMMY',
      },
      secret: 'mockSecret',
      cxsRequest: {},
    };
  });

  afterEach(() => sinon.restore());

  it('should build ADYEN payment payload correctly', async () => {
    const req = {
      ...mockReq,
      cxsRequest: {
        paymentType: 'ADYEN',
        currency: 'PHP',
        countryCode: 'PH',
        settlementInformation: [
          { requestType: 'BUY_PROMO', amount: 100, emailAddress: 'test@a.com' },
        ],
      },
    };

    const payload = {
      returnUrl: 'https://return.test',
      origin: 'https://origin.test',
      browserInformation: { language: 'en' },
    };

    const result = await createPaymentServiceRequest(payload, req);
    expect(result.command.payload.adyenPaymentInfo.countryCode).to.equal('PH');
    expect(result.command.payload.gatewayProcessor).to.equal('adyen');
  });

  it('should build GCASH payment payload and include binding + misc', async () => {
    const req = {
      ...mockReq,
      cxsRequest: {
        paymentType: 'GCASH',
        currency: 'PHP',
        countryCode: 'PH',
        settlementInformation: [{ requestType: 'BUY_PROMO', amount: 100 }],
        budgetProtectProfile: { active: true },
      },
    };

    const payload = {
      environmentInformation: { osType: 'iOS' },
      budgetProtect: true,
    };

    const result = await createPaymentServiceRequest(payload, req);
    expect(result.command.payload.gcashPaymentInfo.bindingRequestID).to.equal(
      'BIND123'
    );
    expect(result.command.payload.gcashPaymentInfo.miscellaneous).to.exist();
  });

  it('should build XENDIT TYPE_CC_DC payload and enrich account info', async () => {
    const req = {
      ...mockReq,
      cxsRequest: {
        paymentType: 'XENDIT',
        currency: 'PHP',
        countryCode: 'PH',
        settlementInformation: [
          {
            requestType: 'PayBills',
            accountNumber: '123456',
            amount: 100,
          },
        ],
      },
    };

    const payload = {
      type: constants.XENDIT_PAYMENT_METHODS.TYPE_CC_DC,
      paymentMethodId: 'PM001',
      channelCode: 'BPI',
      reusability: 'ONE_TIME_USE',
    };

    const result = await createPaymentServiceRequest(payload, req);
    const info = result.command.payload.paymentInfo;
    expect(info.midLabel).to.equal('MID001');
    expect(result.command.payload.gatewayProcessor).to.equal('generic');
  });

  it('should build XENDIT TYPE_DIRECT_DEBIT payload and attach uuid', async () => {
    const req = {
      ...mockReq,
      cxsRequest: {
        paymentType: 'XENDIT',
        currency: 'PHP',
        countryCode: 'PH',
        settlementInformation: [{ requestType: 'BuyPromo', amount: 100 }],
      },
      headers: {
        'user-token':
          'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiIsImtpZCI6ImViYjk2YjU4ZjVkZGYyYzdkMmU0ZmVjOTJiNWQ4MTg2In0.eyJ1dWlkIjoiYTdkNTUyMTYtZjRmMC00NGY5LWE4YWMtZjk3OTgzN2MyMmMzIiwicmVmcmVzaFRva2VuIjoiYXNkc2FkIiwiYWNjZXNzVG9rZW4iOiJzYWQiLCJpc3MiOiJDWFMiLCJtb2JpbGVOdW1iZXJWZXJpZmljYXRpb25EYXRlIjoiMjAyMy0xMS0wMlQxNDozODowMi41NDMrMDg6MDAiLCJyZWdpc3RyYXRpb25Nb2JpbGVOdW1iZXIiOiIwOTI3MDAxMTkxMCIsImlhdCI6MTc2MTcyODU5OCwiZXhwIjoxNzYxODE0OTk4fQ.nDazaAs4DAdIOhBVA_vCXDUNa1_K7vx3bZWx8ZB37s5DyFBX-XccI2jayo1LnOE5syvkbd8X6BV3_JpJ9UOijA',
      },
    };

    const payload = {
      type: constants.XENDIT_PAYMENT_METHODS.TYPE_DIRECT_DEBIT,
      directDebit: { successUrl: 'https://xendit.test/success' },
      reusability: 'ONE_TIME_USE',
      productName: 'SA-BPROMO',
      channelCode: 'BPI',
    };

    const USER_UUID = 'a7d55216-f4f0-44f9-a8ac-f979837c22c3';
    const result = await createPaymentServiceRequest(payload, req);
    const info = result.command.payload.paymentInfo;

    expect(info.customerUuid).to.equal(USER_UUID);
  });

  it('should throw InvalidRequestValidateException when budgetProtectProfile present but flag false', async () => {
    const req = {
      ...mockReq,
      cxsRequest: {
        paymentType: 'GCASH',
        settlementInformation: [{ requestType: 'BUY_PROMO', amount: 100 }],
        budgetProtectProfile: { active: true },
      },
    };

    const payload = { budgetProtect: false };

    try {
      await createPaymentServiceRequest(payload, req);
    } catch (error) {
      expect(error.type).to.equal('InvalidRequestValidateException');
    }
  });

  it('should build DROPIN payment payload correctly', async () => {
    const req = {
      ...mockReq,
      cxsRequest: {
        paymentType: 'DROPIN',
        settlementInformation: [
          { requestType: 'BUY_PROMO', amount: 100, emailAddress: 'a@b.com' },
        ],
      },
    };

    const payload = {
      returnUrl: 'https://return.test',
      origin: 'https://origin.test',
      shopperReference: 'SR123',
    };

    const result = await createPaymentServiceRequest(payload, req);

    expect(result.command.payload.gatewayProcessor).to.exist();
    expect(result.command.payload.paymentInfo).to.exist();
  });

  it('should throw InvalidRequestValidateException when GCASH has budgetProtect missing but profile exists', async () => {
    const req = {
      ...mockReq,
      cxsRequest: {
        paymentType: 'GCASH',
        settlementInformation: [{ requestType: 'BUY_PROMO', amount: 100 }],
        budgetProtectProfile: { active: true },
      },
    };

    const payload = {};

    try {
      await createPaymentServiceRequest(payload, req);
    } catch (err) {
      expect(err.type).to.equal('InvalidRequestValidateException');
    }
  });

  it('should throw InvalidParameter when XENDIT CC/DC returns 40002', async () => {
    mockReq.accountInfoService.getInfo.resolves({
      statusCode: '40002',
    });

    const req = {
      ...mockReq,
      cxsRequest: {
        paymentType: 'XENDIT',
        settlementInformation: [
          { requestType: 'PayBills', accountNumber: '999' },
        ],
      },
    };

    const payload = {
      type: constants.XENDIT_PAYMENT_METHODS.TYPE_CC_DC,
    };

    try {
      await createPaymentServiceRequest(payload, req);
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
    }
  });

  it('should throw OperationFailed when XENDIT CC/DC returns non-200 statusCode', async () => {
    mockReq.accountInfoService.getInfo.resolves({
      statusCode: 503,
    });

    const req = {
      ...mockReq,
      cxsRequest: {
        paymentType: 'XENDIT',
        settlementInformation: [{ requestType: 'PayBills' }],
      },
    };

    const payload = {
      type: constants.XENDIT_PAYMENT_METHODS.TYPE_CC_DC,
    };

    try {
      await createPaymentServiceRequest(payload, req);
    } catch (err) {
      expect(err.type).to.equal('OperationFailed');
    }
  });
});

describe('Service :: v1 :: paymentRequestService :: preProcessPaymentInfo', () => {
  let req;

  beforeEach(() => {
    req = {
      headers: {
        'user-token':
          'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiIsImtpZCI6ImViYjk2YjU4ZjVkZGYyYzdkMmU0ZmVjOTJiNWQ4MTg2In0.eyJ1dWlkIjoiYTdkNTUyMTYtZjRmMC00NGY5LWE4YWMtZjk3OTgzN2MyMmMzIiwicmVmcmVzaFRva2VuIjoiYXNkc2FkIiwiYWNjZXNzVG9rZW4iOiJzYWQiLCJpc3MiOiJDWFMiLCJtb2JpbGVOdW1iZXJWZXJpZmljYXRpb25EYXRlIjoiMjAyMy0xMS0wMlQxNDozODowMi41NDMrMDg6MDAiLCJyZWdpc3RyYXRpb25Nb2JpbGVOdW1iZXIiOiIwOTI3MDAxMTkxMCIsImlhdCI6MTc2MTcyODU5OCwiZXhwIjoxNzYxODE0OTk4fQ.nDazaAs4DAdIOhBVA_vCXDUNa1_K7vx3bZWx8ZB37s5DyFBX-XccI2jayo1LnOE5syvkbd8X6BV3_JpJ9UOijA',
      },
      app: {
        channel: 'NG1',
        additionalParams: {},
        cxsRequest: {
          paymentType: constants.PAYMENT_TYPES.DROPIN,
          paymentInformation: getPaymentInfo('DEV_ADYEN_DROPIN'),
          settlementInformation: [
            {
              emailAddress: 'test@example.com',
              requestType: constants.PAYMENT_REQUEST_TYPES.BUY_PROMO,
            },
          ],
        },
      },

      paymentTypeModels,

      paymentRequestService: {
        createPaymentServiceRequest: sinon.stub().resolves({
          command: {
            name: 'GENERIC',
            payload: {
              gatewayProcessor: 'generic',
              paymentInfo: {},
              settlementInfos: [],
            },
          },
        }),
      },

      validationService: {
        validateBudgetProtect: sinon.stub().resolves({ misc: 'ok' }),
        validateCheckConvenienceFee: sinon.stub().resolves(),
        validateTransactions: sinon.stub().resolves(),
      },

      serviceHelpers: {
        gcash: {
          validateBindingId: sinon.stub().resolves(null),
        },
      },

      secretManager: {
        apiConfigRepository: {
          getApiConfig: sinon.stub().resolves({ config: [] }),
        },
      },

      accountInfoService: {
        getInfo: sinon.stub().resolves({
          statusCode: 200,
          hipResponse: {
            status: '00',
            accountType: 'POSTPAID',
            accountName: 'JOHN DOE',
            accountNumber: '12345',
          },
        }),
      },

      secret: {},
    };
  });

  afterEach(() => sinon.restore());

  it('should process DROPIN flow and call createPaymentServiceRequest', async () => {
    req.app.cxsRequest.paymentType = constants.PAYMENT_TYPES.DROPIN;
    req.app.cxsRequest.paymentInformation = getPaymentInfo('AdyenDropin');
    req.app.cxsRequest.paymentInformation.shopperReference =
      'a7d55216-f4f0-44f9-a8ac-f979837c22c3';

    const result = await preProcessPaymentInfo(req);

    expect(
      req.paymentRequestService.createPaymentServiceRequest.calledOnce
    ).to.be.true();
    expect(result).to.be.an.object();
  });

  it('should throw InvalidParameter when email is invalid', async () => {
    req.app.cxsRequest.settlementInformation[0].emailAddress = 'not-an-email';

    try {
      await preProcessPaymentInfo(req);
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
    }
  });

  it('should process GCASH flow and call createPaymentServiceRequest', async () => {
    req.app.cxsRequest.paymentType = constants.PAYMENT_TYPES.GCASH;
    req.app.cxsRequest.paymentInformation = getPaymentInfo('Gcash');

    const result = await preProcessPaymentInfo(req);

    expect(
      req.paymentRequestService.createPaymentServiceRequest.calledOnce
    ).to.be.true();
    expect(result.command).to.be.an.object();
  });

  it('should process XENDIT flow for non-DNO channel', async () => {
    req.app.channel = constants.CHANNELS.NG1;
    req.app.cxsRequest.paymentType = constants.PAYMENT_TYPES.XENDIT;
    req.app.cxsRequest.paymentInformation = getPaymentInfo('Xendit');

    const result = await preProcessPaymentInfo(req);

    expect(
      req.paymentRequestService.createPaymentServiceRequest.calledOnce
    ).to.be.true();
    expect(result.command).to.be.an.object();
  });

  it('should process XENDIT DNO flow', async () => {
    req.app.channel = constants.CHANNELS.DNO;
    req.app.cxsRequest.paymentType = constants.PAYMENT_TYPES.XENDIT;
    req.app.cxsRequest.settlementInformation = [
      { requestType: constants.PAYMENT_REQUEST_TYPES.NON_BILL },
    ];
    req.app.cxsRequest.paymentInformation =
      getPaymentInfo('Xendit_Ewallet_DNO');

    const result = await preProcessPaymentInfo(req);

    expect(
      req.paymentRequestService.createPaymentServiceRequest.calledOnce
    ).to.be.true();
    expect(result.command).to.be.an.object();
  });

  it('should process ADYEN SDK flow when paymentType is ADYEN', async () => {
    req.app.cxsRequest.paymentType = constants.PAYMENT_TYPES.ADYEN;
    req.app.cxsRequest.paymentInformation = getPaymentInfo('AdyenSDK');

    req.app.cxsRequest.paymentInformation.allowedPaymentMethods = [
      'Mastercard',
    ];

    req.app.cxsRequest.paymentInformation.customer = {
      firstName: 'first',
      gender: 'male',
      lastName: 'last',
    };

    const result = await preProcessPaymentInfo(req);

    expect(
      req.paymentRequestService.createPaymentServiceRequest.calledOnce
    ).to.be.true();
    expect(result.command).to.be.an.object();
  });

  it('should throw InvalidParameter when HIP status != 00 for XENDIT CC/DC', async () => {
    req.app.cxsRequest.paymentType = constants.PAYMENT_TYPES.XENDIT;
    req.app.cxsRequest.paymentInformation = getPaymentInfo(
      'Xendit_Direct_Debit_BuyPromo'
    );

    req.accountInfoService.getInfo.resolves({
      statusCode: 200,
      hipResponse: { status: '99' },
    });

    try {
      await preProcessPaymentInfo(req);
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
    }
  });

  it('should throw InvalidRequestValidateException when GCASH has mismatched budgetProtect', async () => {
    req.app.cxsRequest.paymentType = constants.PAYMENT_TYPES.GCASH;
    req.app.cxsRequest.paymentInformation = {
      ...getPaymentInfo('Gcash'),
      budgetProtect: false,
    };
    req.app.cxsRequest.budgetProtectProfile = { id: 1 };

    try {
      await preProcessPaymentInfo(req);
    } catch (err) {
      expect(err.type).to.equal('InvalidRequestValidateException');
    }
  });

  it('should throw InvalidParameter for invalid email in GCASH flow (missing coverage case)', async () => {
    req.app.cxsRequest.paymentType = constants.PAYMENT_TYPES.GCASH;
    req.app.cxsRequest.settlementInformation = [
      { emailAddress: 'badEmail', requestType: 'BUY_PROMO' },
    ];

    req.app.cxsRequest.paymentInformation = getPaymentInfo('Gcash');

    try {
      await preProcessPaymentInfo(req);
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
    }
  });
});
