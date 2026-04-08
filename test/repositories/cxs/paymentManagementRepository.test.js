import logger from '@globetel/cxs-core/core/logger/logger.js';
import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
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

    const [url, calledPayload, options, arg4, arg5] = httpStub.post.args[0];

    expect(url).to.be.a.string();
    expect(calledPayload).to.equal(payload);
    expect(options).to.equal({});
    expect(arg4).to.be.false();
    expect(arg5).to.be.false();

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

    const [url, calledPayload] = httpStub.post.args[0];

    expect(url).to.be.a.string();
    expect(calledPayload).to.equal(payload);

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

    const [url, calledPayload, options, arg4, arg5] = httpStub.post.args[0];

    expect(url).to.be.a.string();
    expect(url).to.contain(encodeURIComponent(payload.mobileNumber));
    expect(calledPayload).to.equal(payload);
    expect(options).to.equal({});
    expect(arg4).to.be.false();
    expect(arg5).to.be.false();

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
