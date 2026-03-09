import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { getAmaxCredentials } from '../../../src/repositories/secretManager/amaxRepository.js';
import { constants } from '../../../src/util/index.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

let req;

beforeEach(() => {
  req = {
    secretManagerClient: {
      get: Sinon.stub(),
      put: Sinon.stub(),
    },
  };
  Sinon.stub(logger, 'debug');
});

afterEach(() => {
  Sinon.restore();
});

describe('Repository :: SecretManager :: Amax Repository :: getAmaxCredentials', () => {
  const tokenPrefix = 'test-prefix';

  const buildExpectedSecretName = (prefix) => {
    const projectID = 'mock-project-id';
    const secretPrefix = 'mock-prefix';
    const secretSuffix = 'mock-suffix';
    const key = `amax-credentials-${prefix}`;
    return `projects/${projectID}/secrets/${secretPrefix}-${key}-${secretSuffix}/versions/latest`;
  };

  it('should return parsed credentials when secret is a base64 string', async () => {
    const credentials = { userName: 'u', password: 'p' };
    const b64 = Buffer.from(JSON.stringify(credentials)).toString('base64');

    req.secretManagerClient.get.resolves(b64);

    const res = await getAmaxCredentials(
      req.secretManagerClient,
      constants.DOWNSTREAM.AMAX,
      constants.SECRET_ENTITY.CREDENTIALS,
      tokenPrefix
    );

    expect(res).to.equal(credentials);
    expect(req.secretManagerClient.get.calledOnce).to.be.true();
    const calledWith = req.secretManagerClient.get.firstCall.args[0];
    expect(calledWith).to.equal(buildExpectedSecretName(tokenPrefix));
  });

  it('should return parsed credentials when secret payload.data is a Buffer of base64 string', async () => {
    const credentials = { apiKey: 'key123' };
    const b64 = Buffer.from(JSON.stringify(credentials)).toString('base64');

    req.secretManagerClient.get.resolves({
      payload: { data: Buffer.from(b64) },
    });

    const res = await getAmaxCredentials(
      req.secretManagerClient,
      constants.DOWNSTREAM.AMAX,
      constants.SECRET_ENTITY.CREDENTIALS,
      tokenPrefix
    );

    expect(res).to.equal(credentials);
    const calledWith = req.secretManagerClient.get.firstCall.args[0];
    expect(calledWith).to.equal(buildExpectedSecretName(tokenPrefix));
  });

  it('should throw ResourceNotFound with secretName in details when secret manager returns falsy secret', async () => {
    req.secretManagerClient.get.resolves(null);

    try {
      await getAmaxCredentials(
        req.secretManagerClient,
        constants.DOWNSTREAM.AMAX,
        constants.SECRET_ENTITY.CREDENTIALS,
        tokenPrefix
      );
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).to.be.an.object();
      expect(err.type).to.equal('ResourceNotFound');
      expect(err.details).to.include(buildExpectedSecretName(tokenPrefix));
      expect(logger.debug.calledOnce).to.be.true();
      expect(logger.debug.firstCall.args[0]).to.equal(
        'SECRET_MANAGER_GET_AMAX_CREDENTIALS_ERROR'
      );
    }
  });

  it('should rethrow unexpected errors and logs debug', async () => {
    const unknown = new Error('boom');
    req.secretManagerClient.get.rejects(unknown);

    try {
      await getAmaxCredentials(
        req.secretManagerClient,
        constants.DOWNSTREAM.AMAX,
        constants.SECRET_ENTITY.CREDENTIALS,
        tokenPrefix
      );
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).to.shallow.equal(unknown);
      expect(logger.debug.calledOnce).to.be.true();
      expect(logger.debug.firstCall.args[0]).to.equal(
        'SECRET_MANAGER_GET_AMAX_CREDENTIALS_ERROR'
      );
    }
  });
});
