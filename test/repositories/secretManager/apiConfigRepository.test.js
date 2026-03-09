import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import {
  getApiConfig,
  getDNOConfig,
} from '../../../src/repositories/secretManager/apiConfigRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Repository :: SecretManager :: ApiConfig Repository :: getApiConfig', () => {
  let secretManagerClient;

  beforeEach(() => {
    secretManagerClient = { get: Sinon.stub() };
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should throw ResourceNotFound when secret is missing or empty', async () => {
    secretManagerClient.get.resolves('');

    try {
      await getApiConfig(secretManagerClient, '00010', 'v1', 'payment');
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('ResourceNotFound');
    }
  });

  it('should return parsed secret when secret exists', async () => {
    const mockSecret = { apiKey: '12345' };
    const encoded = Buffer.from(JSON.stringify(mockSecret)).toString('base64');
    secretManagerClient.get.resolves(encoded);

    const result = await getApiConfig(
      secretManagerClient,
      '00010',
      'v1',
      'payment'
    );
    expect(result).to.equal(mockSecret);
  });

  it('should rethrow unexpected errors', async () => {
    secretManagerClient.get.rejects(new Error('Connection failed'));

    try {
      await getApiConfig(secretManagerClient, '00010', 'v1', 'payment');
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.message).to.equal('Connection failed');
    }
  });
});

describe('Repository :: SecretManager :: ApiConfig Repository :: getDNOConfig', () => {
  let secretManagerClient;

  beforeEach(() => {
    secretManagerClient = { get: Sinon.stub() };
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should throw ResourceNotFound when secret is missing', async () => {
    secretManagerClient.get.resolves(null);

    try {
      await getDNOConfig(secretManagerClient);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('ResourceNotFound');
      expect(err.details).to.include('secret manager config not found');
    }
  });

  it('should return parsed secret when found', async () => {
    const mockSecret = { dno: 'xyz' };
    const encoded = Buffer.from(JSON.stringify(mockSecret)).toString('base64');
    secretManagerClient.get.resolves(encoded);

    const result = await getDNOConfig(secretManagerClient);
    expect(result).to.equal(mockSecret);
  });

  it('should throw OperationFailed for unexpected errors', async () => {
    secretManagerClient.get.rejects(new Error('boom'));

    try {
      await getDNOConfig(secretManagerClient);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('OperationFailed');
    }
  });
});
