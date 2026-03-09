import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import sinon from 'sinon';
import { CustomerPaymentECPayModel } from '../../../src/models/mongo/index.js';
import { findByPartnerRef } from '../../../src/repositories/mongo/ecpayTransactionRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Repository :: Mongo :: CustomerPaymentECPay Repository :: findByPartnerRef', () => {
  let findOneStub;

  beforeEach(() => {
    findOneStub = sinon.stub(CustomerPaymentECPayModel, 'findOne');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return record when partner reference exists', async () => {
    const refId = 'REF123';
    const mockData = { partnerReferenceNumber: refId, amount: 500 };

    findOneStub.resolves(mockData);

    const result = await findByPartnerRef(refId);

    expect(result).to.equal(mockData);
    expect(findOneStub.calledOnce).to.be.true();
    expect(findOneStub.firstCall.args[0]).to.equal({
      partnerReferenceNumber: refId,
    });
  });

  it('should throw InternalOperationFailed when DB query fails', async () => {
    const refId = 'ERR001';
    findOneStub.rejects(new Error('DB query failed'));

    try {
      await findByPartnerRef(refId);
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err.type).to.equal('InternalOperationFailed');
      expect(err.details).to.equal('DB query failed');
    }
  });
});
