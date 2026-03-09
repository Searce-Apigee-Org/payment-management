import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import sinon from 'sinon';
import {
  fetchAccessToken,
  updateAccessToken,
} from '../../../src/repositories/tokenStore/csPaymentsRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;
export { lab };

describe('Repository :: TokenStore :: CSPayments :: fetchAccessToken', () => {
  let req, secretEntity;

  beforeEach(() => {
    sinon.restore();

    req = {
      payload: { tokenPaymentId: 'client-123' },
      tokenStoreClient: {
        get: sinon.stub(),
        set: sinon.stub(),
      },
    };

    secretEntity = 'cs-payments-token';
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should log and rethrow when fetching token fails', async () => {
    const debugStub = sinon.stub(logger, 'debug');
    req.tokenStoreClient.get.rejects(new Error('Failed to retrieve token'));

    try {
      await fetchAccessToken(req, secretEntity);
      throw new Error('Expected function to throw');
    } catch (err) {
      expect(err).to.be.instanceOf(Error);
      expect(err.message).to.equal('Failed to retrieve token');

      expect(debugStub.calledOnce).to.be.true();
      const [tag, errorArg] = debugStub.getCall(0).args;
      expect(tag).to.equal('CS_PAYMENTS_FETCH_ACCESS_TOKEN_ERROR');
      expect(errorArg).to.be.instanceOf(Error);
    }
  });

  it('should return null if no access token is found in the store', async () => {
    req.tokenStoreClient.get.resolves(null);

    const result = await fetchAccessToken(req, secretEntity);

    expect(result).to.be.null();
    expect(req.tokenStoreClient.get.calledOnce).to.be.true();

    const [reqArg, configArg] = req.tokenStoreClient.get.getCall(0).args;
    expect(reqArg).to.equal(req);
    expect(configArg).to.be.an.object();
    expect(configArg.params).to.equal({
      clientId: req.payload.tokenPaymentId,
      secretEntity,
    });
    expect(typeof configArg.keyFormat).to.equal('function');
    expect(configArg.keyFormat(configArg.params)).to.equal(
      `${secretEntity}::${req.payload.tokenPaymentId}`
    );
  });

  it('should return null when store returns undefined (non-string path)', async () => {
    req.tokenStoreClient.get.resolves(undefined);

    const result = await fetchAccessToken(req, secretEntity);

    expect(result).to.be.null();
    expect(req.tokenStoreClient.get.calledOnce).to.be.true();

    const [reqArg, configArg] = req.tokenStoreClient.get.getCall(0).args;
    expect(reqArg).to.equal(req);
    expect(configArg).to.be.an.object();
    expect(configArg.params).to.equal({
      clientId: req.payload.tokenPaymentId,
      secretEntity,
    });
    expect(configArg.keyFormat(configArg.params)).to.equal(
      `${secretEntity}::${req.payload.tokenPaymentId}`
    );
  });

  it('should return JSON string when token is a JSON string (no parsing)', async () => {
    const stored = { access_token: 'abc123', expiry: 123456 };
    const storedJson = JSON.stringify(stored);
    req.tokenStoreClient.get.resolves(storedJson);

    const result = await fetchAccessToken(req, secretEntity);

    expect(result).to.equal(storedJson);
  });

  it('should return raw string when token is a non-JSON string', async () => {
    req.tokenStoreClient.get.resolves('plain-session-token');

    const result = await fetchAccessToken(req, secretEntity);

    expect(result).to.equal('plain-session-token');
  });

  it('should return null when token is an empty string (non-JSON string path)', async () => {
    req.tokenStoreClient.get.resolves('');

    const result = await fetchAccessToken(req, secretEntity);

    expect(result).to.be.null();
  });

  it('should return the token when it is a non-string object', async () => {
    const storedObj = { token: 'xyz', meta: { a: 1 } };
    req.tokenStoreClient.get.resolves(storedObj);

    const result = await fetchAccessToken(req, secretEntity);

    expect(result).to.equal(storedObj);
  });
});

describe('Repository :: TokenStore :: CSPayments :: updateAccessToken', () => {
  let req, secretEntity, value;

  beforeEach(() => {
    sinon.restore();

    req = {
      payload: { tokenPaymentId: 'client-123' },
      tokenStoreClient: {
        get: sinon.stub(),
        set: sinon.stub(),
      },
    };

    secretEntity = 'cs-payments-token';
    value = JSON.stringify({ access_token: 'new-token', expiry: 999999 });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should log and rethrow when updating token fails', async () => {
    const debugStub = sinon.stub(logger, 'debug');
    req.tokenStoreClient.set.rejects(new Error('Update failed'));

    try {
      await updateAccessToken(req, value, secretEntity);
      throw new Error('Expected function to throw');
    } catch (err) {
      expect(err).to.be.instanceOf(Error);
      expect(err.message).to.equal('Update failed');

      expect(debugStub.calledOnce).to.be.true();
      const [tag, errorArg] = debugStub.getCall(0).args;
      expect(tag).to.equal('CS_PAYMENTS_UPDATE_ACCESS_TOKEN_ERROR');
      expect(errorArg).to.be.instanceOf(Error);
    }
  });

  it('should call token store set with correct arguments on success', async () => {
    req.tokenStoreClient.set.resolves();

    await updateAccessToken(req, value, secretEntity);

    expect(req.tokenStoreClient.set.calledOnce).to.be.true();

    const [reqArg, configArg, valueArg] =
      req.tokenStoreClient.set.getCall(0).args;
    expect(reqArg).to.equal(req);
    expect(valueArg).to.equal(value);

    expect(configArg).to.be.an.object();
    expect(configArg.params).to.equal({
      clientId: req.payload.tokenPaymentId,
      secretEntity,
    });
    expect(typeof configArg.keyFormat).to.equal('function');
    expect(configArg.keyFormat(configArg.params)).to.equal(
      `${secretEntity}::${req.payload.tokenPaymentId}`
    );
  });
});
