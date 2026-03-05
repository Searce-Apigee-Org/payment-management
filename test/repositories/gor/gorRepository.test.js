import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { config } from '../../../convict/config.js';
import {
  getAccessToken,
  updatePaymentTokenId,
} from '../../../src/repositories/gor/gorRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;
export { lab };

let req;

const {
  httpProtocol: protocol,
  webServiceHost: host,
  requestTimeout,
  endpoints: {
    accessToken: accessTokenEndpoint,
    paymentTokenId: paymentTokenIdEndpoint,
  },
} = config.get('gor');

beforeEach(() => {
  req = {
    http: {
      post: Sinon.stub(),
    },
    payload: {
      paymentStatus: 'SUCCESS',
      transactionId: 'txn_123',
      paymentChannel: 'GCASH',
    },
  };
});

afterEach(() => {
  Sinon.restore();
});

describe('Repository :: GOR :: gorRepository :: getAccessToken', () => {
  const credentials = { authorization: 'Basic dGVzdDp0ZXN0' };
  const mockResponse = {
    access_token: 'gor-token',
    token_type: 'bearer',
    expires_in: 3600,
  };

  it('should return response when request succeeds', async () => {
    const stub = req.http.post.resolves(mockResponse);

    const response = await getAccessToken(req, credentials);

    expect(stub.calledOnce).to.be.true();

    const expectedUrl = `${protocol}://${host}/${accessTokenEndpoint}`;
    const expectedOptions = {
      headers: {
        Authorization: credentials.authorization,
        'Content-Type': 'application/json',
      },
      timeout: requestTimeout,
    };

    const [urlArg, payloadArg, optionsArg, flag1, flag2] =
      req.http.post.getCall(0).args;

    expect(urlArg).to.equal(expectedUrl);
    expect(payloadArg).to.equal({});
    expect(optionsArg).to.equal(expectedOptions);
    expect(flag1).to.be.true();
    expect(flag2).to.be.false();

    expect(response).to.equal(mockResponse);
  });

  it('should log and rethrow when request fails', async () => {
    const loggerStub = Sinon.stub(logger, 'debug');
    req.http.post.rejects(new Error('Network failure'));

    try {
      await getAccessToken(req, credentials);
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).to.be.an.object();
      expect(err.message).to.equal('Network failure');

      expect(loggerStub.calledOnce).to.be.true();
      const [tag, errorArg] = loggerStub.getCall(0).args;
      expect(tag).to.equal('GOR_GET_ACCESS_TOKEN_ERROR');
      expect(errorArg).to.be.an.object();
      expect(errorArg.message).to.equal('Network failure');
    }
  });
});

describe('Repository :: GOR :: gorRepository :: updatePaymentTokenId', () => {
  const formatTokenPaymentId = 'tok_123';
  const accessToken = 'Bearer gor-access-token';

  it('should return response when request succeeds', async () => {
    const mockResponse = { statusCode: 204 };
    const stub = req.http.post.resolves(mockResponse);

    const response = await updatePaymentTokenId(
      req,
      formatTokenPaymentId,
      accessToken
    );

    expect(stub.calledOnce).to.be.true();

    const expectedUrl = `${protocol}://${host}/${paymentTokenIdEndpoint}`;
    const expectedOptions = {
      headers: {
        Authorization: accessToken,
        ReferenceId: req.payload.transactionId,
        'Content-Type': 'application/json',
      },
      timeout: requestTimeout,
    };
    const expectedPayload = {
      paymentTokenId: formatTokenPaymentId,
      paymentStatus: req.payload.paymentStatus,
      paymentChannel: req.payload.paymentChannel,
    };

    const [urlArg, payloadArg, optionsArg, flag1, flag2] =
      req.http.post.getCall(0).args;
    expect(urlArg).to.equal(expectedUrl);
    expect(payloadArg).to.equal(expectedPayload);
    expect(optionsArg).to.equal(expectedOptions);
    expect(flag1).to.be.true();
    expect(flag2).to.be.false();

    expect(response).to.equal(mockResponse);
  });

  it('should log and return error object when request fails', async () => {
    const loggerStub = Sinon.stub(logger, 'debug');
    req.http.post.rejects(new Error('Timeout'));

    const result = await updatePaymentTokenId(
      req,
      formatTokenPaymentId,
      accessToken
    );

    expect(result).to.be.an.object();
    expect(result.message).to.equal('Timeout');

    expect(loggerStub.calledOnce).to.be.true();
    const [tag, errorArg] = loggerStub.getCall(0).args;
    expect(tag).to.equal('GOR_UPDATE_PAYMENT_TOKEN_ID_ERROR');
    expect(errorArg).to.be.an.object();
    expect(errorArg.message).to.equal('Timeout');
  });
});
