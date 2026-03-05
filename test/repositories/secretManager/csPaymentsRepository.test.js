import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { getCSPaymentsCredentials } from '../../../src/repositories/secretManager/csPaymentsRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Repository :: SecretManager :: CSPayments :: getCSPaymentsCredentials', () => {
  let req;

  beforeEach(() => {
    req = {
      secretManagerClient: {
        get: Sinon.stub(),
      },
    };
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should throw ResourceNotFound if secret value is missing', async () => {
    const debugStub = Sinon.stub(logger, 'debug');

    req.secretManagerClient.get.resolves(null);

    try {
      await getCSPaymentsCredentials(req);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('ResourceNotFound');
      expect(err.details).to.include('secret manager config not found');

      expect(debugStub.calledOnce).to.be.true();
      const [tag, errorArg] = debugStub.getCall(0).args;
      expect(tag).to.equal('SECRET_MANAGER_GET_CS_PAYMENTS_CREDENTIALS_ERROR');
      expect(errorArg.type).to.equal('ResourceNotFound');
    }
  });

  it('should throw ResourceNotFound if credentials value is empty', async () => {
    const debugStub = Sinon.stub(logger, 'debug');

    const base64Empty = Buffer.from(JSON.stringify({})).toString('base64');
    req.secretManagerClient.get.resolves(base64Empty);

    try {
      await getCSPaymentsCredentials(req);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('ResourceNotFound');
      expect(err.details).to.equal('Credentials not found.');

      expect(debugStub.calledOnce).to.be.true();
      const [tag] = debugStub.getCall(0).args;
      expect(tag).to.equal('SECRET_MANAGER_GET_CS_PAYMENTS_CREDENTIALS_ERROR');
    }
  });

  it('should return the decoded credentials when secret is raw base64', async () => {
    const mockSecretValue = { username: 'user', password: 'pass' };
    const base64Encoded = Buffer.from(JSON.stringify(mockSecretValue)).toString(
      'base64'
    );

    req.secretManagerClient.get.resolves(base64Encoded);

    const result = await getCSPaymentsCredentials(req);

    expect(result).to.equal(mockSecretValue);
  });

  it('should throw ResourceNotFound if credentials decoded value is null', async () => {
    const debugStub = Sinon.stub(logger, 'debug');

    const base64Null = Buffer.from('null').toString('base64');
    req.secretManagerClient.get.resolves(base64Null);

    try {
      await getCSPaymentsCredentials(req);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('ResourceNotFound');
      expect(err.details).to.equal('Credentials not found.');
      expect(debugStub.calledOnce).to.be.true();
      const [tag] = debugStub.getCall(0).args;
      expect(tag).to.equal('SECRET_MANAGER_GET_CS_PAYMENTS_CREDENTIALS_ERROR');
    }
  });

  it('should log and rethrow when credentials secret JSON is malformed', async () => {
    const debugStub = Sinon.stub(logger, 'debug');
    const invalidBase64 = Buffer.from('not a json').toString('base64');

    req.secretManagerClient.get.resolves(invalidBase64);

    try {
      await getCSPaymentsCredentials(req);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err).to.be.instanceOf(SyntaxError);
      expect(debugStub.calledOnce).to.be.true();
      const [tag, errorArg] = debugStub.getCall(0).args;
      expect(tag).to.equal('SECRET_MANAGER_GET_CS_PAYMENTS_CREDENTIALS_ERROR');
      expect(errorArg).to.be.instanceOf(SyntaxError);
    }
  });

  it('should log and rethrow unexpected errors', async () => {
    const debugStub = Sinon.stub(logger, 'debug');

    req.secretManagerClient.get.rejects(new Error('Unknown failure'));

    try {
      await getCSPaymentsCredentials(req);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err).to.be.instanceOf(Error);
      expect(err.message).to.equal('Unknown failure');

      expect(debugStub.calledOnce).to.be.true();
      const [tag, errorArg] = debugStub.getCall(0).args;
      expect(tag).to.equal('SECRET_MANAGER_GET_CS_PAYMENTS_CREDENTIALS_ERROR');
      expect(errorArg).to.be.instanceOf(Error);
    }
  });
});
