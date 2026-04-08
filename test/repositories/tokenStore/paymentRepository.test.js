import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import sinon from 'sinon';
import {
  fetchAccessTokenByChannel,
  updateAccessTokenByChannel,
} from '../../../src/repositories/tokenStore/paymentRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;
export { lab };

describe('Repository :: TokenStore :: PaymentRepository :: fetchAccessTokenByChannel', () => {
  let req, tokenStoreClientMock, clientId, secretEntity, sessionId;

  beforeEach(() => {
    sinon.restore();
    req = {};

    tokenStoreClientMock = {
      get: sinon.stub(),
      set: sinon.stub(),
    };

    clientId = '123';
    secretEntity = 'namax-token';
    sessionId = 'mock-session-token';
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should throw an error if fetching the access token fails', async () => {
    tokenStoreClientMock.get.rejects(new Error('Failed to retrieve token'));

    try {
      await fetchAccessTokenByChannel(
        req,
        tokenStoreClientMock,
        clientId,
        secretEntity
      );
      throw new Error('Expected function to throw');
    } catch (err) {
      expect(err.message).to.equal('Failed to retrieve token');
    }
  });

  it('should return null if no access token is found in the store', async () => {
    tokenStoreClientMock.get.resolves(null);

    const result = await fetchAccessTokenByChannel(
      req,
      tokenStoreClientMock,
      clientId,
      secretEntity
    );

    expect(result).to.be.null();
  });

  it('should return the access token if it exists in the store', async () => {
    tokenStoreClientMock.get.resolves(sessionId);

    const result = await fetchAccessTokenByChannel(
      req,
      tokenStoreClientMock,
      clientId,
      secretEntity
    );

    expect(result).to.equal(sessionId);
  });
});

describe('Repository :: TokenStore :: PaymentRepository :: updateAccessTokenByChannel', () => {
  let req, tokenStoreClientMock, clientId, secretEntity, sessionId;

  beforeEach(() => {
    sinon.restore();
    req = {};

    tokenStoreClientMock = {
      get: sinon.stub(),
      set: sinon.stub(),
    };

    clientId = '123';
    secretEntity = 'namax-token';
    sessionId = 'mock-session-token';
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should throw an error if updating the access token fails', async () => {
    tokenStoreClientMock.set.rejects(new Error('Update failed'));

    try {
      await updateAccessTokenByChannel(
        req,
        tokenStoreClientMock,
        sessionId,
        clientId,
        secretEntity
      );
      throw new Error('Expected function to throw');
    } catch (err) {
      expect(err.message).to.equal('Update failed');
    }
  });

  it('should successfully update the access token in the store', async () => {
    tokenStoreClientMock.set.resolves();

    await updateAccessTokenByChannel(
      req,
      tokenStoreClientMock,
      sessionId,
      clientId,
      secretEntity
    );

    expect(tokenStoreClientMock.set.calledOnce).to.be.true();
  });
});
