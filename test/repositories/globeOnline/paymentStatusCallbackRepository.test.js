import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

import { paymentStatusCallbackServiceRequest } from '../../../src/repositories/globeOnline/paymentStatusCallbackRepository.js';

export { lab };

describe('Repository :: Globe Online :: PaymentStatusCallbackRepository :: paymentStatusCallbackServiceRequest', () => {
  let mockHttp;

  beforeEach(() => {
    mockHttp = {
      postWithRetry: Sinon.stub(),
    };
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should send payment status callback request to globeOnline successfully', async () => {
    mockHttp.postWithRetry.resolves({ status: true });
    let errorChecker;
    let response;

    try {
      response = await paymentStatusCallbackServiceRequest({
        http: mockHttp,
        callbackData: {},
      });

      Sinon.assert.calledOnce(mockHttp.postWithRetry);
    } catch (error) {
      errorChecker = error;
    }

    expect(response).to.equal({ status: true });
    expect(errorChecker).to.equal(undefined);
  });

  it('should throw error.type=OperationFailed when there is an error', async () => {
    mockHttp.postWithRetry.rejects(new Error());
    let errorChecker;
    let response;

    try {
      response = await paymentStatusCallbackServiceRequest({
        http: mockHttp,
        callbackData: {},
      });

      Sinon.assert.calledOnce(mockHttp.postWithRetry);
    } catch (error) {
      errorChecker = error;
    }

    expect(errorChecker.type).to.equal('OperationFailed');
    expect(response).to.equal(undefined);
  });

  it('should throw error.data when there is an error', async () => {
    mockHttp.postWithRetry.rejects({ data: 'error' });
    let errorChecker;
    let response;

    try {
      response = await paymentStatusCallbackServiceRequest({
        http: mockHttp,
        callbackData: {},
      });

      Sinon.assert.calledOnce(mockHttp.postWithRetry);
    } catch (error) {
      errorChecker = error;
    }

    expect(errorChecker).to.equal({ data: 'error' });
    expect(response).to.equal(undefined);
  });
});
