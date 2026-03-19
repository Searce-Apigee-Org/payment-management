import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { createEsimPaymentSession } from '../../../src/services/v1/esimPaymentSessionCreationService.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Service :: EsimPaymentSessionCreationService :: createEsimPaymentSession', () => {
  let reqMock;
  let getAccessTokenStub,
    esimPaymentSessionStub,
    putCustomerPaymentsStub,
    fetchAccessTokenByChannelStub,
    updateAccessTokenByChannelStub,
    getESIMAmountValueStub,
    getAuthorizationByChannelStub,
    getAuthorizationTokenStub;

  beforeEach(() => {
    reqMock = {
      app: { dataDictionary: {} },
      headers: {
        deviceid: 'device-123',
        'user-token': 'user-token-456',
      },
      payload: {
        paymentInformation: { type: 'CC_DC' },
        settlementInformation: [
          {
            mobileNumber: '639171234567',
            amount: 10.0,
            requestType: 'BuyESIMLocal',
          },
        ],
        paymentType: 'XENDIT',
      },
      pre: { reqClientId: 'mock-client-id', user: { uuid: 'abc-def' } },
      payment: {
        paymentRepository: {
          getAccessToken: Sinon.stub(),
          esimPaymentSession: Sinon.stub(),
        },
        customerPaymentsRepository: {
          put: Sinon.stub(),
        },
      },
      // mongo: {
      //   customerPaymentsRepository: {
      //     put: Sinon.stub(),
      //   },
      // },
      tokenStore: {
        paymentRepository: {
          fetchAccessTokenByChannel: Sinon.stub(),
          updateAccessTokenByChannel: Sinon.stub(),
        },
      },
      tokenStoreClient: {},
      secretManager: {
        merchantRepository: {
          getEsimMerchantId: Sinon.stub(),
        },
        denominationRepository: {
          getESIMAmountValue: Sinon.stub(),
        },
        productRepository: {
          getProductName: Sinon.stub(),
        },
        authorizationRepository: {
          getAuthorizationByChannel: Sinon.stub(),
        },
      },
      secretManagerClient: {},
      esimFetchAuthorizationToken: {
        getAuthorizationToken: Sinon.stub(),
      },
    };

    getAccessTokenStub = reqMock.payment.paymentRepository.getAccessToken;
    esimPaymentSessionStub =
      reqMock.payment.paymentRepository.esimPaymentSession;
    putCustomerPaymentsStub = reqMock.payment.customerPaymentsRepository.put;
    fetchAccessTokenByChannelStub =
      reqMock.tokenStore.paymentRepository.fetchAccessTokenByChannel;
    updateAccessTokenByChannelStub =
      reqMock.tokenStore.paymentRepository.updateAccessTokenByChannel;
    getESIMAmountValueStub =
      reqMock.secretManager.denominationRepository.getESIMAmountValue;
    getAuthorizationByChannelStub =
      reqMock.secretManager.authorizationRepository.getAuthorizationByChannel;
    getAuthorizationTokenStub =
      reqMock.esimFetchAuthorizationToken.getAuthorizationToken;

    getAccessTokenStub.resolves({
      results: { accessToken: 'access-token-789' },
    });
    esimPaymentSessionStub.resolves({
      status: 200,
      data: { paymentId: 'pay-123' },
    });
    putCustomerPaymentsStub.resolves({});
    fetchAccessTokenByChannelStub.resolves(null);
    updateAccessTokenByChannelStub.resolves();
    getESIMAmountValueStub.resolves([
      { type: 'BuyESIMLocal', amountValue: 10.0 },
    ]);
    getAuthorizationByChannelStub.resolves('client:secret');
    getAuthorizationTokenStub.resolves('mocked-auth-token');
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should throw CustomBadRequestError when amount is invalid', async () => {
    getESIMAmountValueStub.resolves([{ type: 'BuyESIM', amountValue: 10.0 }]);
    reqMock.payload.settlementInformation[0].amount = 99.99;

    try {
      await createEsimPaymentSession(reqMock);
      throw new Error('Expected CustomBadRequestError but succeeded');
    } catch (err) {
      expect(err.type).to.equal('CustomBadRequestError');
      expect(err.details).to.equal('Unable to invoke request');
    }
  });

  it('should throw OperationFailed if esimPaymentSession returns non-200', async () => {
    esimPaymentSessionStub.resolves({ status: 500 });

    try {
      await createEsimPaymentSession(reqMock);
    } catch (err) {
      expect(err).to.exist();
      expect(err.type).to.equal('OperationFailed');
    }
  });

  it('should fail if new access token response has no results', async () => {
    getAccessTokenStub.resolves({});

    try {
      await createEsimPaymentSession(reqMock);
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err).to.exist();
    }
  });

  it('should use cached token if not expired', async () => {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    fetchAccessTokenByChannelStub.resolves({
      accessToken: 'cached-token',
      accessTokenExpiresAt: nowInSeconds + 100,
    });
    updateAccessTokenByChannelStub.rejects(new Error('Should not be called'));

    const res = await createEsimPaymentSession(reqMock);

    expect(res.statusCode).to.equal(201);
    expect(res.result.tokenPaymentId).to.equal('pay-123');
  });

  it('should store productValidity when provided', async () => {
    reqMock.payload.paymentInformation.productValidity = '30 days';

    const res = await createEsimPaymentSession(reqMock);

    expect(res.statusCode).to.equal(201);
    Sinon.assert.calledOnce(putCustomerPaymentsStub);
  });

  it('should fetch new access token if no cached token', async () => {
    getAccessTokenStub.resolves({
      results: { accessToken: 'new-access-token' },
    });
    fetchAccessTokenByChannelStub.resolves(null);

    const res = await createEsimPaymentSession(reqMock);

    expect(res.statusCode).to.equal(201);
  });

  it('should handle GCASH payment with BuyESIMLocal', async () => {
    reqMock.payload.paymentType = 'GCASH';
    reqMock.payload.settlementInformation[0].requestType = 'BuyESIMLocal';
    getESIMAmountValueStub.resolves([
      { type: 'BuyESIMLocal', amountValue: 10.0 },
    ]);

    const res = await createEsimPaymentSession(reqMock);

    expect(res.statusCode).to.equal(201);
  });

  it('should successfully create a payment session', async () => {
    const res = await createEsimPaymentSession(reqMock);

    expect(res.statusCode).to.equal(201);
    expect(res.result.tokenPaymentId).to.equal('pay-123');
  });
});
