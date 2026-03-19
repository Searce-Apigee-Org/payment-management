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
        results: {
          accessToken: 'new-token',
          accessTokenExpiresAt: Math.floor(Date.now() / 1000) + 3600,
        },
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
        results: {
          accessToken: 'token-from-string',
          accessTokenExpiresAt: Math.floor(Date.now() / 1000) + 3600,
        },
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
    it('is not implemented in v1 paymentRefundHelper (sanity)', () => {
      expect(helper.findPaymentSessionDetails).to.be.undefined();
    });
  });

  describe('identifySourceChannel', () => {
    it('is not implemented in v1 paymentRefundHelper (sanity)', () => {
      expect(helper.identifySourceChannel).to.be.undefined();
    });
  });

  describe('isT1PaymentType', () => {
    it('returns true for T1 payment types (case-insensitive)', () => {
      expect(helper.isT1PaymentType('gcash')).to.be.true();
      expect(helper.isT1PaymentType('xEnDiT')).to.be.true();
    });

    it('returns false for non-T1 or empty payment types', () => {
      expect(helper.isT1PaymentType('CARD')).to.be.false();
      expect(helper.isT1PaymentType('')).to.be.false();
      expect(helper.isT1PaymentType(undefined)).to.be.false();
    });
  });

  describe('retrieveGPayOAccessTokenByChannel', () => {
    beforeEach(() => {
      reqMock.payo = {
        paymentRepository: {
          getAccessToken: Sinon.stub(),
        },
      };
      reqMock.tokenStore.gpayoRepository = {
        updateAccessTokenByChannel: Sinon.stub(),
      };
      reqMock.tokenStore.paymentRepository.fetchGPayOAccessTokenByChannel =
        Sinon.stub();
      reqMock.tokenPaymentId = 'tpid-1';
    });

    it('returns cached token if valid', async () => {
      reqMock.tokenStore.paymentRepository.fetchGPayOAccessTokenByChannel.resolves(
        {
          accessToken: 'cached-gpayo-token',
          accessTokenExpiresAt: Math.floor(Date.now() / 1000) + 3600,
        }
      );

      const result = await helper.retrieveGPayOAccessTokenByChannel(
        reqMock,
        'chan'
      );
      expect(result).to.equal('cached-gpayo-token');
    });

    it('fetches new token if cached is expired', async () => {
      reqMock.tokenStore.paymentRepository.fetchGPayOAccessTokenByChannel.resolves(
        {
          accessToken: 'expired-gpayo-token',
          accessTokenExpiresAt: Math.floor(Date.now() / 1000) - 3600,
        }
      );
      secretManagerStub.authorizationRepository.getAuthorizationByChannel.resolves(
        {
          clientId: 'cid',
          clientSecret: 'csecret',
        }
      );
      reqMock.payo.paymentRepository.getAccessToken.resolves({
        accessToken: 'new-gpayo-token',
      });
      reqMock.tokenStore.gpayoRepository.updateAccessTokenByChannel.resolves();

      const result = await helper.retrieveGPayOAccessTokenByChannel(
        reqMock,
        'chan'
      );
      expect(result).to.equal('new-gpayo-token');
    });

    it('throws error if channelId is not provided', async () => {
      reqMock.tokenStore.paymentRepository.fetchGPayOAccessTokenByChannel.resolves(
        null
      );

      try {
        await helper.retrieveGPayOAccessTokenByChannel(reqMock, undefined);
        throw new Error('Expected failure but succeeded');
      } catch (err) {
        expect(err.message).to.match(
          /Unable to determine clientId for secret manager fetch \(GPayO\)/
        );
      }
    });

    it('throws error if getAuthorizationByChannel returns invalid format', async () => {
      reqMock.tokenStore.paymentRepository.fetchGPayOAccessTokenByChannel.resolves(
        {
          accessToken: 'expired-gpayo-token',
          accessTokenExpiresAt: Math.floor(Date.now() / 1000) - 3600,
        }
      );
      secretManagerStub.authorizationRepository.getAuthorizationByChannel.resolves(
        12345
      );

      try {
        await helper.retrieveGPayOAccessTokenByChannel(reqMock, 'chan');
        throw new Error('Expected failure but succeeded');
      } catch (err) {
        expect(err.message).to.match(/Invalid credentials format/);
      }
    });

    it('handles getAuthorizationByChannel returning string with ":"', async () => {
      reqMock.tokenStore.paymentRepository.fetchGPayOAccessTokenByChannel.resolves(
        {
          accessToken: 'expired-gpayo-token',
          accessTokenExpiresAt: Math.floor(Date.now() / 1000) - 3600,
        }
      );
      secretManagerStub.authorizationRepository.getAuthorizationByChannel.resolves(
        'cid:secret'
      );
      reqMock.payo.paymentRepository.getAccessToken.resolves({
        accessToken: 'token-from-string',
      });
      reqMock.tokenStore.gpayoRepository.updateAccessTokenByChannel.resolves();

      const result = await helper.retrieveGPayOAccessTokenByChannel(
        reqMock,
        'chan'
      );
      expect(result).to.equal('token-from-string');
    });

    it('returns undefined if getAccessToken returns no accessToken', async () => {
      reqMock.tokenStore.paymentRepository.fetchGPayOAccessTokenByChannel.resolves(
        {
          accessToken: 'expired-gpayo-token',
          accessTokenExpiresAt: Math.floor(Date.now() / 1000) - 3600,
        }
      );
      secretManagerStub.authorizationRepository.getAuthorizationByChannel.resolves(
        {
          clientId: 'cid',
          clientSecret: 'csecret',
        }
      );
      reqMock.payo.paymentRepository.getAccessToken.resolves({});
      reqMock.tokenStore.gpayoRepository.updateAccessTokenByChannel.resolves();

      const result = await helper.retrieveGPayOAccessTokenByChannel(
        reqMock,
        'chan'
      );
      expect(result).to.be.undefined();
    });

    it('calls updateAccessTokenByChannel with JSON-stringified token', async () => {
      reqMock.tokenStore.paymentRepository.fetchGPayOAccessTokenByChannel.resolves(
        {
          accessToken: 'expired-gpayo-token',
          accessTokenExpiresAt: Math.floor(Date.now() / 1000) - 3600,
        }
      );
      secretManagerStub.authorizationRepository.getAuthorizationByChannel.resolves(
        {
          clientId: 'cid',
          clientSecret: 'csecret',
        }
      );
      reqMock.payo.paymentRepository.getAccessToken.resolves({
        accessToken: 'store-me-token',
      });
      reqMock.tokenStore.gpayoRepository.updateAccessTokenByChannel.resolves();

      await helper.retrieveGPayOAccessTokenByChannel(reqMock, 'chan');

      Sinon.assert.calledOnce(
        reqMock.tokenStore.gpayoRepository.updateAccessTokenByChannel
      );
      const [, , storedToken] =
        reqMock.tokenStore.gpayoRepository.updateAccessTokenByChannel.firstCall
          .args;
      expect(storedToken).to.equal(JSON.stringify('store-me-token'));
    });
  });
});
