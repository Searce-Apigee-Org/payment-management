import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { updatePayment } from '../../../src/repositories/dno/paymentsRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Repository :: DNO Repository :: updatePayment', () => {
  let http;
  let req;

  beforeEach(() => {
    http = { post: Sinon.stub() };
    req = { http };

    // paymentsRepository.js uses a `logger` symbol without importing it.
    // Expose a stubbed logger on the global object so the catch block
    // can call logger.debug without causing a ReferenceError.
    global.logger = { debug: Sinon.stub() };
  });

  afterEach(() => {
    Sinon.restore();
    delete global.logger;
  });

  it('should return response from http.post', async () => {
    const mockResponse = { status: 'SUCCESS' };
    http.post.resolves(mockResponse);

    const payload = { paymentId: 'PAY-123', amount: 1000 };

    const result = await updatePayment(payload, req);

    expect(result).to.equal(mockResponse);
    expect(http.post.calledOnce).to.be.true();
  });

  it('should log and throw OutboundOperationFailed when http.post rejects', async () => {
    const mockError = new Error('network error');
    http.post.rejects(mockError);

    const payload = { paymentId: 'PAY-456', amount: 500 };

    try {
      await updatePayment(payload, req);
      throw new Error('Expected to throw');
    } catch (err) {
      // Verify logging behaviour
      expect(global.logger.debug.calledOnce).to.be.true();
      expect(global.logger.debug.firstCall.args[0]).to.equal(
        'LF_DNO_UPDATE_PAYMENT_ERROR'
      );
      expect(global.logger.debug.firstCall.args[1]).to.shallow.equal(mockError);

      // Verify error shape
      expect(err).to.be.an.object();
      expect(err.type).to.equal('OutboundOperationFailed');
    }
  });
});
