import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { config } from '../../../convict/config.js';
import { getPricing } from '../../../src/repositories/secretManager/singlifeRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Repository :: SecretManager :: singlifeRepository :: getPricing', () => {
  let secretManagerClient;
  let configGetStub;

  beforeEach(() => {
    secretManagerClient = { get: Sinon.stub() };
    configGetStub = Sinon.stub(config, 'get');
    // Required by secretUtil.buildSecretName when fetching from secret manager
    configGetStub.withArgs('gcp.projectID').returns('mock-project');
    configGetStub.withArgs('gcp.secret.prefix').returns('mock-prefix');
    configGetStub.withArgs('gcp.secret.suffix').returns('mock-suffix');
    configGetStub.withArgs('singlife.pricing').returns(undefined);
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should return decoded value when singlife.pricing is cached', async () => {
    const cachedPayload = '{"budgetProtectConfig":{"rate":10}}';
    const cachedB64 = Buffer.from(cachedPayload, 'utf8').toString('base64');
    configGetStub.withArgs('singlife.pricing').returns(cachedB64);

    const result = await getPricing(secretManagerClient);

    expect(result).to.equal(cachedPayload);
    expect(secretManagerClient.get.notCalled).to.be.true();
  });

  it('should throw InvalidOutboundRequest when secret is missing and no cache', async () => {
    secretManagerClient.get.resolves(null);

    try {
      await getPricing(secretManagerClient);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidOutboundRequest');
      expect(err.details).to.include('secret manager config not found');
    }
  });

  it('should return decoded secret when found from secret manager', async () => {
    const mockSecret = Buffer.from('{"rate":5}', 'utf8').toString('base64');
    secretManagerClient.get.resolves(mockSecret);

    const result = await getPricing(secretManagerClient);

    expect(result).to.equal('{"rate":5}');
  });

  it('should rethrow when secretManagerClient.get rejects', async () => {
    const error = new Error('Secret manager unavailable');
    secretManagerClient.get.rejects(error);

    try {
      await getPricing(secretManagerClient);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err).to.equal(error);
      expect(err.message).to.equal('Secret manager unavailable');
    }
  });
});
