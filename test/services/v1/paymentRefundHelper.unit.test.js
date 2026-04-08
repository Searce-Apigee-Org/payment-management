import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import * as helper from '../../../src/services/v1/paymentRefundHelper.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Service :: PaymentRefundHelper', () => {
  let reqMock,
    tokenStoreStub,
    secretManagerStub,
    paymentStub,
    httpStub,
    mongoStub;

  beforeEach(() => {
    tokenStoreStub = {
      paymentRepository: {
        fetchAccessTokenByChannel: Sinon.stub(),
        updateAccessTokenByChannel: Sinon.stub(),
      },
    };
    secretManagerStub = {
      authorizationRepository: {
        getAuthorizationByChannel: Sinon.stub(),
      },
    };
    paymentStub = {
      paymentRepository: {
        getAccessToken: Sinon.stub(),
      },
    };
    httpStub = {};
    mongoStub = {
      customerPaymentsRepository: {
        find: Sinon.stub(),
      },
    };

    reqMock = {
      tokenStore: tokenStoreStub,
      tokenStoreClient: {},
      secretManager: secretManagerStub,
      secretManagerClient: {},
      payment: paymentStub,
      http: httpStub,
      paymentId: 'pid-1',
      headers: {},
      server: { app: { dataDictionary: {} } },
    };
  });

  afterEach(() => {
    Sinon.restore();
  });

  describe('retrievePaymentServiceAccessToken', () => {
    it('returns cached token if valid', async () => {
      tokenStoreStub.paymentRepository.fetchAccessTokenByChannel.resolves({
        accessToken: 'cached-token',
        accessTokenExpiresAt: Math.floor(Date.now() / 1000) + 3600,
      });

      const result = await helper.retrievePaymentServiceAccessToken(
        reqMock,
        'chan'
      );
      expect(result).to.equal('cached-token');
    });

    it('fetches new token if cached is expired', async () => {
      tokenStoreStub.paymentRepository.fetchAccessTokenByChannel.resolves({
        accessToken: 'expired-token',
        accessTokenExpiresAt: Math.floor(Date.now() / 1000) - 3600,
      });
      secretManagerStub.authorizationRepository.getAuthorizationByChannel.resolves(
        {
          clientId: 'cid',
          clientSecret: 'csecret',
        }
      );
      paymentStub.paymentRepository.getAccessToken.resolves({
        accessToken: 'new-token',
      });
      tokenStoreStub.paymentRepository.updateAccessTokenByChannel.resolves();

      const result = await helper.retrievePaymentServiceAccessToken(
        reqMock,
        'chan'
      );
      expect(result).to.equal('new-token');
    });

    it('throws error if clientId not found', async () => {
      tokenStoreStub.paymentRepository.fetchAccessTokenByChannel.resolves(null);
      try {
        await helper.retrievePaymentServiceAccessToken(reqMock, undefined);
        throw new Error('Expected failure but succeeded');
      } catch (err) {
        expect(err.message).to.match(/Unable to determine clientId/);
      }
    });

    it('throws error if getAuthorizationByChannel returns invalid format', async () => {
      tokenStoreStub.paymentRepository.fetchAccessTokenByChannel.resolves({
        accessToken: 'expired-token',
        accessTokenExpiresAt: Math.floor(Date.now() / 1000) - 3600,
      });
      secretManagerStub.authorizationRepository.getAuthorizationByChannel.resolves(
        12345
      );
      try {
        await helper.retrievePaymentServiceAccessToken(reqMock, 'chan');
        throw new Error('Expected failure but succeeded');
      } catch (err) {
        expect(err.message).to.match(/Invalid credentials format/);
      }
    });

    it('handles getAuthorizationByChannel returning string with ":"', async () => {
      tokenStoreStub.paymentRepository.fetchAccessTokenByChannel.resolves({
        accessToken: 'expired-token',
        accessTokenExpiresAt: Math.floor(Date.now() / 1000) - 3600,
      });
      secretManagerStub.authorizationRepository.getAuthorizationByChannel.resolves(
        'cid:secret'
      );
      paymentStub.paymentRepository.getAccessToken.resolves({
        accessToken: 'token-from-string',
      });
      tokenStoreStub.paymentRepository.updateAccessTokenByChannel.resolves();

      const result = await helper.retrievePaymentServiceAccessToken(
        reqMock,
        'chan'
      );
      expect(result).to.equal('token-from-string');
    });

    it('returns undefined if getAccessToken returns no accessToken', async () => {
      tokenStoreStub.paymentRepository.fetchAccessTokenByChannel.resolves({
        accessToken: 'expired-token',
        accessTokenExpiresAt: Math.floor(Date.now() / 1000) - 3600,
      });
      secretManagerStub.authorizationRepository.getAuthorizationByChannel.resolves(
        {
          clientId: 'cid',
          clientSecret: 'csecret',
        }
      );
      paymentStub.paymentRepository.getAccessToken.resolves({});
      tokenStoreStub.paymentRepository.updateAccessTokenByChannel.resolves();

      const result = await helper.retrievePaymentServiceAccessToken(
        reqMock,
        'chan'
      );
      expect(result).to.be.undefined();
    });
  });

  describe('findPaymentSessionDetails', () => {
    it('returns payment session from mongo repo', async () => {
      mongoStub.customerPaymentsRepository.find.resolves({
        Item: { foo: 'bar' },
      });
      const result = await helper.findPaymentSessionDetails(
        'tid-123',
        mongoStub
      );
      expect(result).to.equal({ foo: 'bar' });
    });

    it('returns undefined if Item is missing', async () => {
      mongoStub.customerPaymentsRepository.find.resolves({});
      const result = await helper.findPaymentSessionDetails(
        'tid-123',
        mongoStub
      );
      expect(result).to.be.undefined();
    });
  });

  describe('identifySourceChannel', () => {
    it('returns undefined for unknown prefix', () => {
      const result = helper.identifySourceChannel('ZZZ12345');
      expect(result).to.be.undefined();
    });
  });
});
