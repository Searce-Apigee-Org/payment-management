import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { useVoucher } from '../../../src/services/v1/oneApiService.js';
import { constants } from '../../../src/util/index.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Service :: v1 :: oneApiService :: useVoucher', () => {
  let mongo;
  let oneApi;
  let secretManager;
  let req;

  beforeEach(() => {
    mongo = {
      paymentRepository: {
        findByPaymentId: Sinon.stub(),
      },
    };
    oneApi = {
      voucherRepository: {
        updateVoucher: Sinon.stub(),
      },
    };
    secretManager = {
      paymentServiceRepository: {
        getUpdateVoucherAuthToken: Sinon.stub(),
      },
    };

    req = {
      payload: { tokenPaymentId: 'CXS12345' },
      mongo,
      oneApi,
      secretManager,
      secretManagerClient: {},
    };

    Sinon.stub(logger, 'debug');
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should retrieve payments and call updateVoucher with (req, payments)', async () => {
    const payments = { id: 'pay-1' };
    req.payload.tokenPaymentId = 'CXS12345';
    secretManager.paymentServiceRepository.getUpdateVoucherAuthToken.resolves(
      'access-token'
    );

    mongo.paymentRepository.findByPaymentId.resolves(payments);
    oneApi.voucherRepository.updateVoucher.resolves();

    await useVoucher(req);

    Sinon.assert.calledOnce(mongo.paymentRepository.findByPaymentId);
    Sinon.assert.calledWithExactly(
      mongo.paymentRepository.findByPaymentId,
      'CXS12345'
    );

    Sinon.assert.calledOnce(oneApi.voucherRepository.updateVoucher);
    Sinon.assert.calledWithExactly(
      oneApi.voucherRepository.updateVoucher,
      req,
      payments,
      'access-token'
    );

    Sinon.assert.calledOnce(
      secretManager.paymentServiceRepository.getUpdateVoucherAuthToken
    );
    Sinon.assert.calledWithExactly(
      secretManager.paymentServiceRepository.getUpdateVoucherAuthToken,
      req.secretManagerClient,
      constants.APIS,
      constants.API_NUMBERS.CREATE_PAYMENT_SESSION,
      constants.API_VERSIONS.V1,
      constants.SECRET_ENTITY.VOUCHER
    );
  });

  it('should log and throw OutboundOperationFailed if updateVoucher fails', async () => {
    const payments = { id: 'pay-2' };
    const err = new Error('update failed');

    req.payload.tokenPaymentId = 'CXS-ERR-1';
    mongo.paymentRepository.findByPaymentId.resolves(payments);
    secretManager.paymentServiceRepository.getUpdateVoucherAuthToken.resolves(
      'access-token'
    );
    oneApi.voucherRepository.updateVoucher.rejects(err);

    try {
      await useVoucher(req);
      throw new Error('Expected OutboundOperationFailed but succeeded');
    } catch (e) {
      expect(e).to.be.an.object();
      expect(e.type).to.equal('OutboundOperationFailed');
      expect(e.details).to.equal(
        'The server encountered an outbound operation error.'
      );
      Sinon.assert.calledWithMatch(
        logger.debug,
        'ONE_API_USE_VOUCHER_ERROR',
        err
      );
    }
  });

  it('should log and throw OutboundOperationFailed if findByPaymentId fails', async () => {
    const err = new Error('db failed');
    req.payload.tokenPaymentId = 'CXS-ERR-2';
    mongo.paymentRepository.findByPaymentId.rejects(err);

    try {
      await useVoucher(req);
      throw new Error('Expected OutboundOperationFailed but succeeded');
    } catch (e) {
      expect(e).to.be.an.object();
      expect(e.type).to.equal('OutboundOperationFailed');
      expect(e.details).to.equal(
        'The server encountered an outbound operation error.'
      );
      Sinon.assert.calledWithMatch(
        logger.debug,
        'ONE_API_USE_VOUCHER_ERROR',
        err
      );
      Sinon.assert.notCalled(oneApi.voucherRepository.updateVoucher);
    }
  });

  it('should log and throw OutboundOperationFailed if getUpdateVoucherAuthToken fails', async () => {
    const payments = { id: 'pay-3' };
    const err = new Error('secret manager failed');

    req.payload.tokenPaymentId = 'CXS-ERR-3';
    mongo.paymentRepository.findByPaymentId.resolves(payments);
    secretManager.paymentServiceRepository.getUpdateVoucherAuthToken.rejects(
      err
    );

    try {
      await useVoucher(req);
      throw new Error('Expected OutboundOperationFailed but succeeded');
    } catch (e) {
      expect(e).to.be.an.object();
      expect(e.type).to.equal('OutboundOperationFailed');
      Sinon.assert.calledWithMatch(
        logger.debug,
        'ONE_API_USE_VOUCHER_ERROR',
        err
      );
      Sinon.assert.notCalled(oneApi.voucherRepository.updateVoucher);
    }
  });
});
