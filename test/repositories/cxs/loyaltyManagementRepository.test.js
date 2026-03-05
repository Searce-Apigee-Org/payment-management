import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { loyaltyManagementRepository } from '../../../src/repositories/cxs/index.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;
export { lab };

describe('Repository :: loyaltyManagementRepository :: loyaltyPointsSimulator', () => {
  let httpStub;

  beforeEach(() => {
    httpStub = { post: Sinon.stub() };
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should throw OperationFailed when http.post fails', async () => {
    const error = new Error('Network failure');
    httpStub.post.rejects(error);

    try {
      await loyaltyManagementRepository.loyaltyPointsSimulator(httpStub, {
        questId: 'Q123',
      });
      throw new Error('Expected addQuest to throw');
    } catch (err) {
      expect(err).to.equal({ type: 'OperationFailed' });
    }
  });

  it('should call http.post with correct url, params, and headers', async () => {
    const mockResponse = { success: true };
    httpStub.post.resolves(mockResponse);

    const params = { questId: 'Q123', userId: 'U456' };
    const result = await loyaltyManagementRepository.loyaltyPointsSimulator(
      httpStub,
      params
    );

    expect(result).to.equal(mockResponse);
    expect(httpStub.post.calledOnce).to.be.true();

    const [_, calledParams, calledOptions, arg4, arg5] = httpStub.post.args[0];

    expect(calledParams).to.equal(params);
    expect(calledOptions).to.equal({
      headers: { 'Content-Type': 'application/json' },
    });
    expect(arg4).to.be.false();
    expect(arg5).to.be.false();
  });
});
