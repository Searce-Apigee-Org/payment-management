import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import {
  getOrRefreshAccessToken,
  saveGorAccessToken,
} from '../../../src/services/v1/gorTokenService.js';
import { constants } from '../../../src/util/index.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

let req;

beforeEach(() => {
  req = {
    gor: {
      gorRepository: {
        getAccessToken: Sinon.stub(),
      },
    },
    tokenStore: {
      csPaymentsRepository: {
        updateAccessToken: Sinon.stub(),
      },
    },
  };
});

afterEach(() => {
  Sinon.restore();
});

describe('Services :: V1 :: GorTokenService :: getOrRefreshAccessToken', () => {
  it('should use cached token when not expired', async () => {
    const infoStub = Sinon.stub(logger, 'info');

    const cachedToken = {
      retrieved_at: Date.now(),
      expires_in: 3600,
      tokenType: 'Bearer',
      access_token: 'cached123',
    };

    const result = await getOrRefreshAccessToken(req, cachedToken, {
      authorization: 'Bearer abc',
    });

    expect(result).to.equal('Bearer cached123');
    expect(req.gor.gorRepository.getAccessToken.called).to.be.false();
    expect(
      req.tokenStore.csPaymentsRepository.updateAccessToken.called
    ).to.be.false();

    expect(infoStub.called).to.be.true();
    const tags = infoStub.getCalls().map((c) => c.args[0]);
    expect(tags).to.include('USING_CACHED_TOKEN');
  });

  it('should refresh and store token when cache is missing/expired', async () => {
    const infoStub = Sinon.stub(logger, 'info');

    const tokenResponse = {
      access_token: 'newtoken',
      tokenType: 'Bearer',
    };
    req.gor.gorRepository.getAccessToken.resolves(tokenResponse);
    req.tokenStore.csPaymentsRepository.updateAccessToken.resolves();

    const creds = { authorization: 'Bearer creds' };
    const result = await getOrRefreshAccessToken(req, null, creds);

    expect(result).to.equal('Bearer newtoken');

    expect(req.gor.gorRepository.getAccessToken.calledOnce).to.be.true();
    const [reqArg, credArg] =
      req.gor.gorRepository.getAccessToken.getCall(0).args;
    expect(reqArg).to.equal(req);
    expect(credArg).to.equal(creds);

    expect(
      req.tokenStore.csPaymentsRepository.updateAccessToken.calledOnce
    ).to.be.true();
    const [updateReqArg, valueArg, entityArg] =
      req.tokenStore.csPaymentsRepository.updateAccessToken.getCall(0).args;
    expect(updateReqArg).to.equal(req);
    expect(valueArg).to.equal(JSON.stringify(tokenResponse));
    expect(entityArg).to.equal(constants.SECRET_ENTITY.CHANGE_SIM);

    const tags = infoStub.getCalls().map((c) => c.args[0]);
    expect(tags).to.include('REFRESHING_ACCESS_TOKEN');
  });

  it('should log and rethrow OperationFailed when fetched token is empty', async () => {
    const debugStub = Sinon.stub(logger, 'debug');
    req.gor.gorRepository.getAccessToken.resolves({});

    try {
      await getOrRefreshAccessToken(req, null, { authorization: 'Bearer X' });
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err).to.be.an.object();
      expect(err.type).to.equal('OperationFailed');

      expect(debugStub.called).to.be.true();
      const tags = debugStub.getCalls().map((c) => c.args[0]);
      expect(tags).to.include('GET_OR_REFRESH_ACCESS_TOKEN_ERROR');
    }
  });
});

describe('Services :: V1 :: GorTokenService :: saveGorAccessToken', () => {
  it('should save token successfully', async () => {
    const tokenObj = { access_token: 'tok', tokenType: 'Bearer' };
    req.tokenStore.csPaymentsRepository.updateAccessToken.resolves();

    await saveGorAccessToken(req, tokenObj);

    expect(
      req.tokenStore.csPaymentsRepository.updateAccessToken.calledOnce
    ).to.be.true();
    const [updateReqArg, valueArg, entityArg] =
      req.tokenStore.csPaymentsRepository.updateAccessToken.getCall(0).args;
    expect(updateReqArg).to.equal(req);
    expect(valueArg).to.equal(JSON.stringify(tokenObj));
    expect(entityArg).to.equal(constants.SECRET_ENTITY.CHANGE_SIM);
  });

  it('should map unknown error to OperationFailed', async () => {
    const debugStub = Sinon.stub(logger, 'debug');
    req.tokenStore.csPaymentsRepository.updateAccessToken.rejects(
      new Error('boom')
    );

    try {
      await saveGorAccessToken(req, {
        access_token: 'tok',
        tokenType: 'Bearer',
      });
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err).to.be.an.object();
      expect(err.type).to.equal('OperationFailed');
      expect(debugStub.called).to.be.true();
      const tags = debugStub.getCalls().map((c) => c.args[0]);
      expect(tags).to.include('SAVE_GOR_ACCESS_TOKEN_ERROR');
    }
  });

  it('should map ParameterNotFound code to OperationFailed', async () => {
    const debugStub = Sinon.stub(logger, 'debug');
    req.tokenStore.csPaymentsRepository.updateAccessToken.rejects({
      code: 'ParameterNotFound',
    });

    try {
      await saveGorAccessToken(req, {
        access_token: 'tok',
        tokenType: 'Bearer',
      });
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err).to.be.an.object();
      expect(err.type).to.equal('OperationFailed');
      expect(debugStub.called).to.be.true();
      const tags = debugStub.getCalls().map((c) => c.args[0]);
      expect(tags).to.include('SAVE_GOR_ACCESS_TOKEN_ERROR');
    }
  });

  it('should throw OperationFailed when accessTokenObj is missing/empty', async () => {
    try {
      await saveGorAccessToken(req, {});
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err).to.be.an.object();
      expect(err.type).to.equal('OperationFailed');
    }

    try {
      await saveGorAccessToken(req, null);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err).to.be.an.object();
      expect(err.type).to.equal('OperationFailed');
    }
  });
});
