import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

import jwt from 'jsonwebtoken';
import {
  generateOAuthToken,
  getOauthToken,
  paymentStatusCallback,
  refreshTokenAndSave,
} from '../../../src/repositories/gcp/orderManagementRepository.js';
import * as constants from '../../../src/util/constants.js';

let mockHttp;
let mockTokenStore;
let mockTokenStoreClient;
let mockReq;
let mockToken;

beforeEach(async () => {
  mockHttp = {
    post: Sinon.stub(),
    postWithRetry: Sinon.stub(),
  };

  mockToken = jwt.sign(
    { sub: 'mock-user', scope: 'read write' },
    'test-secret',
    { expiresIn: '1h' }
  );

  mockTokenStoreClient = {};

  mockTokenStore = {
    gcpRepository: {
      getGcpToken: Sinon.stub().resolves(mockToken),
      updateGcpToken: Sinon.stub().resolves(),
    },
  };

  mockReq = {};
});

afterEach(() => {
  Sinon.restore();
});
describe('Repository :: GCP :: OrderManagementRepository :: generateOAuthToken', () => {
  it('should generate oauth token successfully', async () => {
    mockHttp.post.resolves({ access_token: mockToken });
    const token = await generateOAuthToken(mockHttp);

    expect(token).to.equal(mockToken);
  });

  it('should error.type=OperationFailed when there is an error encountered', async () => {
    const generateOAuthTokenError = new Error('generateOAuthTokenError');
    mockHttp.post.rejects(generateOAuthTokenError);

    let token;

    try {
      token = await generateOAuthToken(mockHttp);
    } catch (error) {
      expect(error.type).to.equal('OperationFailed');
      expect(token).to.equal(undefined);
    }
  });

  it('should error.data when there is an error encountered', async () => {
    mockHttp.post.rejects({ data: 'test' });

    let token;

    try {
      token = await generateOAuthToken(mockHttp);
    } catch (error) {
      expect(error).to.equal('test');
      expect(token).to.equal(undefined);
    }
  });
});

describe('Repository :: GCP :: OrderManagementRepository :: refreshTokenAndSave', () => {
  it('should generate oauth token and update in secrets manager successfully', async () => {
    mockHttp.post.resolves({ access_token: mockToken });
    const token = await refreshTokenAndSave(
      mockReq,
      mockTokenStore,
      mockTokenStoreClient,
      mockHttp,
      'channel-id'
    );

    expect(token).to.equal(mockToken);
    Sinon.assert.calledOnce(mockTokenStore.gcpRepository.updateGcpToken);
    Sinon.assert.calledWithMatch(
      mockTokenStore.gcpRepository.updateGcpToken,
      mockReq,
      mockTokenStoreClient,
      'channel-id',
      JSON.stringify({ accessToken: mockToken })
    );
    Sinon.assert.calledOnce(mockHttp.post);
  });

  it('should error.type=OperationFailed when there is an error encountered', async () => {
    const refreshTokenAndSaveError = new Error('refreshTokenAndSaveError');
    mockHttp.post.rejects(refreshTokenAndSaveError);

    let token;

    try {
      token = await refreshTokenAndSave(
        mockReq,
        mockTokenStore,
        mockTokenStoreClient,
        mockHttp,
        'channel-id'
      );
    } catch (error) {
      expect(error.type).to.equal('OperationFailed');
      expect(token).to.equal(undefined);
    }
  });
});

describe('Repository :: GCP :: OrderManagementRepository :: getOauthToken', () => {
  it('should get oauth token from secrets manager successfully', async () => {
    const validToken = jwt.sign(
      { sub: 'mock-user', scope: 'read write' },
      'test-secret',
      { expiresIn: '1h' }
    );

    mockTokenStore.gcpRepository.getGcpToken =
      Sinon.stub().resolves(validToken);

    const token = await getOauthToken(
      mockReq,
      mockTokenStore,
      mockTokenStoreClient,
      mockHttp,
      'channel-id'
    );

    expect(token).to.equal(validToken);
    Sinon.assert.notCalled(mockTokenStore.gcpRepository.updateGcpToken);
    Sinon.assert.notCalled(mockHttp.post);
  });

  it('should refresh and save token successfully when no token pulled from secrets manager', async () => {
    mockTokenStore.gcpRepository.getGcpToken = Sinon.stub().resolves(null);

    const validToken = jwt.sign(
      { sub: 'mock-user', scope: 'read write' },
      'test-secret',
      { expiresIn: '1h' }
    );

    mockHttp.post.resolves({ access_token: validToken });

    const token = await getOauthToken(
      mockReq,
      mockTokenStore,
      mockTokenStoreClient,
      mockHttp,
      'channel-id'
    );

    expect(token).to.equal(validToken);
    Sinon.assert.calledOnce(mockTokenStore.gcpRepository.updateGcpToken);
    Sinon.assert.calledOnce(mockHttp.post);
  });

  it('should refresh and save token successfully when token pulled from secrets manager is already expired', async () => {
    const expiredToken = jwt.sign(
      { sub: 'mock-user', scope: 'read write' },
      'test-secret',
      { expiresIn: -10 }
    );

    mockTokenStore.gcpRepository.getGcpToken =
      Sinon.stub().resolves(expiredToken);

    const validToken = jwt.sign(
      { sub: 'mock-user', scope: 'read write' },
      'test-secret',
      { expiresIn: '1h' }
    );

    mockHttp.post.resolves({ access_token: validToken });

    const token = await getOauthToken(
      mockReq,
      mockTokenStore,
      mockTokenStoreClient,
      mockHttp,
      'channel-id'
    );

    expect(token).to.equal(validToken);
    Sinon.assert.calledOnce(mockTokenStore.gcpRepository.updateGcpToken);
    Sinon.assert.calledOnce(mockHttp.post);
  });

  it('should refresh and save token successfully when token pulled from secrets manager has no `exp`', async () => {
    const tokenNoExp = jwt.sign(
      { sub: 'mock-user', scope: 'read write' },
      'test-secret'
    );

    mockTokenStore.gcpRepository.getGcpToken =
      Sinon.stub().resolves(tokenNoExp);

    const validToken = jwt.sign(
      { sub: 'mock-user', scope: 'read write' },
      'test-secret',
      { expiresIn: '1h' }
    );

    mockHttp.post.resolves({ access_token: validToken });

    const token = await getOauthToken(
      mockReq,
      mockTokenStore,
      mockTokenStoreClient,
      mockHttp,
      'channel-id'
    );

    expect(token).to.equal(validToken);
    Sinon.assert.calledOnce(mockTokenStore.gcpRepository.updateGcpToken);
    Sinon.assert.calledOnce(mockHttp.post);
  });

  it('should error.type=OperationFailed when there is an error encountered', async () => {
    const getOauthTokenError = new Error('getOauthTokenError');
    mockTokenStore.gcpRepository.getGcpToken =
      Sinon.stub().rejects(getOauthTokenError);

    let token;

    try {
      token = await getOauthToken(
        mockReq,
        mockTokenStore,
        mockTokenStoreClient,
        mockHttp,
        'channel-id'
      );
    } catch (error) {
      expect(error.type).to.equal('OperationFailed');
      expect(token).to.equal(undefined);
    }
  });
});

describe('Repository :: GCP :: OrderManagementRepository :: paymentStatusCallback', () => {
  it('should process payment status callback successfully when statusCode=204', async () => {
    const validToken = jwt.sign(
      { sub: 'mock-user', scope: 'read write' },
      'test-secret',
      { expiresIn: '1h' }
    );

    mockTokenStore.gcpRepository.getGcpToken =
      Sinon.stub().resolves(validToken);

    mockHttp.postWithRetry.resolves({ statusCode: 204 });

    const response = await paymentStatusCallback({
      req: mockReq,
      http: mockHttp,
      tokenStore: mockTokenStore,
      tokenStoreClient: mockTokenStoreClient,
      tokenPaymentId: 'id',
      channelId: 'channel-id',
      payload: {},
    });

    expect(response.status).to.equal(true);
    Sinon.assert.calledOnce(mockTokenStore.gcpRepository.getGcpToken);
    Sinon.assert.calledOnce(mockHttp.postWithRetry);
  });

  it('should return undefined when statusCode is not 204', async () => {
    const validToken = jwt.sign(
      { sub: 'mock-user', scope: 'read write' },
      'test-secret',
      { expiresIn: '1h' }
    );

    mockTokenStore.gcpRepository.getGcpToken =
      Sinon.stub().resolves(validToken);

    mockHttp.postWithRetry.resolves({ statusCode: 200, status: 'ok' });

    const response = await paymentStatusCallback({
      req: mockReq,
      http: mockHttp,
      tokenStore: mockTokenStore,
      tokenStoreClient: mockTokenStoreClient,
      tokenPaymentId: 'id',
      channelId: 'channel-id',
      payload: {},
    });

    expect(response).to.equal(undefined);
    Sinon.assert.calledOnce(mockTokenStore.gcpRepository.getGcpToken);
    Sinon.assert.calledOnce(mockHttp.postWithRetry);
  });

  it('should error.type=OperationFailed when there is an error encountered', async () => {
    const paymentStatusCallbackError = new Error('paymentStatusCallbackError');
    mockTokenStore.gcpRepository.getGcpToken = Sinon.stub().rejects(
      paymentStatusCallbackError
    );
    let token;

    try {
      token = await paymentStatusCallback({
        req: mockReq,
        http: mockHttp,
        tokenStore: mockTokenStore,
        tokenStoreClient: mockTokenStoreClient,
        tokenPaymentId: 'id',
        channelId: 'channel-id',
        payload: {},
      });
    } catch (error) {
      expect(error.type).to.equal('OperationFailed');
      expect(token).to.equal(undefined);
    }
  });

  it('should error.data when there is an error encountered', async () => {
    const validToken = jwt.sign(
      { sub: 'mock-user', scope: 'read write' },
      'test-secret',
      { expiresIn: '1h' }
    );
    mockTokenStore.gcpRepository.getGcpToken =
      Sinon.stub().resolves(validToken);
    mockHttp.postWithRetry.rejects({ data: 'test' });

    let response;

    try {
      response = await paymentStatusCallback({
        req: mockReq,
        http: mockHttp,
        tokenStore: mockTokenStore,
        tokenStoreClient: mockTokenStoreClient,
        tokenPaymentId: 'id',
        channelId: 'channel-id',
        payload: {},
      });
    } catch (error) {
      expect(error).to.equal('test');
      expect(response).to.equal(undefined);
    }
  });

  it('should error.type=InvalidAccessToken when there is an error encountered with InvalidAccessToken code', async () => {
    const validToken = jwt.sign(
      { sub: 'mock-user', scope: 'read write' },
      'test-secret',
      { expiresIn: '1h' }
    );
    mockTokenStore.gcpRepository.getGcpToken =
      Sinon.stub().resolves(validToken);
    mockHttp.postWithRetry.rejects({
      error: { code: constants.GCP_ERROR_CODES.INVALID_ACCESS_TOKEN },
    });

    let response;

    try {
      response = await paymentStatusCallback({
        req: mockReq,
        http: mockHttp,
        tokenStore: mockTokenStore,
        tokenStoreClient: mockTokenStoreClient,
        tokenPaymentId: 'id',
        channelId: 'channel-id',
        payload: {},
      });
    } catch (error) {
      expect(error.type).to.equal('InvalidAccessToken');
      expect(response).to.equal(undefined);
    }
  });
});
