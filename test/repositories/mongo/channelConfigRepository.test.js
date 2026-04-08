import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import sinon from 'sinon';
import { BuyLoadChannelConfigModel } from '../../../src/models/mongo/index.js';
import { findOneById } from '../../../src/repositories/mongo/channelConfigRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Repository :: Mongo :: BuyLoadChannelConfig Repository :: findOneById', () => {
  let findOneStub;

  beforeEach(() => {
    findOneStub = sinon.stub(BuyLoadChannelConfigModel, 'findOne');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return channel config when record exists', async () => {
    const clientId = 'client-123';
    const mockRecord = { clientId, channelName: 'AppChannel' };

    findOneStub.resolves(mockRecord);

    const req = { mongoModels: {} };
    const result = await findOneById(clientId, req);

    expect(result).to.equal(mockRecord);
    expect(findOneStub.calledOnce).to.be.true();
    expect(findOneStub.firstCall.args[0]).to.equal({ clientId });
  });

  it('should throw InternalOperationFailed when DB query fails', async () => {
    const clientId = 'client-err';
    findOneStub.rejects(new Error('DB query failed'));

    try {
      await findOneById(clientId, { mongoModels: {} });
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err.type).to.equal('InternalOperationFailed');
    }
  });
});
