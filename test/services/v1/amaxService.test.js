import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { msisdnFormatter } from '@globetel/cxs-core/core/utils/string/index.js';
import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';

import {
  executeAmaxTransaction,
  login,
  topUp,
  transfer,
} from '../../../src/services/v1/amaxService.js';

import { errorList } from '@globetel/cxs-core/core/error/messages/index.js';
import { constants } from '../../../src/util/index.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

let req;

beforeEach(() => {
  Sinon.stub(logger, 'debug');

  req = {
    amax: {
      buyLoadRepository: {
        login: Sinon.stub(),
        topUp: Sinon.stub(),
        transfer: Sinon.stub(),
      },
    },
    amaxService: {
      login,
      topUp,
      transfer,
    },
    secretManager: {
      amaxRepository: {
        getAmaxCredentials: Sinon.stub(),
      },
    },
    tokenStore: {
      amaxRepository: {
        fetchSession: Sinon.stub(),
        updateSession: Sinon.stub(),
      },
    },
    secretManagerClient: {},
    tokenStoreClient: {},
  };
});

afterEach(() => {
  Sinon.restore();
});

describe('Service :: V1 :: amaxService :: login', () => {
  it('should return existing valid sessionId from token store when session is valid', async () => {
    const credentials = { u: 'a', p: 'b' };

    req.tokenStore.amaxRepository.fetchSession.resolves({
      sessionId: 'SID-CACHED',
      lastModifiedDate: new Date().toISOString(),
    });

    const sid = await login(req, credentials);

    expect(sid).to.equal('SID-CACHED');
    Sinon.assert.calledOnce(req.tokenStore.amaxRepository.fetchSession);
    Sinon.assert.calledWithExactly(
      req.tokenStore.amaxRepository.fetchSession,
      req,
      constants.SECRET_ENTITY.AMAX
    );
    Sinon.assert.notCalled(req.amax.buyLoadRepository.login);
    Sinon.assert.notCalled(req.tokenStore.amaxRepository.updateSession);
  });

  it('should call login and update store when cached session is a primitive string', async () => {
    const credentials = { u: 'a', p: 'b' };

    req.tokenStore.amaxRepository.fetchSession.resolves('SID-LEGACY');

    req.amax.buyLoadRepository.login.resolves({
      status: 200,
      data: { statusCode: '0', sessionId: 'SID-NEW' },
    });

    const sid = await login(req, credentials);

    expect(sid).to.equal('SID-NEW');
    Sinon.assert.calledOnce(req.tokenStore.amaxRepository.fetchSession);
    Sinon.assert.calledWithExactly(
      req.tokenStore.amaxRepository.fetchSession,
      req,
      constants.SECRET_ENTITY.AMAX
    );
    Sinon.assert.calledOnce(req.amax.buyLoadRepository.login);
    Sinon.assert.calledWithExactly(
      req.amax.buyLoadRepository.login,
      req,
      credentials
    );
    Sinon.assert.calledOnce(req.tokenStore.amaxRepository.updateSession);
    const updArgs = req.tokenStore.amaxRepository.updateSession.firstCall.args;
    expect(updArgs[0]).to.equal(req);
    expect(updArgs[2]).to.equal(constants.SECRET_ENTITY.AMAX);

    const stored = JSON.parse(updArgs[1]);
    expect(stored.sessionId).to.equal('SID-NEW');
    expect(stored.lastModifiedDate).to.exist();
  });

  it('should call login and update store when no cached session exists', async () => {
    const credentials = { u: 'a', p: 'b' };
    req.tokenStore.amaxRepository.fetchSession.resolves(null);

    req.amax.buyLoadRepository.login.resolves({
      status: 200,
      data: { statusCode: '0', sessionId: 'SID-NEW' },
    });

    const sid = await login(req, credentials);

    expect(sid).to.equal('SID-NEW');
    Sinon.assert.calledOnce(req.amax.buyLoadRepository.login);
    Sinon.assert.calledWithExactly(
      req.amax.buyLoadRepository.login,
      req,
      credentials
    );
    Sinon.assert.calledOnce(req.tokenStore.amaxRepository.updateSession);
    const updArgs = req.tokenStore.amaxRepository.updateSession.firstCall.args;
    expect(updArgs[0]).to.equal(req);
    expect(updArgs[2]).to.equal(constants.SECRET_ENTITY.AMAX);

    const stored = JSON.parse(updArgs[1]);
    expect(stored.sessionId).to.equal('SID-NEW');
    expect(stored.lastModifiedDate).to.exist();
  });

  it('should log and throw BadRequestError when an error occurs', async () => {
    req.tokenStore.amaxRepository.fetchSession.resolves(null);
    req.amax.buyLoadRepository.login.rejects(new Error('login failed'));

    try {
      await login(req, {});
      throw new Error('Expected failure but succeeded');
    } catch (e) {
      expect(e).to.shallow.equal(errorList.BadRequestError);
      expect(logger.debug.called).to.be.true();
    }
  });
});

describe('Service :: V1 :: amaxService :: topUp', () => {
  it('should return transId when repository call succeeds', async () => {
    req.amax.buyLoadRepository.topUp.resolves({
      status: 200,
      data: { statusCode: '0', transId: 'TX-123' },
    });

    const txId = await topUp(req, 'sid', '0917', '100', 'GOSURF');

    expect(txId).to.equal('TX-123');
    Sinon.assert.calledOnce(req.amax.buyLoadRepository.topUp);
    Sinon.assert.calledWithExactly(
      req.amax.buyLoadRepository.topUp,
      req,
      'sid',
      '0917',
      '100',
      'GOSURF'
    );
  });

  it('should throw BadRequestError when response statusCode is not successful', async () => {
    req.amax.buyLoadRepository.topUp.resolves({
      status: 200,
      data: { statusCode: '1' },
    });

    try {
      await topUp(req, 'sid', '0917', '100', 'GOSURF');
      throw new Error('Expected failure but succeeded');
    } catch (e) {
      expect(e).to.shallow.equal(errorList.BadRequestError);
      expect(logger.debug.called).to.be.true();
    }
  });

  it('should log and throw BadRequestError when an error occurs', async () => {
    req.amax.buyLoadRepository.topUp.rejects(new Error('topup failed'));

    try {
      await topUp(req, 'sid', '0917', '100', 'GOSURF');
      throw new Error('Expected failure but succeeded');
    } catch (e) {
      expect(e).to.shallow.equal(errorList.BadRequestError);
      expect(logger.debug.called).to.be.true();
    }
  });
});

describe('Service :: V1 :: amaxService :: transfer', () => {
  it('should return transId when repository call succeeds and uses formatted msisdn', async () => {
    req.amax.buyLoadRepository.transfer.resolves({
      status: 200,
      data: { statusCode: '0', transId: 'TX-T1' },
    });

    const txId = await transfer(
      req,
      'SID',
      '09171234567',
      'WALLET',
      '100.00',
      'SRC'
    );

    expect(txId).to.equal('TX-T1');
    Sinon.assert.calledWithExactly(
      req.amax.buyLoadRepository.transfer,
      req,
      'SID',
      'SRC',
      msisdnFormatter('09171234567'),
      'WALLET',
      '100.00'
    );
  });

  it('should throw BadRequestError when response statusCode is not successful', async () => {
    req.amax.buyLoadRepository.transfer.resolves({
      status: 200,
      data: { statusCode: '1' },
    });

    try {
      await transfer(req, 'SID', '09171234567', 'WALLET', '100.00', 'SRC');
      throw new Error('Expected failure but succeeded');
    } catch (e) {
      expect(e).to.shallow.equal(errorList.BadRequestError);
      expect(logger.debug.called).to.be.true();
    }
  });

  it('should log and throw BadRequestError when an error occurs', async () => {
    req.amax.buyLoadRepository.transfer.rejects(new Error('transfer failed'));

    try {
      await transfer(req, 'SID', '09171234567', 'WALLET', '100.00', 'SRC');
      throw new Error('Expected failure but succeeded');
    } catch (e) {
      expect(e).to.shallow.equal(errorList.BadRequestError);
      expect(logger.debug.called).to.be.true();
    }
  });
});

describe('Service :: V1 :: amaxService :: executeAmaxTransaction', () => {
  it('should return {transactionId,isRefund:false} when keyword is not null (top-up path)', async () => {
    req.secretManager.amaxRepository.getAmaxCredentials.resolves({
      sourceWallet: 'SRC',
    });

    req.tokenStore.amaxRepository.fetchSession.resolves(null);
    req.amax.buyLoadRepository.login.resolves({
      status: 200,
      data: { statusCode: '0', sessionId: 'SID-1' },
    });
    req.amax.buyLoadRepository.topUp.resolves({
      status: 200,
      data: { statusCode: '0', transId: 'TX-999' },
    });

    const result = await executeAmaxTransaction(
      req,
      'pref',
      '09171234567',
      '100',
      'GOSURF',
      'WALLET'
    );

    expect(result).to.equal({ transactionId: 'TX-999', isRefund: false });
    Sinon.assert.calledWithExactly(
      req.secretManager.amaxRepository.getAmaxCredentials,
      req.secretManagerClient,
      constants.DOWNSTREAM.AMAX,
      constants.SECRET_ENTITY.CREDENTIALS,
      'pref'
    );
    Sinon.assert.calledOnce(req.tokenStore.amaxRepository.updateSession);
  });

  it('should format amount and use credentials.sourceWallet when keyword is null (transfer path)', async () => {
    req.secretManager.amaxRepository.getAmaxCredentials.resolves({
      sourceWallet: 'SRC',
    });
    req.tokenStore.amaxRepository.fetchSession.resolves(null);

    req.amax.buyLoadRepository.login.resolves({
      status: 200,
      data: { statusCode: '0', sessionId: 'SID-2' },
    });

    req.amax.buyLoadRepository.transfer.resolves({
      status: 200,
      data: { statusCode: '0', transId: 'TX-555' },
    });

    const result = await executeAmaxTransaction(
      req,
      'pref',
      '09171234567',
      '100',
      null,
      'WALLET'
    );

    expect(result).to.equal({ transactionId: 'TX-555', isRefund: false });
    Sinon.assert.calledWithExactly(
      req.secretManager.amaxRepository.getAmaxCredentials,
      req.secretManagerClient,
      constants.DOWNSTREAM.AMAX,
      constants.SECRET_ENTITY.CREDENTIALS,
      'pref'
    );
    Sinon.assert.calledWithExactly(
      req.amax.buyLoadRepository.transfer,
      req,
      'SID-2',
      'SRC',
      msisdnFormatter('09171234567'),
      'WALLET',
      '100.00'
    );
  });

  it('should map status 500 errors to errorList.Default when downstream call fails with 500', async () => {
    req.secretManager.amaxRepository.getAmaxCredentials.rejects({
      status: constants.HTTP_STATUS.INTERNAL_SERVER_ERROR,
    });

    try {
      await executeAmaxTransaction(
        req,
        'pref',
        '0917',
        '50',
        'GOSURF',
        'WALLET'
      );
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err).to.equal(errorList.Default);
    }
  });

  it('should rethrow error when downstream call fails with non-500 error', async () => {
    const boom = new Error('boom');
    req.secretManager.amaxRepository.getAmaxCredentials.rejects(boom);

    try {
      await executeAmaxTransaction(
        req,
        'pref',
        '0917',
        '50',
        'GOSURF',
        'WALLET'
      );
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err).to.shallow.equal(boom);
    }
  });
});
