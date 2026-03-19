import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import sinon from 'sinon';
import { BuyLoadTransactionModel } from '../../../src/models/mongo/index.js';
import {
  findByMobileDate,
  findByMobileDateChannel,
  findByTransactionId,
  save,
} from '../../../src/repositories/mongo/buyLoadTransactionsRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Repository :: Mongo :: buyLoadTransactionsRepository', () => {
  beforeEach(() => {
    sinon.stub(logger, 'info');
    sinon.stub(logger, 'debug');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('findByMobileDateChannel', () => {
    let findStub;
    let sortStub;
    let leanStub;
    let execStub;

    beforeEach(() => {
      execStub = sinon.stub().resolves([{ id: 1 }, { id: 2 }]);
      leanStub = sinon.stub().returns({ exec: execStub });
      sortStub = sinon.stub().returns({ lean: leanStub });
      findStub = sinon.stub(BuyLoadTransactionModel, 'find').returns({
        sort: sortStub,
      });
    });

    it('should return transactions when records are found', async () => {
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

      expect(logger.info.calledOnce).to.be.true();
      expect(logger.info.firstCall.args[0]).to.equal(
        'BUYLOAD_TXN_MONGO_FIND_BY_MOBILE_DATE_CHANNEL'
      );
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

    it('should throw InternalOperationFailed with clear error when fromDate is invalid', async () => {
      try {
        await findByMobileDateChannel({
          channelCode: 'APP',
          mobileNumber: '09171234567',
          fromDate: undefined,
          toDate: new Date(),
        });
        throw new Error('Expected failure but succeeded');
      } catch (err) {
        expect(err.type).to.equal('InternalOperationFailed');
        expect(err.details).to.equal(
          'Invalid fromDate (expected Date/ISO string)'
        );
      }
    });

    it('should accept ISO string fromDate/toDate (coercion)', async () => {
      const params = {
        channelCode: 'APP',
        mobileNumber: '09171234567',
        fromDate: '2024-01-01T00:00:00Z',
        toDate: '2024-01-02T00:00:00Z',
      };

      const result = await findByMobileDateChannel(params);
      expect(result).to.be.an.array();
      expect(result).to.have.length(2);
    });

    it('should accept numeric timestamp fromDate/toDate (coercion)', async () => {
      const params = {
        channelCode: 'APP',
        mobileNumber: '09171234567',
        fromDate: Date.parse('2024-01-01T00:00:00Z'),
        toDate: Date.parse('2024-01-02T00:00:00Z'),
      };

      const result = await findByMobileDateChannel(params);
      expect(result).to.be.an.array();
      expect(result).to.have.length(2);
    });

    it('should accept moment-like object with toDate() (coercion)', async () => {
      const params = {
        channelCode: 'APP',
        mobileNumber: '09171234567',
        fromDate: { toDate: () => new Date('2024-01-01T00:00:00Z') },
        toDate: { toDate: () => new Date('2024-01-02T00:00:00Z') },
      };

      const result = await findByMobileDateChannel(params);
      expect(result).to.be.an.array();
      expect(result).to.have.length(2);
    });

    it('should throw InternalOperationFailed when fromDate is an unsupported object', async () => {
      try {
        await findByMobileDateChannel({
          channelCode: 'APP',
          mobileNumber: '09171234567',
          fromDate: { foo: 'bar' },
          toDate: new Date(),
        });
        throw new Error('Expected failure but succeeded');
      } catch (err) {
        expect(err.type).to.equal('InternalOperationFailed');
        expect(err.details).to.equal(
          'Invalid fromDate (expected Date/ISO string)'
        );
      }
    });

    it('should throw InternalOperationFailed when fromDate is an invalid Date object', async () => {
      try {
        await findByMobileDateChannel({
          channelCode: 'APP',
          mobileNumber: '09171234567',
          fromDate: new Date('invalid-date'),
          toDate: new Date(),
        });
        throw new Error('Expected failure but succeeded');
      } catch (err) {
        expect(err.type).to.equal('InternalOperationFailed');
        expect(err.details).to.equal(
          'Invalid fromDate (expected Date/ISO string)'
        );
      }
    });

    it('should throw InternalOperationFailed when fromDate is an invalid ISO string', async () => {
      try {
        await findByMobileDateChannel({
          channelCode: 'APP',
          mobileNumber: '09171234567',
          fromDate: 'not-a-date',
          toDate: new Date(),
        });
        throw new Error('Expected failure but succeeded');
      } catch (err) {
        expect(err.type).to.equal('InternalOperationFailed');
        expect(err.details).to.equal(
          'Invalid fromDate (expected Date/ISO string)'
        );
      }
    });

    it('should throw InternalOperationFailed when fromDate.toDate() returns invalid', async () => {
      try {
        await findByMobileDateChannel({
          channelCode: 'APP',
          mobileNumber: '09171234567',
          fromDate: { toDate: () => new Date('invalid-date') },
          toDate: new Date(),
        });
        throw new Error('Expected failure but succeeded');
      } catch (err) {
        expect(err.type).to.equal('InternalOperationFailed');
        expect(err.details).to.equal(
          'Invalid fromDate (expected Date/ISO string)'
        );
      }
    });
  });

  describe('findByMobileDate', () => {
    let findStub;
    let sortStub;
    let leanStub;
    let execStub;

    beforeEach(() => {
      execStub = sinon.stub().resolves([{ id: 1 }, { id: 2 }]);
      leanStub = sinon.stub().returns({ exec: execStub });
      sortStub = sinon.stub().returns({ lean: leanStub });
      findStub = sinon.stub(BuyLoadTransactionModel, 'find').returns({
        sort: sortStub,
      });
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
    });

    it('should throw InternalOperationFailed when find operation fails', async () => {
      findStub.throws(new Error('DB failure'));

      try {
        await findByMobileDate({
          mobileNumber: '09179999999',
          fromDate: new Date(),
          toDate: new Date(),
        });
        throw new Error('Expected failure but succeeded');
      } catch (err) {
        expect(err.type).to.equal('InternalOperationFailed');
        expect(err.details).to.equal('DB failure');
      }
    });

    it('should throw InternalOperationFailed with clear error when toDate is invalid', async () => {
      try {
        await findByMobileDate({
          mobileNumber: '09179999999',
          fromDate: new Date(),
          toDate: null,
        });
        throw new Error('Expected failure but succeeded');
      } catch (err) {
        expect(err.type).to.equal('InternalOperationFailed');
        expect(err.details).to.equal(
          'Invalid toDate (expected Date/ISO string)'
        );
      }
    });

    it('should accept ISO string fromDate/toDate (coercion)', async () => {
      const params = {
        mobileNumber: '09171234567',
        fromDate: '2024-01-01T00:00:00Z',
        toDate: '2024-01-02T00:00:00Z',
      };

      const result = await findByMobileDate(params);
      expect(result).to.be.an.array();
      expect(result).to.have.length(2);
    });

    it('should accept numeric timestamp fromDate/toDate (coercion)', async () => {
      const params = {
        mobileNumber: '09171234567',
        fromDate: Date.parse('2024-01-01T00:00:00Z'),
        toDate: Date.parse('2024-01-02T00:00:00Z'),
      };

      const result = await findByMobileDate(params);
      expect(result).to.be.an.array();
      expect(result).to.have.length(2);
    });

    it('should accept moment-like object with toDate() (coercion)', async () => {
      const params = {
        mobileNumber: '09171234567',
        fromDate: { toDate: () => new Date('2024-01-01T00:00:00Z') },
        toDate: { toDate: () => new Date('2024-01-02T00:00:00Z') },
      };

      const result = await findByMobileDate(params);
      expect(result).to.be.an.array();
      expect(result).to.have.length(2);
    });
  });

  describe('findByTransactionId', () => {
    it('should return document when found', async () => {
      const doc = { transactionId: 'TX-1' };
      const findOneStub = sinon
        .stub(BuyLoadTransactionModel, 'findOne')
        .resolves(doc);

      const result = await findByTransactionId('TX-1');

      expect(findOneStub.calledOnce).to.be.true();
      expect(findOneStub.firstCall.args[0]).to.equal({ transactionId: 'TX-1' });
      expect(result).to.equal(doc);
    });

    it('should throw ResourceNotFound when not found', async () => {
      sinon.stub(BuyLoadTransactionModel, 'findOne').resolves(null);

      try {
        await findByTransactionId('TX-NOPE');
        throw new Error('Expected failure but succeeded');
      } catch (err) {
        expect(err.type).to.equal('ResourceNotFound');
        expect(err.details).to.equal('Buy Load Transaction not found.');
      }
    });

    it('should log and rethrow when findOne fails', async () => {
      const boom = new Error('db fail');
      sinon.stub(BuyLoadTransactionModel, 'findOne').rejects(boom);

      try {
        await findByTransactionId('TX-ERR');
        throw new Error('Expected failure but succeeded');
      } catch (err) {
        expect(err).to.shallow.equal(boom);
        expect(
          logger.debug.calledWithMatch(
            'MONGO_BUY_LOAD_TRANSACTION_FIND_BY_TRANSACTION_ID_ERROR'
          )
        ).to.be.true();
      }
    });
  });

  describe('save', () => {
    it('should upsert entity by transactionId and return success when userUuid is provided', async () => {
      const updateOneStub = sinon
        .stub(BuyLoadTransactionModel, 'updateOne')
        .resolves({ acknowledged: true });

      const entity = { transactionId: 'TX-1', foo: 'bar' };
      const result = await save(entity, 'user-1');

      expect(result).to.equal({ success: true });
      expect(updateOneStub.calledOnce).to.be.true();

      const [filter, update, options] = updateOneStub.firstCall.args;
      expect(filter).to.equal({ transactionId: 'TX-1' });
      expect(options).to.equal({ upsert: true });
      expect(update.$set).to.include({ transactionId: 'TX-1', foo: 'bar' });
      expect(update.$set.createdById).to.equal('user-1');
    });

    it('should not include createdById in $set when userUuid is undefined', async () => {
      const updateOneStub = sinon
        .stub(BuyLoadTransactionModel, 'updateOne')
        .resolves({ acknowledged: true });

      const entity = { transactionId: 'TX-2', foo: 'bar' };
      await save(entity, undefined);

      const [, update] = updateOneStub.firstCall.args;
      expect(update.$set).to.include({ transactionId: 'TX-2', foo: 'bar' });
      expect(update.$set).to.not.include(['createdById']);
    });

    it('should include createdById: null when userUuid is null (current behavior)', async () => {
      const updateOneStub = sinon
        .stub(BuyLoadTransactionModel, 'updateOne')
        .resolves({ acknowledged: true });

      const entity = { transactionId: 'TX-3', foo: 'bar' };
      await save(entity, null);

      const [, update] = updateOneStub.firstCall.args;
      expect(update.$set.createdById).to.equal(null);
    });

    it('should log and rethrow when updateOne fails', async () => {
      const boom = new Error('update fail');
      sinon.stub(BuyLoadTransactionModel, 'updateOne').rejects(boom);

      try {
        await save({ transactionId: 'TX-ERR' }, 'user-1');
        throw new Error('Expected failure but succeeded');
      } catch (err) {
        expect(err).to.shallow.equal(boom);
        expect(
          logger.debug.calledWithMatch('MONGO_BUY_LOAD_TRANSACTION_SAVE_ERROR')
        ).to.be.true();
      }
    });
  });
});
