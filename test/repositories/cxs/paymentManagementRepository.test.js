import logger from '@globetel/cxs-core/core/logger/logger.js';
import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { config } from '../../../convict/config.js';
import { paymentManagementRepository } from '../../../src/repositories/cxs/index.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;
export { lab };

describe('Repository :: paymentManagementRepository :: paymentStatusCallbackAsync', () => {
  let req;
  let httpStub;
  let infoSpy;
  let debugSpy;
  let errorSpy;

  beforeEach(() => {
    httpStub = { post: Sinon.stub() };
    req = { http: httpStub };

    infoSpy = Sinon.spy(logger, 'info');
    debugSpy = Sinon.spy(logger, 'debug');
    errorSpy = Sinon.spy(logger, 'error');
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should call http.post and log request and response', async () => {
    const mockResponse = { success: true };
    httpStub.post.resolves(mockResponse);

    const payload = { paymentId: 'PAY123' };

    await paymentManagementRepository.paymentStatusCallbackAsync(req, payload);

    expect(httpStub.post.calledOnce).to.be.true();

    const [url, calledPayload, options, arg4, arg5, arg6] =
      httpStub.post.args[0];

    expect(url).to.be.a.string();
    expect(calledPayload).to.equal(payload);
    expect(options).to.equal({});
    expect(arg4).to.be.false();
    expect(arg5).to.be.false();
    expect(arg6).to.be.true();

    expect(
      infoSpy.calledWith('CXS_PAYMENT_STATUS_CALLBACK_ASYNC_REQUEST', payload)
    ).to.be.true();

    expect(
      debugSpy.calledWith(
        'CXS_PAYMENT_STATUS_CALLBACK_ASYNC_RESPONSE',
        mockResponse
      )
    ).to.be.true();
  });

  it('should log error when http.post fails and not throw', async () => {
    const error = new Error('Network error');
    httpStub.post.rejects(error);

    const payload = { paymentId: 'PAY123' };

    await paymentManagementRepository.paymentStatusCallbackAsync(req, payload);

    expect(
      errorSpy.calledWith('CXS_PAYMENT_STATUS_CALLBACK_ASYNC_FAILED', error)
    ).to.be.true();
  });
});

describe('Repository :: paymentManagementRepository :: processCSPaymentAsync', () => {
  let req;
  let httpStub;
  let infoSpy;
  let debugSpy;
  let errorSpy;

  beforeEach(() => {
    httpStub = { post: Sinon.stub() };
    req = { http: httpStub };

    infoSpy = Sinon.spy(logger, 'info');
    debugSpy = Sinon.spy(logger, 'debug');
    errorSpy = Sinon.spy(logger, 'error');
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should call http.post and log request and response', async () => {
    const mockResponse = { success: true };
    httpStub.post.resolves(mockResponse);

    const payload = { paymentId: 'PAY456' };

    await paymentManagementRepository.processCSPaymentAsync(req, payload);

    expect(httpStub.post.calledOnce).to.be.true();

    const [url, calledPayload, options, arg4, arg5, arg6] =
      httpStub.post.args[0];

    expect(url).to.be.a.string();
    expect(calledPayload).to.equal(payload);
    expect(options).to.equal({});
    expect(arg4).to.be.false();
    expect(arg5).to.be.false();
    expect(arg6).to.be.true();

    expect(
      infoSpy.calledWith('CXS_PROCESS_CS_PAYMENT_ASYNC_REQUEST', payload)
    ).to.be.true();

    expect(
      debugSpy.calledWith('CXS_PROCESS_CS_PAYMENT_ASYNC_RESPONSE', mockResponse)
    ).to.be.true();
  });

  it('should log error when http.post fails and not throw', async () => {
    const error = new Error('Network error');
    httpStub.post.rejects(error);

    const payload = { paymentId: 'PAY456' };

    await paymentManagementRepository.processCSPaymentAsync(req, payload);

    expect(
      errorSpy.calledWith('CXS_PROCESS_CS_PAYMENT_ASYNC_FAILED', error)
    ).to.be.true();
  });
});

describe('Repository :: paymentManagementRepository :: buyLoadAsync', () => {
  let req;
  let httpStub;
  let infoSpy;
  let debugSpy;
  let errorSpy;

  beforeEach(() => {
    httpStub = { post: Sinon.stub() };
    req = { http: httpStub };

    infoSpy = Sinon.spy(logger, 'info');
    debugSpy = Sinon.spy(logger, 'debug');
    errorSpy = Sinon.spy(logger, 'error');
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should call http.post with encoded mobile number and log request and response', async () => {
    const mockResponse = { success: true };
    httpStub.post.resolves(mockResponse);

    const payload = {
      mobileNumber: '09177432170',
      amount: 40,
    };

    await paymentManagementRepository.buyLoadAsync(req, payload);

    expect(httpStub.post.calledOnce).to.be.true();

    const [url, calledPayload, options, arg4, arg5, arg6] =
      httpStub.post.args[0];

    expect(url).to.be.a.string();
    expect(url).to.contain(encodeURIComponent(payload.mobileNumber));
    expect(calledPayload).to.equal(payload);
    expect(options).to.equal({});
    expect(arg4).to.be.false();
    expect(arg5).to.be.false();
    expect(arg6).to.be.true();

    expect(
      infoSpy.calledWith('CXS_BUY_LOAD_ASYNC_REQUEST', payload)
    ).to.be.true();

    expect(
      debugSpy.calledWith('CXS_BUY_LOAD_ASYNC_RESPONSE', mockResponse)
    ).to.be.true();
  });

  it('should log error when http.post fails and not throw', async () => {
    const error = new Error('Network error');
    httpStub.post.rejects(error);

    const payload = {
      mobileNumber: '09177432170',
    };

    await paymentManagementRepository.buyLoadAsync(req, payload);

    expect(
      errorSpy.calledWith('CXS_BUY_LOAD_ASYNC_FAILED', error)
    ).to.be.true();
  });
});

describe('Repository :: paymentManagementRepository :: executeRefund', () => {
  let req;
  let httpStub;
  let debugSpy;
  let infoSpy;

  beforeEach(() => {
    httpStub = { post: Sinon.stub() };
    req = {
      payload: { tokenPaymentId: '' },
      http: httpStub,
    };

    debugSpy = Sinon.spy(logger, 'debug');
    infoSpy = Sinon.spy(logger, 'info');
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should POST with correct url, body, and options then return response', async () => {
    const paymentId = 'abc123';
    req.payload.tokenPaymentId = paymentId;

    const refundCfg = config.get('cxs.paymentManagement');
    const encodedPaymentId = encodeURIComponent(paymentId);
    const expectedUrl = `${refundCfg.httpProtocol}://${refundCfg.host}/${refundCfg.endpoints.paymentRefund.replace(
      '{tokenPaymentId}',
      encodedPaymentId
    )}`;

    const refundRequest = { amount: 123.45, reason: 'Duplicate' };

    const authToken = 'Bearer some-auth-token';
    const expectedOptions = {
      headers: {
        authorization: authToken,
      },
    };

    const mockResponse = { status: 200, data: { statusCode: '0' } };
    const postStub = httpStub.post.resolves(mockResponse);

    const res = await paymentManagementRepository.executeRefund(
      req,
      refundRequest,
      authToken
    );

    expect(postStub.calledOnce).to.be.true();
    expect(postStub.firstCall.args[0]).to.equal(expectedUrl);
    expect(postStub.firstCall.args[1]).to.equal(refundRequest);
    expect(postStub.firstCall.args[2]).to.equal(expectedOptions);
    expect(postStub.firstCall.args[3]).to.equal(false);
    expect(postStub.firstCall.args[4]).to.equal(false);
    expect(res).to.equal(mockResponse);
    expect(
      infoSpy.calledWith('CXS_PAYMENT_EXECUTE_REFUND_RESPONSE', mockResponse)
    ).to.be.true();
  });

  it('should rethrow error when http.post fails', async () => {
    req.payload.tokenPaymentId = 'pay-err';
    const refundRequest = { amount: 10, reason: 'Test' };
    const authToken = 'Bearer some-auth-token';

    const err = new Error('network down');
    httpStub.post.rejects(err);

    await expect(
      paymentManagementRepository.executeRefund(req, refundRequest, authToken)
    ).to.reject(Error, 'network down');

    expect(
      debugSpy.calledWith('CXS_PAYMENT_EXECUTE_REFUND_ERROR', err)
    ).to.be.true();
  });
});
