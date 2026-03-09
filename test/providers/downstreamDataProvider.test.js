import { expect } from '@hapi/code';

import Lab from '@hapi/lab';
import Sinon from 'sinon';

import { constants } from '../../src/util/index.js';

import { downstreamDataProvider } from '../../src/providers/downstreamDataProvider.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;
export { lab };

describe('Data Provider :: downstreamDataProvider()', () => {
  let sandbox;
  let req;
  let redisClient;
  let downstream;
  let params;
  let providers;

  beforeEach(() => {
    sandbox = Sinon.createSandbox();
    redisClient = {
      get: sandbox.stub(),
      set: sandbox.stub(),
    };
    req = {
      server: {
        plugins: { redisPlugin: { redisClient } },
      },
      app: { cache: {} },
      headers: { cxscachecontrol: 'true' },
      http: {},
    };
    downstream = 'testDownstream';
    params = { id: '123' };
    providers = {
      cache: {
        isCacheDisabled: false,
        keyFormat: 'k',
        cacheData: { getCache: true, setCache: true },
      },
      isValidResponse: () => true,
      downstreamApiCall: sandbox.stub().resolves({ success: true }),
    };
  });

  afterEach(() => sandbox.restore());

  it('returns cached result when hit', async () => {
    const cacheResp = { response: { a: 1 }, lastApiCall: 't' };
    redisClient.get.resolves(cacheResp);

    const out = await downstreamDataProvider(
      req,
      downstream,
      params,
      providers
    );

    expect(out.result).to.equal(cacheResp.response);
    expect(out.CxsCacheStatus[downstream]).to.equal(constants.CACHE_STATUS.HIT);
    expect(out.CxsCachedDateTime[downstream]).to.equal('t');
  });

  it('returns live and sets cache on miss', async () => {
    redisClient.get.resolves(null);

    const out = await downstreamDataProvider(
      req,
      downstream,
      params,
      providers
    );

    expect(out.result).to.equal({ success: true });
    expect(out.CxsCacheStatus[downstream]).to.equal(
      constants.CACHE_STATUS.MISS
    );
    expect(redisClient.set.calledOnce).to.be.true();
  });

  it('bypasses cache when disabled', async () => {
    providers.cache.isCacheDisabled = true;

    const out = await downstreamDataProvider(
      req,
      downstream,
      params,
      providers
    );

    expect(out.CxsCacheStatus[downstream]).to.equal(
      constants.CACHE_STATUS.NO_CACHE
    );
    expect(redisClient.get.called).to.be.false();
    expect(redisClient.set.called).to.be.false();
  });

  it('skips set when response invalid', async () => {
    providers.isValidResponse = () => false;
    redisClient.get.resolves(null);

    await downstreamDataProvider(req, downstream, params, providers);
    expect(redisClient.set.called).to.be.false();
  });

  it('handles missing cacheData or isValidResponse', async () => {
    delete providers.cache.cacheData;
    delete providers.isValidResponse;
    redisClient.get.resolves(null);

    const out = await downstreamDataProvider(
      req,
      downstream,
      params,
      providers
    );
    expect(out.CxsCacheStatus[downstream]).to.equal(
      constants.CACHE_STATUS.NO_CACHE
    );
  });

  it('defaults isCacheDisabled to false when undefined', async () => {
    delete providers.cache.isCacheDisabled;
    redisClient.get.resolves(null);

    const out = await downstreamDataProvider(
      req,
      downstream,
      params,
      providers
    );
    expect(out.CxsCacheStatus[downstream]).to.equal(
      constants.CACHE_STATUS.MISS
    );
  });
});
