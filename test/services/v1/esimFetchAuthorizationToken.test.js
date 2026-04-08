import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { getAuthorizationToken } from '../../../src/services/v1/esimFetchAuthorizationToken.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Service :: EsimFetchAuthorizationToken :: getAuthorizationToken', () => {
  let reqMock;
  let getAccessTokenStub,
    fetchAccessTokenByChannelStub,
    updateAccessTokenByChannelStub,
    getAuthorizationByChannelStub;

  beforeEach(() => {
    reqMock = {
      pre: {
        reqClientId: 'client-1',
      },
      http: {},
      payment: {
        paymentRepository: {
          getAccessToken: Sinon.stub(),
        },
      },
      tokenStore: {
        paymentRepository: {
          fetchAccessTokenByChannel: Sinon.stub(),
          updateAccessTokenByChannel: Sinon.stub(),
        },
      },
      tokenStoreClient: {},
      secretManager: {
        authorizationRepository: {
          getAuthorizationByChannel: Sinon.stub(),
        },
      },
      secretManagerClient: {},
    };

    getAccessTokenStub = reqMock.payment.paymentRepository.getAccessToken;
    fetchAccessTokenByChannelStub =
      reqMock.tokenStore.paymentRepository.fetchAccessTokenByChannel;
    updateAccessTokenByChannelStub =
      reqMock.tokenStore.paymentRepository.updateAccessTokenByChannel;
    getAuthorizationByChannelStub =
      reqMock.secretManager.authorizationRepository.getAuthorizationByChannel;
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should throw error when authorization credentials are invalid', async () => {
    getAuthorizationByChannelStub.rejects(new Error('Bad credentials'));

    try {
      await getAuthorizationToken(reqMock);
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err.message).to.equal('Bad credentials');
    }
  });

  it('should throw if getAccessToken returns no results', async () => {
    getAccessTokenStub.resolves({});
    getAuthorizationByChannelStub.resolves('client:secret');

    const token = await getAuthorizationToken(reqMock);

    expect(token).to.be.undefined();
    Sinon.assert.calledOnce(getAccessTokenStub);
  });

  it('should return cached token if not expired', async () => {
    const nowInSeconds = Math.floor(Date.now() / 1000);

    fetchAccessTokenByChannelStub.resolves({
      accessToken: 'cached-token-456',
      accessTokenExpiresAt: nowInSeconds + 100,
    });
    updateAccessTokenByChannelStub.rejects(
      new Error('Should not update token')
    );

    const token = await getAuthorizationToken(reqMock);

    expect(token).to.equal('cached-token-456');
    Sinon.assert.calledOnce(fetchAccessTokenByChannelStub);
    Sinon.assert.notCalled(updateAccessTokenByChannelStub);
  });

  it('should fetch new token if no cached token', async () => {
    getAccessTokenStub.resolves({
      results: { accessToken: 'new-token-123' },
    });
    fetchAccessTokenByChannelStub.resolves(null);
    updateAccessTokenByChannelStub.resolves();
    getAuthorizationByChannelStub.resolves('client:secret');

    const token = await getAuthorizationToken(reqMock);

    expect(token).to.equal('new-token-123');
    Sinon.assert.calledOnce(getAccessTokenStub);
    Sinon.assert.calledOnce(updateAccessTokenByChannelStub);
  });

  it('should fetch new token if cached token is expired', async () => {
    const nowInSeconds = Math.floor(Date.now() / 1000);

    getAccessTokenStub.resolves({
      results: { accessToken: 'new-token-123' },
    });
    fetchAccessTokenByChannelStub.resolves({
      accessToken: 'expired-token',
      accessTokenExpiresAt: nowInSeconds - 10,
    });
    updateAccessTokenByChannelStub.resolves();
    getAuthorizationByChannelStub.resolves('client:secret');

    const token = await getAuthorizationToken(reqMock);

    expect(token).to.equal('new-token-123');
    Sinon.assert.calledOnce(getAccessTokenStub);
    Sinon.assert.calledOnce(updateAccessTokenByChannelStub);
  });

  it('should update token store after fetching new token', async () => {
    let updated = false;

    getAccessTokenStub.resolves({
      results: { accessToken: 'new-token-123' },
    });
    fetchAccessTokenByChannelStub.resolves(null);
    updateAccessTokenByChannelStub.callsFake(async () => {
      updated = true;
    });
    getAuthorizationByChannelStub.resolves('client:secret');

    const token = await getAuthorizationToken(reqMock);

    expect(token).to.equal('new-token-123');
    expect(updated).to.be.true();
    Sinon.assert.calledOnce(updateAccessTokenByChannelStub);
  });
});
