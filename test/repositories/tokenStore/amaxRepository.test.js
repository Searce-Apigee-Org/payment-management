import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import sinon from 'sinon';
import {
  fetchSession,
  updateSession,
} from '../../../src/repositories/tokenStore/amaxRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;
export { lab };

describe('Repository :: TokenStore :: AmaxRepository', () => {
  let req;
  let tokenStoreClientMock;
  let tokenPaymentId;
  let secretEntity;

  beforeEach(() => {
    sinon.restore();

    sinon.stub(logger, 'debug');

    tokenPaymentId = 'CLIENT-123';
    secretEntity = 'amax';

    tokenStoreClientMock = {
      get: sinon.stub(),
      set: sinon.stub(),
    };

    req = {
      payload: { tokenPaymentId },
      tokenStoreClient: tokenStoreClientMock,
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('fetchSession', () => {
    it('returns raw string when store returns a JSON string and passes computed config', async () => {
      const value = {
        sessionId: 'SID-OBJ',
        lastModifiedDate: new Date().toISOString(),
      };
      const jsonValue = JSON.stringify(value);
      tokenStoreClientMock.get.resolves(jsonValue);

      const result = await fetchSession(req, secretEntity);

      expect(tokenStoreClientMock.get.calledOnce).to.be.true();
      const [getReq, config] = tokenStoreClientMock.get.firstCall.args;
      expect(getReq).to.equal(req);
      expect(config).to.be.an.object();
      expect(config.params).to.equal({
        clientId: tokenPaymentId,
        secretEntity,
      });
      expect(typeof config.keyFormat).to.equal('function');

      expect(result).to.equal(jsonValue);
    });

    it('returns raw string when store returns a non-JSON string', async () => {
      tokenStoreClientMock.get.resolves('SID-RAW');

      const result = await fetchSession(req, secretEntity);

      expect(tokenStoreClientMock.get.calledOnce).to.be.true();
      expect(result).to.equal('SID-RAW');
    });

    it('returns null when store returns an empty string', async () => {
      tokenStoreClientMock.get.resolves('');

      const result = await fetchSession(req, secretEntity);

      expect(tokenStoreClientMock.get.calledOnce).to.be.true();
      expect(result).to.be.null();
    });

    it('returns null when no session is found', async () => {
      tokenStoreClientMock.get.resolves(null);

      const result = await fetchSession(req, secretEntity);

      expect(tokenStoreClientMock.get.calledOnce).to.be.true();
      expect(result).to.be.null();
    });

    it('returns object as-is when store returns an object', async () => {
      const obj = { data: { a: 1 } };
      tokenStoreClientMock.get.resolves(obj);

      const result = await fetchSession(req, secretEntity);

      expect(tokenStoreClientMock.get.calledOnce).to.be.true();
      expect(result).to.equal(obj);
    });

    it('logs and rethrows on error from token store client', async () => {
      const err = new Error('Failed to get');
      tokenStoreClientMock.get.rejects(err);

      await expect(fetchSession(req, secretEntity)).to.reject(
        Error,
        'Failed to get'
      );

      expect(logger.debug.calledOnce).to.be.true();
      expect(logger.debug.firstCall.args[0]).to.equal(
        'AMAX_FETCH_SESSION_ERROR'
      );
      expect(logger.debug.firstCall.args[1]).to.shallow.equal(err);
    });
  });

  describe('updateSession', () => {
    it('successfully updates the session in the store with computed config', async () => {
      const sessionId = JSON.stringify({
        sessionId: 'SID-NEW',
        lastModifiedDate: new Date().toISOString(),
      });

      tokenStoreClientMock.set.resolves();

      await updateSession(req, sessionId, secretEntity);

      expect(tokenStoreClientMock.set.calledOnce).to.be.true();
      const [setReq, config, value] = tokenStoreClientMock.set.firstCall.args;
      expect(setReq).to.equal(req);
      expect(value).to.equal(sessionId);
      expect(config).to.be.an.object();
      expect(config.params).to.equal({
        clientId: tokenPaymentId,
        secretEntity,
      });
      expect(typeof config.keyFormat).to.equal('function');
    });

    it('logs and rethrows when token store update fails', async () => {
      const sessionId = JSON.stringify({
        sessionId: 'SID-ERR',
        lastModifiedDate: new Date().toISOString(),
      });

      const err = new Error('Update failed');
      tokenStoreClientMock.set.rejects(err);

      await expect(updateSession(req, sessionId, secretEntity)).to.reject(
        Error,
        'Update failed'
      );

      expect(logger.debug.calledOnce).to.be.true();
      expect(logger.debug.firstCall.args[0]).to.equal(
        'AMAX_UPDATE_SESSION_ERROR'
      );
      expect(logger.debug.firstCall.args[1]).to.shallow.equal(err);
    });
  });
});
