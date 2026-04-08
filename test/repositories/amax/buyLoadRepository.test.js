import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { config } from '../../../convict/config.js';
import {
  login,
  topUp,
  transfer,
} from '../../../src/repositories/amax/buyLoadRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;
export { lab };

let req;

beforeEach(() => {
  req = {
    http: {
      postWithRetry: Sinon.stub(),
    },
  };

  Sinon.stub(logger, 'debug');
});

afterEach(() => {
  Sinon.restore();
});

describe('Repository :: AMAX :: buyLoadRepository :: login', () => {
  const credentials = { userName: 'user', password: 'pass' };
  const amaxCfg = config.get('amax');
  const expectedUrl = `${amaxCfg.httpProtocol}://${amaxCfg.webServiceHost}/${amaxCfg.endpoints.login}`;
  const expectedOptions = {
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    timeout: amaxCfg.requestTimeout,
  };

  it('should post and return response on success', async () => {
    const mockResponse = { token: 'session-1' };
    const postStub = req.http.postWithRetry.resolves(mockResponse);

    const res = await login(req, credentials);

    expect(postStub.calledOnce).to.be.true();
    expect(postStub.firstCall.args[0]).to.equal(expectedUrl);
    expect(postStub.firstCall.args[1]).to.equal({
      userName: credentials.userName,
      password: credentials.password,
    });
    expect(postStub.firstCall.args[2]).to.equal(expectedOptions);
    expect(postStub.firstCall.args[3]).to.equal(false);
    expect(postStub.firstCall.args[4]).to.equal(false);
    expect(res).to.equal(mockResponse);
  });

  it('should log and rethrow on error', async () => {
    const err = new Error('network');
    req.http.postWithRetry.rejects(err);

    try {
      await login(req, credentials);
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).to.shallow.equal(err);
      expect(logger.debug.calledOnce).to.be.true();
      expect(logger.debug.firstCall.args[0]).to.equal(
        'AMAX_LOGIN_REPOSITORY_ERROR'
      );
      expect(logger.debug.firstCall.args[1]).to.shallow.equal(err);
    }
  });
});

describe('Repository :: AMAX :: buyLoadRepository :: topUp', () => {
  const sessionId = 'sess-1';
  const msisdn = '09171234567';
  const amount = 100;
  const product = 'LOAD10';

  const amaxCfg2 = config.get('amax');
  const expectedUrl = `${amaxCfg2.httpProtocol}://${amaxCfg2.webServiceHost}/${amaxCfg2.endpoints.topUp}`;
  const expectedOptions = {
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    timeout: amaxCfg2.requestTimeout,
  };
  const expectedBody = {
    sessionId,
    subsMsisdn: msisdn,
    amount,
    product,
    productType: '1',
  };

  it('should post and return response on success', async () => {
    const mockResponse = { status: 'OK' };
    const postStub = req.http.postWithRetry.resolves(mockResponse);

    const res = await topUp(req, sessionId, msisdn, amount, product);

    expect(postStub.calledOnce).to.be.true();
    expect(postStub.firstCall.args[0]).to.equal(expectedUrl);
    expect(postStub.firstCall.args[1]).to.equal(expectedBody);
    expect(postStub.firstCall.args[2]).to.equal(expectedOptions);
    expect(postStub.firstCall.args[3]).to.equal(false);
    expect(postStub.firstCall.args[4]).to.equal(false);
    expect(res).to.equal(mockResponse);
  });

  it('should log and rethrow on error', async () => {
    const err = new Error('timeout');
    req.http.postWithRetry.rejects(err);

    try {
      await topUp(req, sessionId, msisdn, amount, product);
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).to.shallow.equal(err);
      expect(logger.debug.calledOnce).to.be.true();
      expect(logger.debug.firstCall.args[0]).to.equal(
        'AMAX_TOP_UP_REPOSITORY_ERROR'
      );
      expect(logger.debug.firstCall.args[1]).to.shallow.equal(err);
    }
  });
});

describe('Repository :: AMAX :: buyLoadRepository :: transfer', () => {
  const sessionId = 'sess-2';
  const sourceWallet = 'WALLET_MAIN';
  const msisdn = '09181234567';
  const wallet = 'WALLET_GCASH';
  const amount = 250;

  const amaxCfg3 = config.get('amax');
  const expectedUrl = `${amaxCfg3.httpProtocol}://${amaxCfg3.webServiceHost}/${amaxCfg3.endpoints.transfer}`;
  const expectedOptions = {
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    timeout: amaxCfg3.requestTimeout,
  };
  const expectedBody = {
    sessionId,
    requestType: 'A',
    sourceWallet,
    recipientWallet: msisdn,
    walletType: wallet,
    amount,
  };

  it('should post and return response on success', async () => {
    const mockResponse = { status: 'QUEUED' };
    const postStub = req.http.postWithRetry.resolves(mockResponse);

    const res = await transfer(
      req,
      sessionId,
      sourceWallet,
      msisdn,
      wallet,
      amount
    );

    expect(postStub.calledOnce).to.be.true();
    expect(postStub.firstCall.args[0]).to.equal(expectedUrl);
    expect(postStub.firstCall.args[1]).to.equal(expectedBody);
    expect(postStub.firstCall.args[2]).to.equal(expectedOptions);
    expect(postStub.firstCall.args[3]).to.equal(false);
    expect(postStub.firstCall.args[4]).to.equal(false);
    expect(res).to.equal(mockResponse);
  });

  it('should log and rethrow on error', async () => {
    const err = new Error('bad-request');
    req.http.postWithRetry.rejects(err);

    try {
      await transfer(req, sessionId, sourceWallet, msisdn, wallet, amount);
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).to.shallow.equal(err);
      expect(logger.debug.calledOnce).to.be.true();
      expect(logger.debug.firstCall.args[0]).to.equal(
        'AMAX_TRANSFER_REPOSITORY_ERROR'
      );
      expect(logger.debug.firstCall.args[1]).to.shallow.equal(err);
    }
  });
});
