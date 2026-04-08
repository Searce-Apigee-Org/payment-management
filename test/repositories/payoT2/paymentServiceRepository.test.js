import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import {
  createWebSessionT2,
  getAccessTokenT2,
  requestRefundByTokenIdT2,
} from '../../../src/repositories/payoT2/paymentServiceRepository.js';

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

describe('Repository :: GPAYO T2 :: paymentRepository :: getAccessTokenT2', () => {
  const mockQuery = 'client-id:client-secret';

  const mockAccessTokenResponse = {
    accessToken: 'mock-access-token',
    expiresIn: 3600,
  };

  it('should throw OperationFailed when request fails', async () => {
    http.post.rejects(new Error('Network failure'));

    try {
      await getAccessTokenT2(http, mockQuery);
    } catch (err) {
      expect(err).to.be.an.object();
      expect(err.type).to.equal('OperationFailed');
    }
  });

  it('should return an access token when request succeeds', async () => {
    const stub = http.post.resolves(mockAccessTokenResponse);

    const response = await getAccessTokenT2(http, mockQuery);

    expect(stub.calledOnce).to.be.true();
    expect(response).to.equal(mockAccessTokenResponse);
  });
});

describe('Repository :: GPAYO T2 :: paymentRepository :: createWebSessionT2', () => {
  const mockHeaders = { Authorization: `Bearer MockAuth` };

  const mockPayload = {
    transactionId: 'txn_123',
    amount: 100,
  };

  const mockPaymentSessionResponse = {
    customerInfos: 'mock Customer Info',
    settlementInfos: 'settlementInfo',
    allowedPaymentMethods: 'payload.allowedPaymentMethods',
  };

  it('should throw OperationFailed when request fails', async () => {
    http.post.rejects(new Error('Timeout'));

    try {
      await createWebSessionT2(http, mockPayload, mockHeaders);
    } catch (err) {
      expect(err).to.be.an.object();
      expect(err.type).to.equal('OperationFailed');
    }
  });

  it('should return session details when request succeeds', async () => {
    const stub = http.post.resolves(mockPaymentSessionResponse);

    const response = await createWebSessionT2(http, mockPayload, mockHeaders);

    expect(stub.calledOnce).to.be.true();
    expect(response).to.equal(mockPaymentSessionResponse);
  });
});

describe('Repository :: GPAYO T2 :: paymentRepository :: requestRefundByTokenIdT2', () => {
  const mockHeaders = { Authorization: `Bearer MockAuth` };

  const mockPayload = {
    transactionId: 'txn_123',
    amount: 100,
  };

  const mockPaymentSessionResponse = {
    customerInfos: 'mock Customer Info',
    settlementInfos: 'settlementInfo',
    allowedPaymentMethods: 'payload.allowedPaymentMethods',
  };

  it('should throw OperationFailed when request fails', async () => {
    http.post.rejects(new Error('Timeout'));

    try {
      await requestRefundByTokenIdT2(http, mockPayload, mockHeaders);
    } catch (err) {
      expect(err).to.be.an.object();
      expect(err.type).to.equal('OperationFailed');
    }
  });

  it('should return server acceptance when request succeeds', async () => {
    const stub = http.post.resolves(mockPaymentSessionResponse);

    const response = await requestRefundByTokenIdT2(
      http,
      mockPayload,
      mockHeaders
    );

    expect(stub.calledOnce).to.be.true();
    expect(response).to.equal(mockPaymentSessionResponse);
  });
});
