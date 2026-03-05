import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import sinon from 'sinon';
import { CustomerPaymentModel } from '../../../src/models/mongo/index.js';
import {
  create,
  findOne,
  put,
  update,
  updateOne,
} from '../../../src/repositories/mongo/customerPaymentsRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Repository :: Mongo :: CustomerPayment Repository :: put', () => {
  let findOneAndUpdateStub;

  beforeEach(() => {
    findOneAndUpdateStub = sinon.stub(CustomerPaymentModel, 'findOneAndUpdate');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should throw error if required field tokenPaymentId is missing', async () => {
    await expect(
      put({
        createDate: new Date(),
      })
    ).to.reject(Error, 'Missing required field: tokenPaymentId');

    expect(findOneAndUpdateStub.called).to.be.false();
  });

  it('should throw error if database update fails', async () => {
    findOneAndUpdateStub.rejects(new Error('DB update error'));

    await expect(
      put({
        tokenPaymentId: 'pay-002',
        settlementDetails: [],
      })
    ).to.reject(Error, 'DB update error');
  });

  it('should upsert a customer payment correctly and convert nested amounts', async () => {
    const keys = {
      tokenPaymentId: 'pay-001',
      createDate: '2024-05-02T06:33:49.836Z',
      lastUpdateDate: '2024-06-02T06:33:49.836Z',
      settlementDetails: [
        {
          amount: '100.50',
          provisionedAmount: '50.00',
          transactions: [
            {
              amount: '25.00',
              voucherDetails: {
                paidAmount: '10.00',
              },
            },
          ],
        },
      ],
    };

    const updatedDoc = {
      tokenPaymentId: 'pay-001',
      settlementDetails: [],
    };

    findOneAndUpdateStub.resolves(updatedDoc);

    const result = await put({ ...keys });

    expect(findOneAndUpdateStub.calledOnce).to.be.true();

    expect(findOneAndUpdateStub.firstCall.args[0]).to.equal({
      tokenPaymentId: 'pay-001',
    });

    const updateArg = findOneAndUpdateStub.firstCall.args[1].$set;

    expect(updateArg.createDate).to.be.instanceOf(Date);
    expect(updateArg.lastUpdateDate).to.be.instanceOf(Date);

    expect(updateArg.settlementDetails[0].amount.constructor.name).to.equal(
      'Decimal128'
    );
    expect(
      updateArg.settlementDetails[0].provisionedAmount.constructor.name
    ).to.equal('Decimal128');
    expect(
      updateArg.settlementDetails[0].transactions[0].amount.constructor.name
    ).to.equal('Decimal128');
    expect(
      updateArg.settlementDetails[0].transactions[0].voucherDetails.paidAmount
        .constructor.name
    ).to.equal('Decimal128');

    expect(result).to.equal(updatedDoc);
  });
});

describe('Repository :: Mongo :: CustomerPayment Repository :: findOne', () => {
  let findOneStub;

  beforeEach(() => {
    findOneStub = sinon.stub(CustomerPaymentModel, 'findOne');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should throw an error when db call fails', async () => {
    try {
      const err = new Error('DB error');
      findOneStub.rejects(err);
      await findOne('err-id');
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.message).to.equal('DB error');
    }
  });

  it('should return payment details when record exists', async () => {
    const mockData = { tokenPaymentId: '123', amount: 100 };
    findOneStub.resolves(mockData);

    const result = await findOne('123');

    expect(result).to.equal(mockData);
    expect(findOneStub.calledOnce).to.be.true();
    expect(findOneStub.args[0][0]).to.equal({ tokenPaymentId: '123' });
  });

  it('should return null when record does not exist', async () => {
    findOneStub.resolves(null);

    const result = await findOne('999');

    expect(result).to.be.null();
    expect(findOneStub.calledOnce).to.be.true();
  });
});

describe('Repository :: Mongo :: CustomerPayment Repository :: updateOne', () => {
  let replaceOneStub;

  beforeEach(() => {
    replaceOneStub = sinon.stub(CustomerPaymentModel, 'replaceOne');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should throw an error when db call fails', async () => {
    const err = new Error('DB error');
    replaceOneStub.rejects(err);

    try {
      await updateOne({ tokenPaymentId: 'err-id', amount: 100 });
      throw new Error('Expected failure but succeeded');
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.message).to.equal('DB error');
    }
  });

  it('should call replaceOne with correct parameters when paymentDetails provided', async () => {
    const paymentDetails = { tokenPaymentId: '123', amount: 100 };
    replaceOneStub.resolves();

    await updateOne(paymentDetails);

    expect(replaceOneStub.calledOnce).to.be.true();
    expect(replaceOneStub.args[0][0]).to.equal({ tokenPaymentId: '123' });
    expect(replaceOneStub.args[0][1]).to.equal(paymentDetails);
    expect(replaceOneStub.args[0][2]).to.equal({ upsert: true });
  });
});

describe('Repository :: Mongo :: CustomerPayment Repository :: create', () => {
  let createStub;

  beforeEach(() => {
    createStub = sinon.stub(CustomerPaymentModel, 'create');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return the created payment entity when successful', async () => {
    const mockPaymentEntity = { tokenPaymentId: 'pay-001', amount: 100 };
    const mockCreatedDoc = { ...mockPaymentEntity, _id: 'abc123' };

    createStub.resolves(mockCreatedDoc);

    const result = await create(mockPaymentEntity);

    expect(createStub.calledOnce).to.be.true();
    expect(createStub.firstCall.args[0]).to.equal(mockPaymentEntity);
    expect(result).to.equal(mockCreatedDoc);
  });

  it('should throw InternalOperationFailed when creation fails', async () => {
    createStub.rejects(new Error('DB create failed'));

    try {
      await create({ tokenPaymentId: 'pay-002' });
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err.type).to.equal('InternalOperationFailed');
      expect(err.details).to.equal('DB create failed');
    }
  });
});

describe('Repository :: Mongo :: CustomerPayment Repository :: update', () => {
  let updateOneStub;

  beforeEach(() => {
    updateOneStub = sinon.stub(CustomerPaymentModel, 'updateOne');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should call updateOne with provided filter and update when valid', async () => {
    updateOneStub.resolves();

    const keys = {
      filter: { tokenPaymentId: 'pay-005' },
      update: { $set: { a: 1 } },
    };

    await update(keys);

    expect(updateOneStub.calledOnce).to.be.true();
    const [filterArg, updateArg] = updateOneStub.getCall(0).args;
    expect(filterArg).to.equal(keys.filter);
    expect(updateArg).to.equal(keys.update);
  });

  it('should log and rethrow when updateOne fails', async () => {
    const debugStub = sinon.stub(logger, 'debug');
    const boom = new Error('DB update error');
    updateOneStub.rejects(boom);

    try {
      await update({
        filter: { tokenPaymentId: 'pay-006' },
        update: { $set: { a: 2 } },
      });
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err).to.be.instanceOf(Error);
      expect(err.message).to.equal('DB update error');

      expect(debugStub.calledOnce).to.be.true();
      const [tag, errorArg] = debugStub.getCall(0).args;
      expect(tag).to.equal('UPDATE_CUSTOMER_PAYMENT_ERROR');
      expect(errorArg).to.be.instanceOf(Error);
      expect(errorArg.message).to.equal('DB update error');
    }
  });
});
