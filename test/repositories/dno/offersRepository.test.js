import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { getOffers } from '../../../src/repositories/dno/offersRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Repository :: DNO Repository :: getOffers', () => {
  let http;
  let req;

  beforeEach(() => {
    http = { post: Sinon.stub() };
    req = { http, dnoClient: {} };
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should return response from http.post', async () => {
    const mockResponse = { data: [{ id: 'OFFER123' }] };
    http.post.resolves(mockResponse);

    const payload = { productId: '123' };
    const authToken = 'token-xyz';

    const result = await getOffers(payload, authToken, req);

    expect(result).to.equal(mockResponse);
    expect(http.post.calledOnce).to.be.true();
  });

  it('should return error.data when http.post rejects with error.data', async () => {
    const mockError = { data: { message: 'Invalid request' } };
    http.post.rejects(mockError);

    const payload = { productId: '123' };
    const authToken = 'token-xyz';

    const result = await getOffers(payload, authToken, req);

    expect(result).to.equal(mockError.data);
  });

  it('should return { status: "failed", error } when http.post rejects without data', async () => {
    const mockError = new Error('network error');
    http.post.rejects(mockError);

    const payload = { productId: '123' };
    const authToken = 'token-xyz';

    const result = await getOffers(payload, authToken, req);

    expect(result.status).to.equal('failed');
    expect(result.error).to.exist();
  });
});
