import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { config } from '../../../convict/config.js';
import { getPricing } from '../../../src/repositories/secretManager/oonaRepository.js';
import { constants, secretUtil } from '../../../src/util/index.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Repository :: SecretManager :: Pricing Repository :: getPricing', () => {
  let secretManagerClient;
  let configGetStub;
  let expectedSecretName;

  beforeEach(() => {
    secretManagerClient = { get: Sinon.stub() };
    configGetStub = Sinon.stub(config, 'get');
    configGetStub.withArgs('gcp.projectID').returns('mock-project');
    configGetStub.withArgs('gcp.secret.prefix').returns('mock-prefix');
    configGetStub.withArgs('gcp.secret.suffix').returns('mock-suffix');
    configGetStub.withArgs('oona.pricing').returns(undefined);

    expectedSecretName = secretUtil.buildSecretName(
      constants.SECRET_ENTITY.OONA_PRICING
    );
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should return decoded value when oona.pricing is cached', async () => {
    const cachedPayload = '{"OONA_COMP_TRAVEL":{"4":{"pricing":{"net":1.23}}}}';
    const cachedB64 = Buffer.from(cachedPayload, 'utf8').toString('base64');
    configGetStub.withArgs('oona.pricing').returns(cachedB64);

    const result = await getPricing(secretManagerClient);

    expect(result).to.equal(JSON.parse(cachedPayload));
    expect(secretManagerClient.get.notCalled).to.be.true();
  });

  it('should throw InvalidOutboundRequest when secret is missing', async () => {
    secretManagerClient.get.resolves(null);

    try {
      await getPricing(secretManagerClient);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidOutboundRequest');
      expect(err.details).to.equal(
        `'${expectedSecretName}' in secret manager config not found.`
      );
      expect(
        secretManagerClient.get.calledOnceWithExactly(expectedSecretName)
      ).to.be.true();
    }
  });

  it('should return decoded secret when found', async () => {
    const mockSecret = 'eyJwcmljZSI6IDEwMH0=';
    secretManagerClient.get.resolves(mockSecret);

    const result = await getPricing(secretManagerClient);
    expect(result).to.equal({ price: 100 });
    expect(
      secretManagerClient.get.calledOnceWithExactly(expectedSecretName)
    ).to.be.true();
  });

  it('should rethrow unexpected errors', async () => {
    secretManagerClient.get.rejects(new Error('boom'));

    try {
      await getPricing(secretManagerClient);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.message).to.equal('boom');
      expect(
        secretManagerClient.get.calledOnceWithExactly(expectedSecretName)
      ).to.be.true();
    }
  });
});
