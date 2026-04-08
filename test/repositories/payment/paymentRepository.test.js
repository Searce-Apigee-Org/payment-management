import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import {
  esimPaymentSession,
  getAccessToken,
} from '../../../src/repositories/payment/paymentRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;
export { lab };

let http;

beforeEach(() => {
  http = {
    get: Sinon.stub(),
    post: Sinon.stub(),
  };
});

afterEach(() => {
  Sinon.restore();
});

describe('Repository :: HIP :: paymentRepository :: getAccessToken', () => {
  const mockQuery = {
    clientId: 'test-client',
    clientSecret: 'test-secret',
  };

  const mockAccessTokenResponse = {
    accessToken: 'mock-access-token',
    expiresIn: 3600,
  };

  it('should throw OperationFailed when request fails', async () => {
    http.get.rejects(new Error('Network failure'));

    try {
      await getAccessToken(http, mockQuery);
    } catch (err) {
      expect(err).to.be.an.object();
      expect(err.type).to.equal('OperationFailed');
    }
  });

  it('should return an access token when request succeeds', async () => {
    const stub = http.get.resolves(mockAccessTokenResponse);

    const response = await getAccessToken(http, mockQuery);

    expect(stub.calledOnce).to.be.true();
    expect(response).to.equal(mockAccessTokenResponse);
  });
});

describe('Repository :: HIP :: paymentRepository :: esimPaymentSession', () => {
  const mockHeaders = {
    'x-request-id': '12345',
  };

  const mockPayload = {
    transactionId: 'txn_123',
    amount: 100,
  };

  const mockPaymentSessionResponse = {
    status: 'success',
    sessionId: 'session-123',
  };

  it('should throw OperationFailed when request fails', async () => {
    http.post.rejects(new Error('Timeout'));

    try {
      await esimPaymentSession(http, mockPayload, mockHeaders);
    } catch (err) {
      expect(err).to.be.an.object();
      expect(err.type).to.equal('OperationFailed');
    }
  });

  it('should return session details when request succeeds', async () => {
    const stub = http.post.resolves(mockPaymentSessionResponse);

    const response = await esimPaymentSession(http, mockPayload, mockHeaders);

    expect(stub.calledOnce).to.be.true();
    expect(response).to.equal(mockPaymentSessionResponse);
  });
});
