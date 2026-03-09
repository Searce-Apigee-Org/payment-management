import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import {
  getPaymentsCredentials,
  getRudyAuthCredentials,
} from '../../../src/repositories/secretManager/rudyRepository.js';

import { constants } from '../../../src/util/index.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Repository :: SecretManager :: Rudy Repository :: getRudyAuthCredentials', () => {
  let secretManagerClient;

  beforeEach(() => {
    secretManagerClient = {
      get: Sinon.stub(),
    };
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('returns parsed secret on success', async () => {
    const decodedSecret = 'dXNlcjpwYXNz';
    const base64Secret = Buffer.from(decodedSecret).toString('base64');

    secretManagerClient.get.resolves(base64Secret);

    const result = await getRudyAuthCredentials(
      secretManagerClient,
      constants.DOWNSTREAM.RUDY,
      constants.SECRET_ENTITY.AUTH_CREDS
    );

    expect(result).to.equal(decodedSecret);
    expect(secretManagerClient.get.calledOnce).to.be.true();
  });

  it('throws ResourceNotFound if secret value is missing', async () => {
    secretManagerClient.get.resolves(null);

    try {
      await getRudyAuthCredentials(
        secretManagerClient,
        constants.DOWNSTREAM.RUDY,
        constants.SECRET_ENTITY.AUTH_CREDS
      );
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('ResourceNotFound');
      expect(err.details).to.include('secret manager config not found');
    }
    expect(secretManagerClient.get.calledOnce).to.be.true();
  });

  it('rethrows original error when it has a type property', async () => {
    const originalError = {
      type: 'CustomError',
      details: 'Something went wrong',
    };
    secretManagerClient.get.rejects(originalError);

    try {
      await getRudyAuthCredentials(
        secretManagerClient,
        constants.DOWNSTREAM.RUDY,
        constants.SECRET_ENTITY.AUTH_CREDS
      );
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err).to.equal(originalError);
    }
    expect(secretManagerClient.get.calledOnce).to.be.true();
  });

  it('throws OperationFailed for other unexpected errors', async () => {
    secretManagerClient.get.rejects(new Error('Unknown failure'));

    try {
      await getRudyAuthCredentials(
        secretManagerClient,
        constants.DOWNSTREAM.RUDY,
        constants.SECRET_ENTITY.AUTH_CREDS
      );
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('OperationFailed');
      expect(err.tagOTPReference).to.be.true();
    }
    expect(secretManagerClient.get.calledOnce).to.be.true();
  });
});

describe('Repository :: SecretManager :: Rudy Repository :: getPaymentsCredentials', () => {
  let secretManagerClient;

  beforeEach(() => {
    secretManagerClient = {
      get: Sinon.stub(),
    };
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('returns token_secret from array payload on success', async () => {
    const tokenSecret = 'local-payments-token-secret';
    const payload = [{ id: 'GetPayments', token_secret: tokenSecret }];
    const base64Secret = Buffer.from(JSON.stringify(payload)).toString(
      'base64'
    );

    secretManagerClient.get.resolves(base64Secret);

    const result = await getPaymentsCredentials(secretManagerClient);

    expect(result).to.equal(tokenSecret);
    expect(secretManagerClient.get.calledOnce).to.be.true();
  });

  it('throws ResourceNotFound if secret value is missing', async () => {
    secretManagerClient.get.resolves(null);

    try {
      await getPaymentsCredentials(secretManagerClient);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('ResourceNotFound');
      expect(err.details).to.include('secret manager config not found');
    }
    expect(secretManagerClient.get.calledOnce).to.be.true();
  });

  it('rethrows original error when it has a type property', async () => {
    const originalError = {
      type: 'CustomError',
      details: 'Something went wrong',
    };
    secretManagerClient.get.rejects(originalError);

    try {
      await getPaymentsCredentials(secretManagerClient);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err).to.equal(originalError);
    }
    expect(secretManagerClient.get.calledOnce).to.be.true();
  });

  it('throws OperationFailed for other unexpected errors', async () => {
    secretManagerClient.get.rejects(new Error('Unknown failure'));

    try {
      await getPaymentsCredentials(secretManagerClient);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('OperationFailed');
      expect(err.tagOTPReference).to.be.true();
    }
    expect(secretManagerClient.get.calledOnce).to.be.true();
  });
});
