import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import sinon from 'sinon';
import { BindingPaymentMethodsModel } from '../../../src/models/mongo/index.js';
import { findByBindAndUUID } from '../../../src/repositories/mongo/bindingPaymentsRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Repository :: Mongo :: BindingPaymentMethods Repository :: findByBindAndUUID', () => {
  let findOneStub;

  beforeEach(() => {
    findOneStub = sinon.stub(BindingPaymentMethodsModel, 'findOne');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return record when found', async () => {
    const bindingRequestId = 'bind-123';
    const uuid = 'uuid-456';
    const mockRecord = { bindingRequestId, uuid, method: 'gcash' };

    findOneStub.resolves(mockRecord);

    const result = await findByBindAndUUID(bindingRequestId, uuid);

    expect(result).to.equal(mockRecord);
    expect(findOneStub.calledOnce).to.be.true();
    expect(findOneStub.firstCall.args[0]).to.equal({ bindingRequestId, uuid });
  });

  it('should throw InternalOperationFailed when database call fails', async () => {
    const bindingRequestId = 'bind-err';
    const uuid = 'uuid-err';
    findOneStub.rejects(new Error('DB read failed'));

    try {
      await findByBindAndUUID(bindingRequestId, uuid);
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err.type).to.equal('InternalOperationFailed');
      expect(err.details).to.equal('DB read failed');
    }
  });
});
