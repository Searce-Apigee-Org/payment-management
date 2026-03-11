import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { createWebPaymentSession } from '../../../src/services/v2/createWebPaymentSessionService.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;
export { lab };

describe('Service :: createWebPaymentSessionService', () => {
  let reqMock;
  let dataDictionaryData;

  beforeEach(() => {
    dataDictionaryData = {
      event_detail: {
        request_authorization: {},
        request_parameters: {},
        response_parameters: {},
      },
    };
    reqMock = {
      app: {
        principalId: 'principal-123',
        dataDictionary: {
          setDataDictionary: (_, data) => {
            Object.assign(dataDictionaryData, data.event_detail || {});
            if (data.transaction_status) {
              dataDictionaryData.transaction_status = data.transaction_status;
            }
          },
        },
      },
      headers: { 'user-token': 'user-token-456' },
      payload: {
        customerInfo: { customerId: 'cust-001', customerName: 'Jane Doe' },
        settlementInfo: {
          breakdown: [
            {
              transactionType: 'G',
              requestType: 'BuyLoad',
              amount: 100,
              mobileNumber: '09171234567',
              transactions: [
                {
                  amount: 100,
                  keyword: 'LOAD10',
                  wallet: 'A',
                  serviceId: '12345',
                },
              ],
            },
          ],
        },
        allowedPaymentMethods: ['CARD'],
        notificationUrls: {
          successUrl: 'https://success.url',
          failureUrl: 'https://fail.url',
        },
      },
      pre: { reqClientId: 'mock-client-id', user: { uuid: 'abc-def' } },
      http: {},
      payment: {
        customerPaymentsRepository: {
          create: Sinon.stub().resolves({}),
        },
      },
      serviceHelpers: {
        webPaymentSessionService: {
          createWebPaymentSessionRequest: Sinon.stub().resolves(),
          insertWebPaymentSessionToDB: Sinon.stub().resolves(),
        },
      },
      tokenStore: {
        paymentRepository: {
          fetchAccessTokenByChannel: Sinon.stub().resolves(null),
          updateAccessTokenByChannel: Sinon.stub().resolves(),
        },
      },
      tokenStoreClient: {},
      secretManager: {
        paymentServiceRepository: {
          get: Sinon.stub().resolves(
            '{\"principal-123\": \"clientId:clientSecret\"}'
          ),
        },
        oonaRepository: {
          getPricing: Sinon.stub().resolves(
            '{\"OONA_COMP_TRAVEL\":{\"4\":{\"productCode\":\"WORLDWIDE-1M\",\"duration\":7,\"pricing\":{\"net\":1.23},\"minimumValidityInDays\":1,\"maximumValidityInDays\":7,\"nfServiceId\":11282,\"nfServiceParam\":\"7D49\"}}}'
          ),
        },
      },
      secretManagerClient: {},
      payoT2: {
        paymentServiceRepository: {
          createWebSessionT2: Sinon.stub().resolves({
            result: {
              paymentId: 'PAY123',
              webSessionUrl: 'https://mock.url/session',
              authorization: 'auth-token',
              ttl: 3600,
            },
          }),
          getAccessTokenT2: Sinon.stub().resolves({
            accessToken: 'mock-access-token',
          }),
        },
      },
      payoT2AuthService: {
        retrieveGPayOAccessToken: Sinon.stub().resolves('mock-access-token'),
      },
      oonaService: {
        applyOonaPricingForV2: () => {},
      },
      singlifeService: {
        computeSinglifePricing: () => {},
      },
    };
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should create a web payment session successfully', async () => {
    // Ensure the stub returns a valid response
    reqMock.serviceHelpers.webPaymentSessionService = {
      createWebPaymentSessionRequest: Sinon.stub().resolves({
        paymentId: 'PAY123',
        webSessionUrl: 'https://mock.url/session',
        authorization: 'auth-token',
        ttl: 3600,
      }),
      insertWebPaymentSessionToDB: Sinon.stub().resolves(),
    };
    const res = await createWebPaymentSession(reqMock);

    expect(res).to.equal({
      tokenPaymentId: 'PAY123',
      webSessionUrl: 'https://mock.url/session',
      webSessionToken: 'auth-token',
      ttl: 3600,
    });
  });

  it('should call applyOona for Oona transaction', async () => {
    reqMock.serviceHelpers.webPaymentSessionService = {
      createWebPaymentSessionRequest: Sinon.stub().resolves({
        paymentId: 'PAY123',
        webSessionUrl: 'https://mock.url/session',
        authorization: 'auth-token',
        ttl: 3600,
      }),
      insertWebPaymentSessionToDB: Sinon.stub().resolves(),
    };
    // Stub only for this test
    const oonaStub = Sinon.stub(
      reqMock.oonaService,
      'applyOonaPricingForV2'
    ).callsFake(async (req) => {
      if (req.payload.settlementInfo.breakdown[0]) {
        req.payload.settlementInfo.breakdown[0].amount = 1.23;
      }
    });
    reqMock.payload.settlementInfo.breakdown = [
      {
        mobileNumber: '09171234567',
        transactionType: 'O',
        transactions: [
          {
            transactionProfile: {
              firstName: 'g',
              middleName: '',
              lastName: 'g',
              endDate: '2025-10-30',
              startDate: '2025-09-30',
              email: 'g.g@globe',
              mobileNumber: '09171234567',
            },
            oonaSkus: ['OonaCompTravel-4'],
          },
        ],
      },
    ];
    const oonaPriceList = {
      OONA_COMP_TRAVEL: {
        4: { pricing: { net: '1.23' } },
      },
      OONA_SMART_DELAY: { base: { net: 10 }, additional: { net: 5 } },
    };
    reqMock.secretManagerClient.get = Sinon.stub().resolves(
      JSON.stringify(oonaPriceList)
    );

    await createWebPaymentSession(reqMock);

    const finalAmount = reqMock.payload.settlementInfo.breakdown[0].amount;
    expect(finalAmount).to.be.a.number();
    expect(finalAmount).to.equal(1.23);
    oonaStub.restore();
  });

  it('should call computeSinglifePricing for S-type transaction', async () => {
    reqMock.serviceHelpers.webPaymentSessionService = {
      createWebPaymentSessionRequest: Sinon.stub().resolves({
        paymentId: 'PAY123',
        webSessionUrl: 'https://mock.url/session',
        authorization: 'auth-token',
        ttl: 3600,
      }),
      insertWebPaymentSessionToDB: Sinon.stub().resolves(),
    };
    // Stub only for this test
    const singlifeStub = Sinon.stub(
      reqMock.singlifeService,
      'computeSinglifePricing'
    ).callsFake(async (req) => {
      const sItem = req.payload.settlementInfo.breakdown[1];
      if (sItem && sItem.transactions && sItem.transactions[0]) {
        sItem.transactions[0].transactionProfile.chargeAmount = 10;
        sItem.transactions[0].transactionProfile.chargeRate = 10;
        sItem.transactions[0].transactionProfile.chargeType = 'percentage';
      }
    });
    reqMock.payload.settlementInfo.breakdown = [
      {
        transactionType: 'N',
        requestType: 'BuyLoad',
        amount: 100,
        mobileNumber: '09171234567',
        transactions: [
          {
            amount: 100,
            keyword: 'LOAD10',
            wallet: 'A',
            serviceId: '12345',
          },
        ],
      },
      {
        transactionType: 'S',
        transactions: [
          {
            transactionProfile: {
              firstName: 'John',
              lastName: 'Smith',
              email: 'john@example.com',
              dateOfBirth: '1990-01-01',
              gender: 'Male',
            },
          },
        ],
      },
    ];
    const getBudgetProtectConfig = {
      budgetProtectConfig: {
        requestTypeAllowed: ['BuyLoad'],
        rate: 10,
        rateType: 'percentage',
      },
    };
    reqMock.secretManager.paymentServiceRepository.get.resolves(
      JSON.stringify(getBudgetProtectConfig)
    );

    await createWebPaymentSession(reqMock);

    const sItem = reqMock.payload.settlementInfo.breakdown[1];
    expect(sItem.transactions[0].transactionProfile.chargeAmount).to.equal(10);
    expect(sItem.transactions[0].transactionProfile.chargeRate).to.equal(10);
    expect(sItem.transactions[0].transactionProfile.chargeType).to.equal(
      'percentage'
    );
    singlifeStub.restore();
  });

  it('should catch and rethrow errors from createWebPaymentSessionRequest', async () => {
    const error = new Error('Simulated error');
    reqMock.serviceHelpers.webPaymentSessionService = {
      createWebPaymentSessionRequest: Sinon.stub().throws(error),
      insertWebPaymentSessionToDB: Sinon.stub().resolves(),
    };
    await expect(createWebPaymentSession(reqMock)).to.reject(
      Error,
      'Simulated error'
    );
  });
});
