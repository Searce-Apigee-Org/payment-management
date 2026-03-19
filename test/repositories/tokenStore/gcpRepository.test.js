import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

import {
  getGcpToken,
  updateGcpToken,
} from '../../../src/repositories/tokenStore/gcpRepository.js';

let mockReq;
let mockTokenStoreClient;
let mockNewToken;

beforeEach(() => {
  mockTokenStoreClient = {
    get: Sinon.stub(),
    set: Sinon.stub(),
  };

  mockReq = {};

  mockNewToken = JSON.stringify({ accessToken: 'new-token' });
});

afterEach(() => {
  Sinon.restore();
});

describe('Repository :: TokenStore :: GCPRepository :: getGcpToken', () => {
  it('should get GCP token from token store / redis successfully', async () => {
    mockTokenStoreClient.get.resolves(mockNewToken);
    let errorChecker;
    let token;

    try {
      token = await getGcpToken(mockReq, mockTokenStoreClient, 'client-id');
    } catch (error) {
      errorChecker = error;
    }

    Sinon.assert.calledOnce(mockTokenStoreClient.get);
    expect(token).to.equal(mockNewToken.accessToken);
    expect(errorChecker).to.equal(undefined);
  });

  it('should throw error.type=OperationFailed when there is an error', async () => {
    mockTokenStoreClient.get.rejects(new Error());
    let errorChecker;
    let token;

    try {
      token = await getGcpToken(mockReq, mockTokenStoreClient, 'client-id');
    } catch (error) {
      errorChecker = error;
    }

    Sinon.assert.calledOnce(mockTokenStoreClient.get);
    expect(token).to.equal(undefined);
    expect(errorChecker.type).to.equal('OperationFailed');
  });

  it('should throw error.type when there is an error', async () => {
    mockTokenStoreClient.get.rejects({ type: 'error' });
    let errorChecker;
    let token;

    try {
      token = await getGcpToken(mockReq, mockTokenStoreClient, 'client-id');
    } catch (error) {
      errorChecker = error;
    }

    Sinon.assert.calledOnce(mockTokenStoreClient.get);
    expect(token).to.equal(undefined);
    expect(errorChecker).to.equal({ type: 'error' });
  });
});

describe('Repository :: TokenStore :: GCPRepository :: updateGcpToken', () => {
  it('should update GCP token in token store / redis successfully', async () => {
    mockTokenStoreClient.set.resolves();
    let errorChecker;

    try {
      await updateGcpToken(
        mockReq,
        mockTokenStoreClient,
        'client-id',
        mockNewToken
      );
    } catch (error) {
      errorChecker = error;
    }

    Sinon.assert.calledOnce(mockTokenStoreClient.set);
    expect(errorChecker).to.equal(undefined);
  });

  it('should throw error.type=OperationFailed when there is an error', async () => {
    mockTokenStoreClient.set.rejects(new Error());
    let errorChecker;
    let token;

    try {
      token = await updateGcpToken(
        mockReq,
        mockTokenStoreClient,
        'client-id',
        mockNewToken
      );
    } catch (error) {
      errorChecker = error;
    }

    Sinon.assert.calledOnce(mockTokenStoreClient.set);
    expect(token).to.equal(undefined);
    expect(errorChecker.type).to.equal('OperationFailed');
  });

  it('should throw error.type when there is an error', async () => {
    mockTokenStoreClient.set.rejects({ type: 'error' });
    let errorChecker;
    let token;

    try {
      token = await updateGcpToken(
        mockReq,
        mockTokenStoreClient,
        'client-id',
        mockNewToken
      );
    } catch (error) {
      errorChecker = error;
    }

    Sinon.assert.calledOnce(mockTokenStoreClient.set);
    expect(token).to.equal(undefined);
    expect(errorChecker).to.equal({ type: 'error' });
  });
});
