import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import * as authorizationRepository from '../../../src/repositories/secretManager/authorizationRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Repository :: SecretManager :: getAuthorizationByChannel', () => {
  let secretManagerClientMock;

  beforeEach(() => {
    secretManagerClientMock = {
      get: Sinon.stub(),
    };
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should return parsed credentials from Basic b64 encoded secret', async () => {
    // "Basic client1:secret1" base64 encoded
    secretManagerClientMock.get.resolves('Basic Y2xpZW50MTpzZWNyZXQx');

    const result = await authorizationRepository.getAuthorizationByChannel(
      secretManagerClientMock,
      'client1',
      'refund'
    );

    expect(result).to.equal({ clientId: 'client1', clientSecret: 'secret1' });
  });

  it('should return parsed credentials from plain b64 encoded secret without Basic prefix', async () => {
    // "client2:secret2" base64 encoded
    secretManagerClientMock.get.resolves('Y2xpZW50MjpzZWNyZXQy');

    const result = await authorizationRepository.getAuthorizationByChannel(
      secretManagerClientMock,
      'client2',
      'refund'
    );

    expect(result).to.equal({ clientId: 'client2', clientSecret: 'secret2' });
  });

  it('should throw ResourceNotFound for missing secret', async () => {
    secretManagerClientMock.get.resolves(null);

    try {
      await authorizationRepository.getAuthorizationByChannel(
        secretManagerClientMock,
        'client3',
        'refund'
      );
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err.type).to.equal('ResourceNotFound');
    }
  });

  it('should rethrow unexpected errors as-is', async () => {
    const unexpectedError = new Error('Unexpected error');
    secretManagerClientMock.get.rejects(unexpectedError);

    try {
      await authorizationRepository.getAuthorizationByChannel(
        secretManagerClientMock,
        'client4',
        'refund'
      );
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err).to.equal(unexpectedError);
    }
  });
});
