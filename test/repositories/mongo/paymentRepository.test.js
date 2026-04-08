import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { mongo } from '../../../src/models/index.js';
import {
  findByPaymentId,
  savePayment,
} from '../../../src/repositories/mongo/paymentRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;
export { lab };

let findOneStub;

describe('Repository :: Mongo :: Payment Repository', () => {
  beforeEach(() => {
    findOneStub = Sinon.stub(mongo.CustomerPaymentModel, 'findOne');
    Sinon.stub(logger, 'debug');
    Sinon.stub(logger, 'info');
  });

  afterEach(() => {
    Sinon.restore();
  });

  describe('findByPaymentId', () => {
    const tokenPaymentId = 'pay-123';

    it('should return document when found', async () => {
      const mockDoc = { _id: 'id1', tokenPaymentId, paymentType: 'XENDIT' };
      const stub = findOneStub.resolves(mockDoc);

      const res = await findByPaymentId(tokenPaymentId);

      expect(stub.calledOnce).to.be.true();
      expect(stub.firstCall.args[0]).to.equal({ tokenPaymentId });
      expect(res).to.equal(mockDoc);
    });

    it('should log and throw ResourceNotFound when document is not found', async () => {
      findOneStub.resolves(null);

      try {
        await findByPaymentId(tokenPaymentId);
        throw new Error('should have thrown');
      } catch (err) {
        expect(err).to.be.an.object();
        expect(err.type).to.equal('ResourceNotFound');
        expect(err.details).to.equal('Payment not found.');
        expect(logger.debug.calledOnce).to.be.true();
        expect(logger.debug.firstCall.args[0]).to.equal(
          'MONGO_PAYMENT_FIND_BY_PAYMENT_ID_ERROR'
        );
        expect(logger.debug.firstCall.args[1]).to.equal(err);
      }
    });

    it('should log and rethrow on database error', async () => {
      const dbErr = new Error('DB failure');
      findOneStub.rejects(dbErr);

      try {
        await findByPaymentId(tokenPaymentId);
        throw new Error('should have thrown');
      } catch (err) {
        expect(err).to.shallow.equal(dbErr);
        expect(logger.debug.calledOnce).to.be.true();
        expect(logger.debug.firstCall.args[0]).to.equal(
          'MONGO_PAYMENT_FIND_BY_PAYMENT_ID_ERROR'
        );
        expect(logger.debug.firstCall.args[1]).to.shallow.equal(dbErr);
      }
    });
  });

  describe('savePayment', () => {
    const payment = {
      tokenPaymentId: 'pay-789',
      paymentType: 'XENDIT',
    };

    it('should save payment and return { success: true } on success', async () => {
      const saveStub = Sinon.stub(
        mongo.CustomerPaymentModel.prototype,
        'save'
      ).resolves();

      const res = await savePayment(payment);

      expect(saveStub.calledOnce).to.be.true();
      expect(logger.info.calledOnce).to.be.true();
      expect(logger.info.firstCall.args[0]).to.equal('SAVE_PAYMENT_RESPONSE');
      expect(logger.info.firstCall.args[1]).to.equal({ success: true });
      expect(res).to.equal({ success: true });
    });

    it('should set createdById when userUuid is provided', async () => {
      const saveStub = Sinon.stub(
        mongo.CustomerPaymentModel.prototype,
        'save'
      ).callsFake(function () {
        expect(this.createdById).to.equal('user-123');
        return Promise.resolve();
      });

      await savePayment(payment, 'user-123');

      expect(saveStub.calledOnce).to.be.true();
    });

    it('should keep createdById default (null) when userUuid is undefined', async () => {
      const saveStub = Sinon.stub(
        mongo.CustomerPaymentModel.prototype,
        'save'
      ).callsFake(function () {
        expect(this.createdById).to.equal(null);
        return Promise.resolve();
      });

      await savePayment(payment, undefined);

      expect(saveStub.calledOnce).to.be.true();
    });

    it('should set createdById to null when userUuid is explicitly null (current behavior)', async () => {
      const saveStub = Sinon.stub(
        mongo.CustomerPaymentModel.prototype,
        'save'
      ).callsFake(function () {
        expect(this.createdById).to.equal(null);
        return Promise.resolve();
      });

      await savePayment(payment, null);

      expect(saveStub.calledOnce).to.be.true();
    });

    it('should log and rethrow on save error', async () => {
      const saveError = new Error('save failed');
      const saveStub = Sinon.stub(
        mongo.CustomerPaymentModel.prototype,
        'save'
      ).rejects(saveError);

      try {
        await savePayment(payment);
        throw new Error('should have thrown');
      } catch (err) {
        expect(err).to.shallow.equal(saveError);
        expect(logger.debug.calledOnce).to.be.true();
        expect(logger.debug.firstCall.args[0]).to.equal(
          'MONGO_SAVE_PAYMENT_ERROR'
        );
        expect(logger.debug.firstCall.args[1]).to.shallow.equal(saveError);
        expect(saveStub.calledOnce).to.be.true();
      }
    });
  });
});
