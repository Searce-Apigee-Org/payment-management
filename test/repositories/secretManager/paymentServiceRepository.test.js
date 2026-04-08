import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { config } from '../../../convict/config.js';
import {
  get,
  getGcashProcessingFee,
  getInitVoucher,
  getPaymentServiceCredentials,
  getRefundAuthToken,
} from '../../../src/repositories/secretManager/paymentServiceRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Repository :: SecretManager :: Payment Service Repository :: getPaymentServiceCredentials', () => {
  let secretManagerClient;
  let configGetStub;

  beforeEach(() => {
    secretManagerClient = { get: Sinon.stub() };
    configGetStub = Sinon.stub(config, 'get');
    configGetStub.withArgs('gcp.projectID').returns('mock-project');
    configGetStub.withArgs('gcp.secret.prefix').returns('mock-prefix');
    configGetStub.withArgs('gcp.secret.suffix').returns('mock-suffix');
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should throw InsufficientParameters when secret is missing', async () => {
    secretManagerClient.get.resolves(null);

    try {
      await getPaymentServiceCredentials(secretManagerClient, 'payment', '123');
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('InsufficientParameters');
      expect(err.details).to.include('secret manager config not found');
    }
  });

  it('should return secret as-is when found', async () => {
    const mockValue = 'eyJrZXkiOiAidmFsdWUifQ==';
    const mockSecret = '{"client-id": "eyJrZXkiOiAidmFsdWUifQ=="}';
    secretManagerClient.get.resolves(mockSecret);

    const result = await getPaymentServiceCredentials(
      secretManagerClient,
      'payment',
      'client-id'
    );
    expect(result).to.equal(mockValue);
  });

  it('should rethrow unexpected errors', async () => {
    secretManagerClient.get.rejects(new Error('boom'));

    try {
      await getPaymentServiceCredentials(secretManagerClient, 'payment', '123');
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.message).to.equal('boom');
    }
  });
});

describe('Repository :: SecretManager :: Payment Service Repository :: getInitVoucher', () => {
  let secretManagerClient;
  let configGetStub;

  beforeEach(() => {
    secretManagerClient = { get: Sinon.stub() };
    configGetStub = Sinon.stub(config, 'get');
    configGetStub.withArgs('gcp.projectID').returns('mock-project');
    configGetStub.withArgs('gcp.secret.prefix').returns('mock-prefix');
    configGetStub.withArgs('gcp.secret.suffix').returns('mock-suffix');
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should throw ResourceNotFound when secret is missing', async () => {
    secretManagerClient.get.resolves(null);

    try {
      await getInitVoucher(secretManagerClient, 'voucher', 'v1', '00010');
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('ResourceNotFound');
      expect(err.details).to.include('secret manager config not found');
    }
  });

  it('should return decoded secret when found', async () => {
    const mockSecret = 'mock-secret';
    secretManagerClient.get.resolves(mockSecret);

    const result = await getInitVoucher(
      secretManagerClient,
      'voucher',
      'v1',
      '00010'
    );
    expect(result).to.equal(Buffer.from(mockSecret, 'base64').toString('utf8'));
  });

  it('should rethrow unexpected errors', async () => {
    secretManagerClient.get.rejects(new Error('crash'));

    try {
      await getInitVoucher(secretManagerClient, 'voucher', 'v1', '00010');
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.message).to.equal('crash');
    }
  });
});

describe('Repository :: SecretManager :: Payment Service Repository :: get', () => {
  let secretManagerClient;
  let configGetStub;

  beforeEach(() => {
    secretManagerClient = { get: Sinon.stub() };
    configGetStub = Sinon.stub(config, 'get');
    configGetStub.withArgs('gcp.projectID').returns('mock-project');
    configGetStub.withArgs('gcp.secret.prefix').returns('mock-prefix');
    configGetStub.withArgs('gcp.secret.suffix').returns('mock-suffix');
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should throw ResourceNotFound when secret is missing', async () => {
    secretManagerClient.get.resolves(null);

    try {
      await get(secretManagerClient, 'merchant-keys');
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('ResourceNotFound');
      expect(err.details).to.include('secret manager config not found');
    }
  });

  it('should return decoded secret when found', async () => {
    const mockSecret = 'mock-secret';
    secretManagerClient.get.resolves(mockSecret);

    const result = await get(secretManagerClient, 'merchant-keys');
    expect(result).to.equal(Buffer.from(mockSecret, 'base64').toString('utf8'));
  });

  it('should rethrow unexpected errors', async () => {
    secretManagerClient.get.rejects(new Error('network fail'));

    try {
      await get(secretManagerClient, 'merchant-keys');
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.message).to.equal('network fail');
    }
  });
});

describe('Repository :: SecretManager :: Payment Service Repository :: getGcashProcessingFee', () => {
  let secretManagerClient;
  let configGetStub;

  beforeEach(() => {
    secretManagerClient = { get: Sinon.stub() };
    configGetStub = Sinon.stub(config, 'get');
    configGetStub.withArgs('gcp.projectID').returns('mock-project');
    configGetStub.withArgs('gcp.secret.prefix').returns('mock-prefix');
    configGetStub.withArgs('gcp.secret.suffix').returns('mock-suffix');
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should throw InvalidOutboundRequest when secret is missing', async () => {
    secretManagerClient.get.resolves(null);

    try {
      await getGcashProcessingFee(secretManagerClient);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidOutboundRequest');
      expect(err.details).to.include('secret manager config not found');
    }
  });

  it('should return decoded secret when found', async () => {
    const mockSecret = 'mock-secret';
    secretManagerClient.get.resolves(mockSecret);

    const result = await getGcashProcessingFee(secretManagerClient);
    expect(result).to.equal(Buffer.from(mockSecret, 'base64').toString('utf8'));
  });

  it('should rethrow unexpected errors', async () => {
    secretManagerClient.get.rejects(new Error('panic'));

    try {
      await getGcashProcessingFee(secretManagerClient);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.message).to.equal('panic');
    }
  });
});

describe('Repository :: SecretManager :: Payment Service Repository :: getRefundAuthToken', () => {
  let secretManagerClient;
  let configGetStub;

  beforeEach(() => {
    secretManagerClient = { get: Sinon.stub() };
    configGetStub = Sinon.stub(config, 'get');
    configGetStub.withArgs('gcp.projectID').returns('mock-project');
    configGetStub.withArgs('gcp.secret.prefix').returns('mock-prefix');
    configGetStub.withArgs('gcp.secret.suffix').returns('mock-suffix');
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should throw InvalidOutboundRequest when secret is missing', async () => {
    secretManagerClient.get.resolves(null);

    try {
      await getRefundAuthToken(secretManagerClient);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidOutboundRequest');
      expect(err.details).to.include('secret manager config not found');
    }
  });

  it('should return decoded secret when found', async () => {
    const mockSecret = 'mock-secret';
    secretManagerClient.get.resolves(mockSecret);

    const result = await getRefundAuthToken(secretManagerClient);
    expect(result).to.equal(Buffer.from(mockSecret, 'base64').toString('utf8'));
  });

  it('should rethrow unexpected errors', async () => {
    secretManagerClient.get.rejects(new Error('panic'));

    try {
      await getRefundAuthToken(secretManagerClient);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.message).to.equal('panic');
    }
  });
});
