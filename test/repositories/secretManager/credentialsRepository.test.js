import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { getPaymentsCredentials } from '../../../src/repositories/secretManager/credentialsRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;
export { lab };

describe('Repository :: SecretManager :: getPaymentsCredentials', () => {
  let secretManagerClient;
  const downstream = 'RUDY';
  const service = 'PAYMENTS';
  const version = 'V1';
  const secretEntity = 'CREDENTIALS';
  const secretValue = 'abcd1234=';

  beforeEach(() => {
    secretManagerClient = {
      get: Sinon.stub(),
    };
  });

  afterEach(() => {
    Sinon.restore();
  });
  it('throws OperationFailed if unexpected error occurs', async () => {
    const testError = new Error('Network failure');
    secretManagerClient.get.rejects(testError);

    try {
      await getPaymentsCredentials(
        secretManagerClient,
        downstream,
        service,
        version,
        secretEntity
      );
    } catch (err) {
      expect(err.type).to.equal('OperationFailed');
      expect(err.tagOTPReference).to.be.true();
    }

    Sinon.assert.calledOnce(secretManagerClient.get);
  });

  it('throws the original error if it has a type property', async () => {
    const originalError = {
      type: 'CustomError',
      details: 'Something went wrong',
    };
    secretManagerClient.get.rejects(originalError);

    try {
      await getPaymentsCredentials(
        secretManagerClient,
        downstream,
        service,
        version,
        secretEntity
      );
    } catch (err) {
      expect(err).to.equal(originalError);
    }

    Sinon.assert.calledOnce(secretManagerClient.get);
  });

  it('throws ResourceNotFound if secret is null', async () => {
    secretManagerClient.get.resolves(null);

    try {
      await getPaymentsCredentials(
        secretManagerClient,
        downstream,
        service,
        version,
        secretEntity
      );
    } catch (err) {
      expect(err.type).to.equal('ResourceNotFound');
    }

    Sinon.assert.calledOnce(secretManagerClient.get);
  });

  it('returns parsed secret on success', async () => {
    secretManagerClient.get.resolves(secretValue);

    const result = await getPaymentsCredentials(
      secretManagerClient,
      downstream,
      service,
      version,
      secretEntity
    );

    expect(result).to.equal(secretValue);
    Sinon.assert.calledOnce(secretManagerClient.get);
  });
});
