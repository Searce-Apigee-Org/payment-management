import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { getAccountTokenKey } from '../../../src/repositories/secretManager/accountTokenRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Repository :: SecretManager :: Account Token Repository :: getAccountTokenKey', () => {
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
      await getAccountTokenKey(secretManagerClient, 'entity', 'v1');
    } catch (err) {
      expect(err.type).to.equal('ResourceNotFound');
      expect(err.details).to.include('secret manager config not found');
    }
  });

  it('should return decoded secret when found', async () => {
    const rawData = 'secret-value';
    const encoded = Buffer.from(rawData).toString('base64');
    secretManagerClient.get.resolves(encoded);

    const result = await getAccountTokenKey(
      secretManagerClient,
      'entity',
      'v1'
    );

    expect(result).to.equal(rawData);
  });

  it('should rethrow unexpected errors', async () => {
    const error = new Error('network fail');
    secretManagerClient.get.rejects(error);

    try {
      await getAccountTokenKey(secretManagerClient, 'entity', 'v1');
    } catch (err) {
      expect(err.message).to.equal('network fail');
    }
  });
});
