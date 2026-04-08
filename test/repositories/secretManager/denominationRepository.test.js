import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { getESIMAmountValue } from '../../../src/repositories/secretManager/denominationRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Repository :: SecretManager :: Denomination Repository :: getESIMAmountValue', () => {
  let secretManagerClient;

  beforeEach(() => {
    secretManagerClient = {
      get: Sinon.stub(),
    };
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should throw ResourceNotFound if secret value is missing', async () => {
    const category = 'esim';
    const secretEntity = 'requestTypes';

    secretManagerClient.get.resolves(null);

    try {
      await getESIMAmountValue(secretManagerClient, category, secretEntity);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('ResourceNotFound');
      expect(err.details).to.include('secret manager config not found');
    }
  });

  it('should rethrow unexpected errors', async () => {
    const category = 'esim';
    const secretEntity = 'requestTypes';

    secretManagerClient.get.rejects(new Error('Unknown failure'));

    try {
      await getESIMAmountValue(secretManagerClient, category, secretEntity);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err).to.be.instanceOf(Error);
      expect(err.message).to.equal('Unknown failure');
    }
  });

  it('should return the decoded secret when found', async () => {
    const category = 'esim';
    const secretEntity = 'requestTypes';
    const mockSecretValue = [
      { type: 'BuyESIM', amountValue: 100 },
      { type: 'PtoESIM', amountValue: 200 },
    ];
    const base64Encoded = Buffer.from(JSON.stringify(mockSecretValue)).toString(
      'base64'
    );

    secretManagerClient.get.resolves(base64Encoded);

    const result = await getESIMAmountValue(
      secretManagerClient,
      category,
      secretEntity
    );

    expect(result).to.equal(mockSecretValue);
  });
});
