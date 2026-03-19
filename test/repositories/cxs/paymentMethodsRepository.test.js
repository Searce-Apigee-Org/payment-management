import logger from '@globetel/cxs-core/core/logger/logger.js';
import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { config } from '../../../convict/config.js';
import { paymentMethodsRepository } from '../../../src/repositories/cxs/index.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;
export { lab };

describe('Repository :: paymentMethodsRepository :: processBuyVoucherAsync', () => {
  let req;
  let httpStub;
  let infoSpy;
  let debugSpy;
  let errorSpy;

  beforeEach(() => {
    httpStub = {
      post: Sinon.stub(),
    };

    req = {
      http: httpStub,
    };

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
      voucherCode: 'VOUCHER123',
      amount: 100,
    };

    const {
      host,
      httpProtocol,
      endpoints: { createPromoVouchers: endpoint },
    } = config.get('cxs.paymentMethods');

    const expectedUrl = `${httpProtocol}://${host}/${endpoint}`;

    await paymentMethodsRepository.processBuyVoucherAsync(req, payload);

    expect(httpStub.post.calledOnce).to.be.true();

    const [url, calledPayload, options, arg4, arg5, arg6] =
      httpStub.post.args[0];

    expect(url).to.equal(expectedUrl);
    expect(calledPayload).to.equal(payload);
    expect(options).to.equal({});
    expect(arg4).to.be.false();
    expect(arg5).to.be.false();
    expect(arg6).to.be.true();

    expect(
      infoSpy.calledWith('CXS_BUY_VOUCHER_ASYNC_REQUEST', payload)
    ).to.be.true();

    expect(
      debugSpy.calledWith(
        'CXS_BUY_VOUCHER_PAYMENT_ASYNC_RESPONSE',
        mockResponse
      )
    ).to.be.true();
  });

  it('should log error when http.post fails and not throw', async () => {
    const error = new Error('Network error');
    httpStub.post.rejects(error);

    const payload = {
      voucherCode: 'VOUCHER123',
    };

    await paymentMethodsRepository.processBuyVoucherAsync(req, payload);

    expect(
      errorSpy.calledWith('CXS_BUY_VOUCHER_PAYMENT_ASYNC_FAILED', error)
    ).to.be.true();
  });
});
