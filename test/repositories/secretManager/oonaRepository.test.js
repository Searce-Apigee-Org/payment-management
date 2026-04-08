import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { getPricing } from '../../../src/repositories/secretManager/oonaRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Repository :: SecretManager :: Pricing Repository :: getPricing', () => {
  let secretManagerClient;

  beforeEach(() => {
    secretManagerClient = { get: Sinon.stub() };
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should throw InvalidOutboundRequest when secret is missing', async () => {
    secretManagerClient.get.resolves(null);

    try {
      await getPricing(secretManagerClient);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidOutboundRequest');
      expect(err.details).to.include('secret manager config not found');
    }
  });

  it('should return decoded secret when found', async () => {
    const mockSecret = 'eyJwcmljZSI6IDEwMH0=';
    secretManagerClient.get.resolves(mockSecret);

    const result = await getPricing(secretManagerClient);
    expect(result).to.equal(Buffer.from(mockSecret, 'base64').toString('utf8'));
  });

  it('should rethrow unexpected errors', async () => {
    secretManagerClient.get.rejects(new Error('boom'));

    try {
      await getPricing(secretManagerClient);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.message).to.equal('boom');
    }
  });
});
