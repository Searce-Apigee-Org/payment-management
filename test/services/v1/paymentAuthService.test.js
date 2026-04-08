import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import sinon from 'sinon';
import { getAuthorizationToken } from '../../../src/services/v1/paymentAuthService.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;
export { lab };

describe('Service :: v1 :: paymentAuthService :: getAuthorizationToken', () => {
  let req;

  beforeEach(() => {
    req = {
      tokenStore: {
        tokenRepository: {
          getPaymentServiceToken: sinon.stub(),
          putPaymentServiceToken: sinon.stub(),
        },
      },
      secretManager: {
        paymentServiceRepository: {
          getPaymentServiceCredentials: sinon.stub(),
        },
      },
      payo: {
        paymentServiceRepository: {
          getAccessToken: sinon.stub(),
        },
      },
      http: {},
      secret: 'mock-secret',
    };
  });

  afterEach(() => sinon.restore());

  it('should return cached valid access token', async () => {
    const mockTokenObject = {
      accessToken: {
        accessToken: 'cached-valid-token',
        accessTokenExpiresAt: Math.floor(Date.now() / 1000) + 3600, // still valid
      },
    };

    req.tokenStore.tokenRepository.getPaymentServiceToken.resolves(
      mockTokenObject
    );

    const result = await getAuthorizationToken('client-001', req);

    expect(result).to.equal('cached-valid-token');
    expect(
      req.tokenStore.tokenRepository.getPaymentServiceToken.calledOnce
    ).to.be.true();
    expect(
      req.secretManager.paymentServiceRepository.getPaymentServiceCredentials
        .called
    ).to.be.false();
    expect(
      req.payo.paymentServiceRepository.getAccessToken.called
    ).to.be.false();
  });

  it('should fetch new token if none exists', async () => {
    req.tokenStore.tokenRepository.getPaymentServiceToken.resolves(null);

    // simulate credential retrieval and base64 decode flow
    const mockCredentials =
      'Basic ' + Buffer.from('clientA:secretA').toString('base64');
    req.secretManager.paymentServiceRepository.getPaymentServiceCredentials.resolves(
      mockCredentials
    );

    const mockTokenResponse = {
      results: {
        accessToken: 'new-access-token',
        accessTokenExpiresAt: Math.floor(Date.now() / 1000) + 3600,
      },
    };
    req.payo.paymentServiceRepository.getAccessToken.resolves(
      mockTokenResponse
    );

    const result = await getAuthorizationToken('client-001', req);

    expect(result).to.equal('new-access-token');
    expect(
      req.secretManager.paymentServiceRepository.getPaymentServiceCredentials
        .calledOnce
    ).to.be.true();
    expect(
      req.payo.paymentServiceRepository.getAccessToken.calledOnce
    ).to.be.true();
    expect(
      req.tokenStore.tokenRepository.putPaymentServiceToken.calledOnce
    ).to.be.true();
  });

  it('should fetch new token if cached one is expired', async () => {
    const mockTokenObject = {
      accessToken: {
        accessToken: 'expired-token',
        accessTokenExpiresAt: Math.floor(Date.now() / 1000) - 10, // expired
      },
    };
    req.tokenStore.tokenRepository.getPaymentServiceToken.resolves(
      mockTokenObject
    );

    const mockCredentials =
      'Basic ' + Buffer.from('clientB:secretB').toString('base64');
    req.secretManager.paymentServiceRepository.getPaymentServiceCredentials.resolves(
      mockCredentials
    );

    const mockTokenResponse = {
      results: {
        accessToken: 'fresh-token',
        accessTokenExpiresAt: Math.floor(Date.now() / 1000) + 3600,
      },
    };
    req.payo.paymentServiceRepository.getAccessToken.resolves(
      mockTokenResponse
    );

    const result = await getAuthorizationToken('client-002', req);

    expect(result).to.equal('fresh-token');
    expect(
      req.secretManager.paymentServiceRepository.getPaymentServiceCredentials
        .calledOnce
    ).to.be.true();
    expect(
      req.payo.paymentServiceRepository.getAccessToken.calledOnce
    ).to.be.true();
    expect(
      req.tokenStore.tokenRepository.putPaymentServiceToken.calledOnce
    ).to.be.true();
  });

  it('should gracefully handle errors and return undefined', async () => {
    req.tokenStore.tokenRepository.getPaymentServiceToken.rejects(
      new Error('DB read failure')
    );

    const result = await getAuthorizationToken('client-999', req);

    expect(result).to.be.undefined();
    expect(
      req.secretManager.paymentServiceRepository.getPaymentServiceCredentials
        .called
    ).to.be.false();
  });
});
