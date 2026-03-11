import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import {
  createPayment,
  getAccessToken,
  requestRefundByTokenId,
} from '../../../src/repositories/payo/paymentServiceRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Repository :: Payment Service Repository :: getAccessToken', () => {
  let http;

  beforeEach(() => {
    http = { get: Sinon.stub() };
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should return the response from http.get', async () => {
    const mockResponse = { data: { token: 'abc123' } };
    http.get.resolves(mockResponse);

    const query = { clientId: 'id1', clientSecret: 'sec1' };
    const result = await getAccessToken(query, http);

    expect(result).to.equal(mockResponse);
    expect(http.get.calledOnce).to.be.true();
  });

  it('should throw OperationFailed on http.get failure', async () => {
    http.get.rejects(new Error('network fail'));

    const query = { clientId: 'id1', clientSecret: 'sec1' };

    try {
      await getAccessToken(query, http);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('InternalOperationFailed');
    }
  });
});

describe('Repository :: Payment Service Repository :: createPayment', () => {
  let http;
  let req;

  beforeEach(() => {
    http = { post: Sinon.stub() };
    req = { http };
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should return response from http.post', async () => {
    const mockResponse = { data: { status: 'ok' } };
    http.post.resolves(mockResponse);

    const input = {
      body: { amount: 100 },
      headers: { Authorization: 'Bearer token' },
    };

    const result = await createPayment(input, req);

    expect(result).to.equal(mockResponse);
    expect(http.post.calledOnce).to.be.true();
  });

  it('should throw OperationFailed when http.post rejects', async () => {
    http.post.rejects(new Error('timeout'));

    const input = {
      body: { amount: 100 },
      headers: { Authorization: 'Bearer token' },
    };

    try {
      await createPayment(input, req);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('InternalOperationFailed');
    }
  });
});

describe('Repository :: Payment Service Repository :: requestRefundByTokenId', () => {
  let http;

  beforeEach(() => {
    http = { post: Sinon.stub() };
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should return response from http.post', async () => {
    const mockResponse = { data: { status: 'refunded' } };
    http.post.resolves(mockResponse);

    const payload = { tokenId: 'token123' };
    const headers = { Authorization: 'Bearer token' };

    const result = await requestRefundByTokenId(http, payload, headers);

    expect(result).to.equal(mockResponse);
    expect(http.post.calledOnce).to.be.true();
  });

  it('should throw OperationFailed when http.post rejects', async () => {
    http.post.rejects(new Error('refund failed'));

    const payload = { tokenId: 'token123' };
    const headers = { Authorization: 'Bearer token' };

    try {
      await requestRefundByTokenId(http, payload, headers);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('OperationFailed');
    }
  });
});
