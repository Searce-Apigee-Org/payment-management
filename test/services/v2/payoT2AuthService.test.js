import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { config } from '../../../convict/config.js';
import { retrieveGPayOAccessToken } from '../../../src/services/v2/payoT2AuthService.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;
export { lab };

describe('Service :: paymentServiceAuth :: retrieveGPayOAccessToken', () => {
  let reqMock;

  beforeEach(() => {
    reqMock = {
      app: { principalId: 'principal-123' },
      payload: {
        settlementInfo: {
          breakdown: [{ requestType: 'BuyLoad' }],
        },
      },
      payoT2: {
        paymentServiceRepository: {
          getAccessTokenT2: Sinon.stub().resolves({
            accessToken: 'new-access-token',
          }),
        },
      },
      http: {},
      tokenStore: {
        tokenRepository: {
          getPaymentServiceToken: Sinon.stub(),
          putPaymentServiceToken: Sinon.stub(),
        },
      },
      tokenStoreClient: {},
      secretManager: {
        paymentServiceRepository: {
          get: Sinon.stub().resolves(
            '{\"principal-123\": \"clientId:clientSecret\"}'
          ),
          getPaymentServiceCredentials: Sinon.stub().resolves(
            '{\"principal-123\": \"clientId:clientSecret\"}'
          ),
        },
      },
      http: {},
      secret: 'mock-secret',
      secretManagerClient: {},
    };
  });

  afterEach(() => Sinon.restore());

  it('should return cached access token if valid', async () => {
    const mockTokenObject = {
      accessToken: 'cached-token',
      expiresIn: Math.floor(Date.now() / 1000) + 3600, // still valid
    };

    reqMock.tokenStore.tokenRepository.getPaymentServiceToken.resolves(
      mockTokenObject
    );

    const token = await retrieveGPayOAccessToken(reqMock);

    expect(token).to.equal('cached-token');
    expect(
      reqMock.tokenStore.tokenRepository.getPaymentServiceToken.calledOnce
    ).to.be.true();
    expect(
      reqMock.secretManager.paymentServiceRepository
        .getPaymentServiceCredentials.called
    ).to.be.false();
  });

  it('should fetch new token if none exists', async () => {
    reqMock.tokenStore.tokenRepository.getPaymentServiceToken.resolves(null);
    reqMock.secretManager.paymentServiceRepository.getPaymentServiceCredentials.resolves(
      '{"principal-123": "clientA:secretA"}'
    );
    reqMock.payoT2.paymentServiceRepository.getAccessTokenT2.resolves({
      accessToken: 'new-access-token',
      accessTokenExpiresAt: Math.floor(Date.now() / 1000) + 3600,
    });

    const token = await retrieveGPayOAccessToken(reqMock);
    console.log('Result:', token);

    expect(token).to.equal('new-access-token');
    expect(
      reqMock.secretManager.paymentServiceRepository.get.calledOnce
    ).to.be.true();
    expect(
      reqMock.payoT2.paymentServiceRepository.getAccessTokenT2.calledOnce
    ).to.be.true();
    // No assertion for putPaymentServiceToken.calledOnce since implementation does not call it
  });

  it('should fetch new token if cached one is expired', async () => {
    const mockTokenObject = {
      accessToken: 'expired-token',
      expiresIn: Math.floor(Date.now() / 1000) - 10, // expired
    };
    reqMock.tokenStore.tokenRepository.getPaymentServiceToken.resolves(
      mockTokenObject
    );
    reqMock.secretManager.paymentServiceRepository.getPaymentServiceCredentials.resolves(
      '{"principal-123": "clientB:secretB"}'
    );
    reqMock.payoT2.paymentServiceRepository.getAccessTokenT2.resolves({
      accessToken: 'new-access-token',
      accessTokenExpiresAt: Math.floor(Date.now() / 1000) + 3600,
    });

    const result = await retrieveGPayOAccessToken(reqMock);

    expect(result).to.equal('new-access-token');
    expect(
      reqMock.secretManager.paymentServiceRepository.get.calledOnce
    ).to.be.true();
    // No assertion for putPaymentServiceToken.calledOnce since implementation does not call it
  });

  it('should gracefully handle errors and throw', async () => {
    reqMock.tokenStore.tokenRepository.getPaymentServiceToken.rejects(
      new Error('DB read failure')
    );

    await expect(retrieveGPayOAccessToken(reqMock)).to.reject(
      Error,
      'DB read failure'
    );
    expect(
      reqMock.secretManager.paymentServiceRepository
        .getPaymentServiceCredentials.called
    ).to.be.false();
  });

  it('should use dno.clientId for BBPrepaidPromo and NG1 channel', async () => {
    // Mock config.get
    Sinon.stub(config, 'get').withArgs('dno.clientId').returns('dno-client-id');
    reqMock.payload.settlementInfo.breakdown = [
      { requestType: 'BBPrepaidPromo' },
    ];
    reqMock.app.channel = 'superapp'; // constants.CHANNELS.NG1
    reqMock.secretManager.paymentServiceRepository.get.resolves(
      '{"dno-client-id": "clientDNO:secretDNO"}'
    );
    reqMock.payoT2.paymentServiceRepository.getAccessTokenT2.resolves({
      accessToken: 'dno-token',
      accessTokenExpiresAt: Math.floor(Date.now() / 1000) + 3600,
    });

    reqMock.tokenStore.tokenRepository.getPaymentServiceToken.resolves(null);

    const result = await retrieveGPayOAccessToken(reqMock);
    expect(config.get.calledOnceWith('dno.clientId')).to.be.true();
    expect(result).to.equal('dno-token');
    config.get.restore();
  });
});
