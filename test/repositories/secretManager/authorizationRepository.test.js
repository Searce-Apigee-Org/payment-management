import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import * as authorizationRepository from '../../../src/repositories/secretManager/authorizationRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Repository :: SecretManager :: getAuthorizationByChannel', () => {
  let secretManagerClientMock, decodeB64Stub, secretUtilStub;

  beforeEach(() => {
    secretManagerClientMock = {
      get: Sinon.stub(),
    };
    decodeB64Stub = Sinon.stub();
    secretUtilStub = {
      buildSecretName: Sinon.stub().returns('mock-secret-name'),
    };
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should parse JSON secret', async () => {
    secretManagerClientMock.get.resolves(
      'eyJjbGllbnRJZCI6ICJjbGllbnQxIiwgImNsaWVudFNlY3JldCI6ICJzZWNyZXQxIn0='
    );
    decodeB64Stub.returns('{"clientId": "client1", "clientSecret": "secret1"}');

    const result = await authorizationRepository.getAuthorizationByChannel(
      secretManagerClientMock,
      'client1',
      'refund',
      { decodeB64: decodeB64Stub, secretUtil: secretUtilStub }
    );
    expect(result).to.equal({ clientId: 'client1', clientSecret: 'secret1' });
  });

  it('should return OperationFailed for non-JSON decoded secrets (e.g., colon-separated)', async () => {
    secretManagerClientMock.get.resolves('Y2xpZW50MjpzZWNyZXQy');
    decodeB64Stub.returns('client2:secret2');

    try {
      await authorizationRepository.getAuthorizationByChannel(
        secretManagerClientMock,
        'client2',
        'refund',
        { decodeB64: decodeB64Stub, secretUtil: secretUtilStub }
      );
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err.type).to.equal('OperationFailed');
    }
  });

  it('should throw OperationFailed for invalid secret format (non-JSON)', async () => {
    secretManagerClientMock.get.resolves('aW52YWxpZA==');
    decodeB64Stub.returns('invalid');
    try {
      await authorizationRepository.getAuthorizationByChannel(
        secretManagerClientMock,
        'client3',
        'refund',
        { decodeB64: decodeB64Stub, secretUtil: secretUtilStub }
      );
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err.type).to.equal('OperationFailed');
    }
  });

  it('should throw for missing secret', async () => {
    secretManagerClientMock.get.resolves(null);
    try {
      await authorizationRepository.getAuthorizationByChannel(
        secretManagerClientMock,
        'client4',
        'refund',
        { decodeB64: decodeB64Stub, secretUtil: secretUtilStub }
      );
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err.type).to.equal('ResourceNotFound');
    }
  });

  it('should throw OperationFailed if an unexpected error occurs (no type property)', async () => {
    secretManagerClientMock.get.rejects(new Error('Unexpected error'));
    try {
      await authorizationRepository.getAuthorizationByChannel(
        secretManagerClientMock,
        'client5',
        'refund',
        { decodeB64: decodeB64Stub, secretUtil: secretUtilStub }
      );
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err.type).to.equal('OperationFailed');
    }
  });

  it('should rethrow error if it has a type property', async () => {
    const customError = {
      type: 'CustomError',
      details: 'Something went wrong',
    };
    secretManagerClientMock.get.rejects(customError);
    try {
      await authorizationRepository.getAuthorizationByChannel(
        secretManagerClientMock,
        'client6',
        'refund',
        { decodeB64: decodeB64Stub, secretUtil: secretUtilStub }
      );
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err).to.equal(customError);
    }
  });
});
