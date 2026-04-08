import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import sinon from 'sinon';
import { BuyLoadTransactionModel } from '../../../src/models/mongo/BuyLoadTransactionsModel.js';
import {
  findByMobileDate,
  findByMobileDateChannel,
} from '../../../src/repositories/mongo/buyLoadTransactionsRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Repository :: Mongo :: BuyLoadTransaction Repository :: findByMobileDateChannel', () => {
  let findStub, sortStub, leanStub, execStub;

  beforeEach(() => {
    execStub = sinon.stub().resolves([{ id: 1 }, { id: 2 }]);
    leanStub = sinon.stub().returns({ exec: execStub });
    sortStub = sinon.stub().returns({ lean: leanStub });
    findStub = sinon.stub(BuyLoadTransactionModel, 'find').returns({
      sort: sortStub,
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return transactions when found', async () => {
    const params = {
      channelCode: 'APP',
      mobileNumber: '09171234567',
      fromDate: new Date('2024-01-01T00:00:00Z'),
      toDate: new Date('2024-01-02T00:00:00Z'),
    };

    const result = await findByMobileDateChannel(params);

    expect(result).to.be.an.array();
    expect(result).to.have.length(2);
    expect(findStub.calledOnce).to.be.true();
    expect(sortStub.calledWith({ createDate: 1 })).to.be.true();
  });

  it('should throw InternalOperationFailed when query fails', async () => {
    findStub.throws(new Error('DB read error'));

    try {
      await findByMobileDateChannel({
        channelCode: 'APP',
        mobileNumber: '09171234567',
        fromDate: new Date(),
        toDate: new Date(),
      });
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err.type).to.equal('InternalOperationFailed');
      expect(err.details).to.equal('DB read error');
    }
  });
});

describe('Repository :: Mongo :: BuyLoadTransaction Repository :: findByMobileDate', () => {
  let findStub, sortStub, leanStub, execStub;

  beforeEach(() => {
    execStub = sinon.stub().resolves([{ id: 1 }, { id: 2 }]);
    leanStub = sinon.stub().returns({ exec: execStub });
    sortStub = sinon.stub().returns({ lean: leanStub });
    findStub = sinon.stub(BuyLoadTransactionModel, 'find').returns({
      sort: sortStub,
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return transactions successfully when records are found', async () => {
    const params = {
      mobileNumber: '09171234567',
      fromDate: new Date('2024-01-01T00:00:00Z'),
      toDate: new Date('2024-01-02T00:00:00Z'),
    };

    const result = await findByMobileDate(params);

    expect(findStub.calledOnce).to.be.true();
    expect(sortStub.calledWith({ createDate: 1 })).to.be.true();
    expect(result).to.be.an.array();
    expect(result).to.have.length(2);

    const queryArg = findStub.firstCall.args[0];
    expect(queryArg).to.include(['mobileNumber', 'createDate']);
    expect(queryArg.createDate.$gte).to.be.instanceOf(Date);
    expect(queryArg.createDate.$lt).to.be.instanceOf(Date);
  });

  it('should throw InternalOperationFailed when find operation fails', async () => {
    findStub.throws(new Error('DB failure'));

    const params = {
      mobileNumber: '09179999999',
      fromDate: new Date(),
      toDate: new Date(),
    };

    try {
      await findByMobileDate(params);
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err.type).to.equal('InternalOperationFailed');
      expect(err.details).to.equal('DB failure');
    }
  });
});
