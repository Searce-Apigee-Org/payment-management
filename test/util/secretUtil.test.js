import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { config } from '../../convict/config.js';
import { buildSecretName } from '../../src/util/secretUtil.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Utils :: SecretUtil :: buildSecretName', () => {
  beforeEach(() => {
    Sinon.stub(config, 'get');
    Sinon.stub(logger, 'debug');
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should throw InternalOperationFailed when projectID is not set', () => {
    config.get.withArgs('gcp.projectID').returns(undefined);

    try {
      buildSecretName('my-secret-key');
    } catch (err) {
      expect(logger.debug.calledWith('PROJECT_ID is not set')).to.be.true();
      expect(err).to.be.an.object();
      expect(err.type).to.equal('InternalOperationFailed');
    }
  });

  it('should return the correct secret name when projectID, prefix, and suffix are set', () => {
    config.get.withArgs('gcp.projectID').returns('mock-project');
    config.get.withArgs('gcp.secret.prefix').returns('mock-prefix');
    config.get.withArgs('gcp.secret.suffix').returns('mock-suffix');

    const secretName = buildSecretName('my-secret-key');

    expect(secretName).to.equal(
      'projects/mock-project/secrets/mock-prefix-my-secret-key-mock-suffix/versions/latest'
    );
  });
});
