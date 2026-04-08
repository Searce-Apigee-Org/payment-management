import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import {
  handleRefundProcess,
  updatePaymentWithRefundStatus,
} from '../../../src/services/v1/refundService.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Service :: V1 :: refundService', () => {
  let mongo;
  let cxs;
  let secretManager;
  let secretManagerClient;
  let req;

  const buildBearerTokenWithUuid = (uuid = 'user-uuid-1') => {
    const header = Buffer.from(
      JSON.stringify({ alg: 'none', typ: 'JWT' })
    ).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ uuid })).toString('base64url');
    const signature = Buffer.from('sig').toString('base64url');
    return `Bearer ${header}.${payload}.${signature}`;
  };

  beforeEach(() => {
    mongo = {
      paymentRepository: {
        findByPaymentId: Sinon.stub(),
        savePayment: Sinon.stub(),
      },
    };
    cxs = {
      paymentManagementRepository: {
        executeRefund: Sinon.stub(),
      },
    };

    secretManagerClient = {};
    secretManager = {
      paymentServiceRepository: {
        getRefundAuthToken: Sinon.stub().resolves('auth-token'),
      },
    };

    req = {
      payload: {
        tokenPaymentId: 'CXS12345',
      },
      mongo,
      cxs,
      secretManager,
      secretManagerClient,
    };

    Sinon.stub(logger, 'debug');
    Sinon.stub(logger, 'info');
  });

  afterEach(() => {
    Sinon.restore();
  });

  describe('handleRefundProcess', () => {
    it('computes refundAmount from transactionEntity.amount for non-SUPERAPP, calls executeRefund(req, refundRequest), then logs and rethrows due to update step error', async () => {
      req.payload.tokenPaymentId = 'CXS12345';
      const transactionEntity = { amount: 10 };

      cxs.paymentManagementRepository.executeRefund.resolves({
        statusCode: 200,
      });

      try {
        await handleRefundProcess(req, transactionEntity);
        throw new Error('Expected failure but succeeded');
      } catch (err) {
        expect(err).to.be.an.error();

        Sinon.assert.calledOnce(cxs.paymentManagementRepository.executeRefund);
        const args =
          cxs.paymentManagementRepository.executeRefund.firstCall.args;
        expect(args[0]).to.equal(req);
        expect(args[1]).to.equal({ refundAmount: '10' });
        expect(args[2]).to.equal('auth-token');

        Sinon.assert.calledWithMatch(
          logger.debug,
          'REFUND_SERVICE_HANDLE_REFUND_PROCESS_ERROR'
        );
      }
    });

    it('uses paymentEntity.settlementDetails[0].amount for SUPERAPP without budget profile and saves payment (XENDIT + 202)', async () => {
      req.payload.tokenPaymentId = 'GLAABC123';
      const transactionEntity = { amount: 1 };

      const paymentEntity = {
        settlementDetails: [{ amount: '20.00' }],
        paymentType: 'XENDIT',
        budgetProtectProfile: null,
        userToken: buildBearerTokenWithUuid('uuid-superapp-1'),
      };

      mongo.paymentRepository.findByPaymentId.resolves(paymentEntity);
      cxs.paymentManagementRepository.executeRefund.resolves({
        statusCode: 202,
      });
      mongo.paymentRepository.savePayment.resolves({});

      await handleRefundProcess(req, transactionEntity);

      const args = cxs.paymentManagementRepository.executeRefund.firstCall.args;
      expect(args[0]).to.equal(req);
      expect(args[1]).to.equal({ refundAmount: '20.00' });
      expect(args[2]).to.equal('auth-token');

      Sinon.assert.calledOnce(mongo.paymentRepository.savePayment);
      const saved = mongo.paymentRepository.savePayment.firstCall.args[0];
      expect(saved).to.shallow.equal(paymentEntity);
      expect(mongo.paymentRepository.savePayment.firstCall.args[1]).to.equal(
        'uuid-superapp-1'
      );
      expect(typeof saved.lastUpdatedDate).to.equal('string');
    });

    it('adds budgetProtectProfile.chargeAmount to settlement amount for SUPERAPP with budget profile (XENDIT + 202)', async () => {
      req.payload.tokenPaymentId = 'GLAXYZ789';
      const transactionEntity = { amount: 1 };

      const paymentEntity = {
        settlementDetails: [{ amount: '15.50' }],
        paymentType: 'XENDIT',
        budgetProtectProfile: { chargeAmount: 2.5 },
        userToken: buildBearerTokenWithUuid('uuid-superapp-2'),
      };

      mongo.paymentRepository.findByPaymentId.resolves(paymentEntity);
      cxs.paymentManagementRepository.executeRefund.resolves({
        statusCode: 202,
      });
      mongo.paymentRepository.savePayment.resolves({});

      await handleRefundProcess(req, transactionEntity);

      const args = cxs.paymentManagementRepository.executeRefund.firstCall.args;
      expect(args[0]).to.equal(req);
      expect(args[1]).to.equal({ refundAmount: '18' });
      expect(args[2]).to.equal('auth-token');

      Sinon.assert.calledOnce(mongo.paymentRepository.savePayment);
      expect(mongo.paymentRepository.savePayment.firstCall.args[1]).to.equal(
        'uuid-superapp-2'
      );
      const saved = mongo.paymentRepository.savePayment.firstCall.args[0];
      expect(typeof saved.lastUpdatedDate).to.equal('string');
    });

    it('logs and rethrows when executeRefund rejects', async () => {
      req.payload.tokenPaymentId = 'CXSERR1';
      const transactionEntity = { amount: 7 };

      cxs.paymentManagementRepository.executeRefund.rejects(
        new Error('downstream error')
      );

      try {
        await handleRefundProcess(req, transactionEntity);
        throw new Error('Expected failure but succeeded');
      } catch (err) {
        expect(err).to.be.an.error();

        const args =
          cxs.paymentManagementRepository.executeRefund.firstCall.args;
        expect(args[0]).to.equal(req);
        expect(args[1]).to.equal({ refundAmount: '7' });
        expect(args[2]).to.equal('auth-token');

        Sinon.assert.calledWithMatch(
          logger.debug,
          'REFUND_SERVICE_HANDLE_REFUND_PROCESS_ERROR'
        );
      }
    });

    it('logs and rethrows when SUPERAPP payload has undefined budgetProtectProfile (buildRefundRequest failure)', async () => {
      req.payload.tokenPaymentId = 'GLABUG1';
      const transactionEntity = { amount: 5 };

      mongo.paymentRepository.findByPaymentId.resolves({
        settlementDetails: [{ amount: '10.00' }],
        paymentType: 'XENDIT',
      });

      try {
        await handleRefundProcess(req, transactionEntity);
        throw new Error('Expected failure but succeeded');
      } catch (err) {
        expect(err).to.be.an.error();
        Sinon.assert.notCalled(cxs.paymentManagementRepository.executeRefund);
        Sinon.assert.calledWithMatch(
          logger.debug,
          'REFUND_SERVICE_HANDLE_REFUND_PROCESS_ERROR'
        );
      }
    });
  });

  describe('updatePaymentWithRefundStatus', () => {
    it('statusCode 202 with XENDIT sets PENDING and uses numeric refundAmount; saves payment', async () => {
      const tokenPaymentId = 'GLACASE1';
      req.payload.tokenPaymentId = tokenPaymentId;
      const transactionEntity = { amount: 9 };

      const paymentEntity = {
        paymentType: 'XENDIT',
        settlementDetails: [{}],
        userToken: buildBearerTokenWithUuid('uuid-upd-1'),
      };

      mongo.paymentRepository.findByPaymentId.resolves(paymentEntity);
      mongo.paymentRepository.savePayment.resolves({});

      const refundResponse = { statusCode: 202 };
      const refundRequest = { refundAmount: '12.50' };

      await updatePaymentWithRefundStatus(
        req,
        refundResponse,
        transactionEntity,
        refundRequest
      );

      Sinon.assert.calledOnce(mongo.paymentRepository.savePayment);
      expect(mongo.paymentRepository.savePayment.firstCall.args[1]).to.equal(
        'uuid-upd-1'
      );
      const saved = mongo.paymentRepository.savePayment.firstCall.args[0];
      expect(saved).to.shallow.equal(paymentEntity);
      expect(typeof saved.lastUpdatedDate).to.equal('string');
    });

    it('statusCode 202 with XENDIT and string refundRequest converts to numeric amount', async () => {
      const tokenPaymentId = 'GLASTR1';
      req.payload.tokenPaymentId = tokenPaymentId;
      const transactionEntity = { amount: 13 };

      const paymentEntity = {
        paymentType: 'XENDIT',
        settlementDetails: [{}],
        userToken: buildBearerTokenWithUuid('uuid-upd-2'),
      };

      mongo.paymentRepository.findByPaymentId.resolves(paymentEntity);
      mongo.paymentRepository.savePayment.resolves({});

      const refundResponse = { statusCode: 202 };
      const refundRequest = '7.25';

      await updatePaymentWithRefundStatus(
        req,
        refundResponse,
        transactionEntity,
        refundRequest
      );

      Sinon.assert.calledOnce(mongo.paymentRepository.savePayment);
      expect(mongo.paymentRepository.savePayment.firstCall.args[1]).to.equal(
        'uuid-upd-2'
      );
      const saved = mongo.paymentRepository.savePayment.firstCall.args[0];
      expect(typeof saved.lastUpdatedDate).to.equal('string');
    });

    it('non-202 with non-XENDIT sets REFUND_FAILED and forwards refundRequest.refundAmount (string)', async () => {
      const tokenPaymentId = 'GLACASE2';
      req.payload.tokenPaymentId = tokenPaymentId;
      const transactionEntity = { amount: 3 };

      const paymentEntity = {
        paymentType: 'ADYEN',
        settlementDetails: [{}],
        userToken: buildBearerTokenWithUuid('uuid-upd-3'),
      };

      mongo.paymentRepository.findByPaymentId.resolves(paymentEntity);
      mongo.paymentRepository.savePayment.resolves({});

      const refundResponse = { statusCode: 200 };
      const refundRequest = { refundAmount: '7' };

      await updatePaymentWithRefundStatus(
        req,
        refundResponse,
        transactionEntity,
        refundRequest
      );

      Sinon.assert.calledOnce(mongo.paymentRepository.savePayment);
      expect(mongo.paymentRepository.savePayment.firstCall.args[1]).to.equal(
        'uuid-upd-3'
      );
      const saved = mongo.paymentRepository.savePayment.firstCall.args[0];
      expect(typeof saved.lastUpdatedDate).to.equal('string');
    });

    it('non-202 with XENDIT forwards string refundRequest with REFUND_FAILED', async () => {
      const tokenPaymentId = 'GLASTR2';
      req.payload.tokenPaymentId = tokenPaymentId;
      const transactionEntity = { amount: 2 };

      const paymentEntity = {
        paymentType: 'XENDIT',
        settlementDetails: [{}],
        userToken: buildBearerTokenWithUuid('uuid-upd-4'),
      };

      mongo.paymentRepository.findByPaymentId.resolves(paymentEntity);
      mongo.paymentRepository.savePayment.resolves({});

      const refundResponse = { statusCode: 500 };
      const refundRequest = '9.90';

      await updatePaymentWithRefundStatus(
        req,
        refundResponse,
        transactionEntity,
        refundRequest
      );

      Sinon.assert.calledOnce(mongo.paymentRepository.savePayment);
      expect(mongo.paymentRepository.savePayment.firstCall.args[1]).to.equal(
        'uuid-upd-4'
      );
      const saved2 = mongo.paymentRepository.savePayment.firstCall.args[0];
      expect(typeof saved2.lastUpdatedDate).to.equal('string');
    });

    it('statusCode 202 with non-XENDIT returns early without saving', async () => {
      const tokenPaymentId = 'GLACASE3';
      req.payload.tokenPaymentId = tokenPaymentId;
      const transactionEntity = { amount: 4 };

      const paymentEntity = {
        paymentType: 'GCASH',
        settlementDetails: [{}],
      };

      mongo.paymentRepository.findByPaymentId.resolves(paymentEntity);
      const refundResponse = { statusCode: 202 };
      const refundRequest = { refundAmount: '5' };

      await updatePaymentWithRefundStatus(
        req,
        refundResponse,
        transactionEntity,
        refundRequest
      );

      Sinon.assert.notCalled(mongo.paymentRepository.savePayment);
    });

    it('rethrows when findByPaymentId rejects (covers catch)', async () => {
      const tokenPaymentId = 'GLACASEERR';
      req.payload.tokenPaymentId = tokenPaymentId;
      const transactionEntity = { amount: 1 };

      mongo.paymentRepository.findByPaymentId.rejects(new Error('db-fail'));
      const refundResponse = { statusCode: 200 };
      const refundRequest = { refundAmount: '1' };

      try {
        await updatePaymentWithRefundStatus(
          req,
          refundResponse,
          transactionEntity,
          refundRequest
        );
        throw new Error('Expected failure but succeeded');
      } catch (err) {
        expect(err).to.be.an.error();
        Sinon.assert.notCalled(mongo.paymentRepository.savePayment);
        Sinon.assert.calledWithMatch(
          logger.debug,
          'REFUND_SERVICE_UPDATE_PAYMENT_WITH_REFUND_STATUS_ERROR'
        );
      }
    });
  });
});
