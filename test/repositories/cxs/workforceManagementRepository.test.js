import logger from '@globetel/cxs-core/core/logger/logger.js';
import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { workforceManagementRepository } from '../../../src/repositories/cxs/index.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;
export { lab };

describe('Repository :: workforceManagementRepository :: prepaidFiberRepairOrderAsync', () => {
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

    const payload = {
      repairOrderId: 'RO123',
      accountNumber: '09177432169',
    };

    await workforceManagementRepository.prepaidFiberRepairOrderAsync(
      req,
      payload
    );

    expect(httpStub.post.calledOnce).to.be.true();

    const [url, calledPayload, options, arg4, arg5] = httpStub.post.args[0];

    expect(url).to.be.a.string();
    expect(calledPayload).to.equal(payload);
    expect(options).to.equal({});
    expect(arg4).to.be.false();
    expect(arg5).to.be.false();

    expect(
      infoSpy.calledWith(
        'CXS_PREPAID_FIBER_REPAIR_ORDER_ASYNC_REQUEST',
        payload
      )
    ).to.be.true();

    expect(
      debugSpy.calledWith(
        'CXS_PREPAID_FIBER_REPAIR_ORDER_ASYNC_RESPONSE',
        mockResponse
      )
    ).to.be.true();
  });

  it('should log error when http.post fails and not throw', async () => {
    const error = new Error('Network error');
    httpStub.post.rejects(error);

    const payload = {
      repairOrderId: 'RO123',
    };

    await workforceManagementRepository.prepaidFiberRepairOrderAsync(
      req,
      payload
    );

    expect(
      errorSpy.calledWith('CXS_PREPAID_FIBER_REPAIR_ORDER_ASYNC_FAILED', error)
    ).to.be.true();
  });
});
