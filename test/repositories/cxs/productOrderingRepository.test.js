import logger from '@globetel/cxs-core/core/logger/logger.js';
import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { productOrderingRepository } from '../../../src/repositories/cxs/index.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;
export { lab };

describe('Repository :: productOrderingRepository :: addQuest', () => {
  let httpStub;

  beforeEach(() => {
    httpStub = { post: Sinon.stub() };
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should call http.post with correct url, params, and headers', async () => {
    const mockResponse = { success: true };
    httpStub.post.resolves(mockResponse);

    const params = { questId: 'Q123', userId: 'U456' };
    const result = await productOrderingRepository.addQuest(params, httpStub);

    expect(result).to.equal(mockResponse);
    expect(httpStub.post.calledOnce).to.be.true();

    const [_, calledParams, calledOptions, arg4, arg5] = httpStub.post.args[0];

    expect(calledParams).to.equal(params);
    expect(calledOptions).to.equal({
      headers: { 'Content-Type': 'application/json' },
    });
    expect(arg4).to.be.false();
    expect(arg5).to.be.false();
  });

  it('should throw OperationFailed when http.post fails', async () => {
    const error = new Error('Network failure');
    httpStub.post.rejects(error);

    try {
      await productOrderingRepository.addQuest({ questId: 'Q123' }, httpStub);
      throw new Error('Expected addQuest to throw');
    } catch (err) {
      expect(err).to.equal({ type: 'OperationFailed' });
    }
  });
});

describe('Repository :: productOrderingRepository :: purchasePromoAsync', () => {
  let req;
  let httpStub;
  let infoSpy;
  let debugSpy;
  let errorSpy;

  beforeEach(() => {
    httpStub = { post: Sinon.stub() };
    req = { http: httpStub };

    infoSpy = Sinon.spy(logger, 'info');
    debugSpy = Sinon.spy(logger, 'debug');
    errorSpy = Sinon.spy(logger, 'error');
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should call http.post and log request and response', async () => {
    const mockResponse = { success: true };
    httpStub.post.resolves(mockResponse);

    const payload = { promoId: 'PROMO123' };

    await productOrderingRepository.purchasePromoAsync(req, payload);

    expect(httpStub.post.calledOnce).to.be.true();

    const [url, calledPayload, options, arg4, arg5] = httpStub.post.args[0];

    expect(url).to.be.a.string();
    expect(calledPayload).to.equal(payload);
    expect(options).to.equal({});
    expect(arg4).to.be.false();
    expect(arg5).to.be.false();

    expect(
      infoSpy.calledWith('CXS_PURCHAE_PROMO_ASYNC_REQUEST', payload)
    ).to.be.true();

    expect(
      debugSpy.calledWith('CXS_PURCHAE_PROMO_ASYNC_RESPONSE', mockResponse)
    ).to.be.true();
  });

  it('should log error when http.post fails and not throw', async () => {
    const error = new Error('Network error');
    httpStub.post.rejects(error);

    await productOrderingRepository.purchasePromoAsync(req, {
      promoId: 'PROMO123',
    });

    expect(
      errorSpy.calledWith('CXS_PURCHAE_PROMO_ASYNC_FAILED', error)
    ).to.be.true();
  });
});

describe('Repository :: productOrderingRepository :: volumeBoostAsync', () => {
  let req;
  let httpStub;
  let infoSpy;
  let debugSpy;
  let errorSpy;

  beforeEach(() => {
    httpStub = { post: Sinon.stub() };
    req = { http: httpStub };

    infoSpy = Sinon.spy(logger, 'info');
    debugSpy = Sinon.spy(logger, 'debug');
    errorSpy = Sinon.spy(logger, 'error');
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should call http.post and log request and response', async () => {
    const mockResponse = { success: true };
    httpStub.post.resolves(mockResponse);

    const payload = { accountId: 'ACC123' };

    await productOrderingRepository.volumeBoostAsync(req, payload);

    expect(httpStub.post.calledOnce).to.be.true();

    const [url, calledPayload] = httpStub.post.args[0];

    expect(url).to.be.a.string();
    expect(calledPayload).to.equal(payload);

    expect(
      infoSpy.calledWith('CXS_VOLUME_BOOST_ASYNC_REQUEST', payload)
    ).to.be.true();

    expect(
      debugSpy.calledWith('CXS_VOLUME_BOOST_ASYNC_RESPONSE', mockResponse)
    ).to.be.true();
  });

  it('should log error when http.post fails and not throw', async () => {
    const error = new Error('Network error');
    httpStub.post.rejects(error);

    await productOrderingRepository.volumeBoostAsync(req, {
      accountId: 'ACC123',
    });

    expect(
      errorSpy.calledWith('CXS_VOLUME_BOOST_ASYNC_FAILED', error)
    ).to.be.true();
  });
});

describe('Repository :: productOrderingRepository :: createPolicyAsync', () => {
  let req;
  let httpStub;
  let infoSpy;
  let debugSpy;
  let errorSpy;

  beforeEach(() => {
    httpStub = { post: Sinon.stub() };
    req = { http: httpStub };

    infoSpy = Sinon.spy(logger, 'info');
    debugSpy = Sinon.spy(logger, 'debug');
    errorSpy = Sinon.spy(logger, 'error');
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should call http.post and log request and response', async () => {
    const mockResponse = { success: true };
    httpStub.post.resolves(mockResponse);

    const payload = { policyId: 'POL123' };

    await productOrderingRepository.createPolicyAsync(req, payload);

    expect(httpStub.post.calledOnce).to.be.true();

    expect(
      infoSpy.calledWith('CXS_CREATE_POLICY_ASYNC_REQUEST', payload)
    ).to.be.true();

    expect(
      debugSpy.calledWith('CXS_VCREATE_POLICY_ASYNC_RESPONSE', mockResponse)
    ).to.be.true();
  });

  it('should log error when http.post fails and not throw', async () => {
    const error = new Error('Network error');
    httpStub.post.rejects(error);

    await productOrderingRepository.createPolicyAsync(req, {
      policyId: 'POL123',
    });

    expect(
      errorSpy.calledWith('CXS_CREATE_POLICY_ASYNC_FAILED', error)
    ).to.be.true();
  });
});

describe('Repository :: productOrderingRepository :: buyRoamingAsync', () => {
  let req;
  let httpStub;
  let infoSpy;
  let debugSpy;
  let errorSpy;

  beforeEach(() => {
    httpStub = { post: Sinon.stub() };
    req = { http: httpStub };

    infoSpy = Sinon.spy(logger, 'info');
    debugSpy = Sinon.spy(logger, 'debug');
    errorSpy = Sinon.spy(logger, 'error');
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should call http.post and log request and response', async () => {
    const mockResponse = { success: true };
    httpStub.post.resolves(mockResponse);

    const payload = { roamingPlanId: 'ROAM123' };

    await productOrderingRepository.buyRoamingAsync(req, payload);

    expect(httpStub.post.calledOnce).to.be.true();

    expect(
      infoSpy.calledWith('CXS_BUY_ROAMING_ASYNC_REQUEST', payload)
    ).to.be.true();

    expect(
      debugSpy.calledWith('CXS_BUY_ROAMING_ASYNC_RESPONSE', mockResponse)
    ).to.be.true();
  });

  it('should log error when http.post fails and not throw', async () => {
    const error = new Error('Network error');
    httpStub.post.rejects(error);

    await productOrderingRepository.buyRoamingAsync(req, {
      roamingPlanId: 'ROAM123',
    });

    expect(
      errorSpy.calledWith('CXS_BUY_ROAMING_ASYNC_FAILED', error)
    ).to.be.true();
  });
});
