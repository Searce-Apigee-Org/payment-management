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
  let payment;

  beforeEach(() => {
    mongo = {
      paymentRepository: {
        findByPaymentId: Sinon.stub(),
      },
    };
    payment = {
      customerPaymentsRepository: {
        findOne: Sinon.stub(),
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
      payment,
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

    payment.customerPaymentsRepository.findOne.resolves(payments);
    oneApi.voucherRepository.updateVoucher.resolves();

    await useVoucher(req);

    Sinon.assert.calledOnce(req.payment.customerPaymentsRepository.findOne);
    Sinon.assert.calledWithExactly(
      req.payment.customerPaymentsRepository.findOne,
      'CXS12345',
      req
    );

    Sinon.assert.calledOnce(req.oneApi.voucherRepository.updateVoucher);
    Sinon.assert.calledWithExactly(
      req.oneApi.voucherRepository.updateVoucher,
      req,
      payments,
      'access-token'
    );

    Sinon.assert.calledOnce(
      req.secretManager.paymentServiceRepository.getUpdateVoucherAuthToken
    );
    Sinon.assert.calledWithExactly(
      req.secretManager.paymentServiceRepository.getUpdateVoucherAuthToken,
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
    payment.customerPaymentsRepository.findOne.resolves(payments);
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
    payment.customerPaymentsRepository.findOne.rejects(err);

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
    payment.customerPaymentsRepository.findOne.resolves(payments);
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
