import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { dsa } from '../../../src/repositories/index.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;
export { lab };

describe('Repository :: DSA :: attributes Repository :: getAttributesDetails', () => {
  let payload, http;

  beforeEach(() => {
    http = { postWithRetry: Sinon.stub() };
    payload = { key: 'testId' };
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should throw an error when http postWithRetry fails', async () => {
    http.postWithRetry.rejects({ type: 'OperationFailed' });
    try {
      await dsa.attributesRepository.getAttributesDetails(payload, http);
    } catch (err) {
      expect(err.type).to.equal('OperationFailed');
    }
  });

  it('should return a success response when order is created successfully', async () => {
    http.postWithRetry.resolves({
      request_id: 'testRequestId',
      execution_id: 'testExecutionId',
      code: 0,
      module: 'ORDEROE',
      order_id: 'testOrderId',
      server_time: 1681702530,
    });

    const response = await dsa.attributesRepository.getAttributesDetails(
      payload,
      http
    );

    expect(http.postWithRetry.calledOnce).to.be.true();
    expect(response).to.be.an.object();
    expect(response.request_id).to.exist();
    expect(response.execution_id).to.exist();
    expect(response.code).to.equal(0);
    expect(response.order_id).to.exist();
    expect(response.module).to.exist();
    expect(response.server_time).to.exist();
  });
});
