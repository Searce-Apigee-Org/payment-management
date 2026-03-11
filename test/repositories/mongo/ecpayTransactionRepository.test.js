import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import sinon from 'sinon';
import { CustomerPaymentECPayModel } from '../../../src/models/mongo/index.js';
import {
  create,
  findByPartnerRef,
} from '../../../src/repositories/mongo/ecpayTransactionRepository.js';

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

describe('Repository :: Mongo :: CustomerPaymentECPay Repository :: create', () => {
  let createStub;

  beforeEach(() => {
    createStub = sinon.stub(CustomerPaymentECPayModel, 'create');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should create and return record when create succeeds', async () => {
    const transactionDetails = {
      partnerReferenceNumber: 'REF456',
      amount: 1000,
      status: 'PENDING',
    };

    const mockData = { ...transactionDetails, _id: 'mongo-id-1' };

    createStub.resolves(mockData);

    const result = await create(transactionDetails);

    expect(result).to.equal(mockData);
    expect(createStub.calledOnce).to.be.true();
    expect(createStub.firstCall.args[0]).to.equal(transactionDetails);
  });

  it('should throw InternalOperationFailed when create fails', async () => {
    const transactionDetails = {
      partnerReferenceNumber: 'ERR_CREATE',
      amount: 500,
      status: 'PENDING',
    };

    createStub.rejects(new Error('Create failed'));

    try {
      await create(transactionDetails);
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err.type).to.equal('InternalOperationFailed');
      expect(err.details).to.equal('Create failed');
    }
  });
});
