import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import esmock from 'esmock';
import Sinon from 'sinon';
import { constants } from '../../../src/util/index.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Service :: PaymentAutoRefundService :: paymentAutoRefund', () => {
  let loggerMock;
  let getErrorMock;
  let paymentsUtilMock;
  let validateSchemaMock;
  let paymentRefundValidationMock;

  beforeEach(() => {
    loggerMock = {
      info: Sinon.stub(),
      debug: Sinon.stub(),
    };
    getErrorMock = Sinon.stub();
    paymentsUtilMock = {
      getChannelConfig: Sinon.stub(),
      isPaymentEligibleForRefund: Sinon.stub(),
    };
    validateSchemaMock = Sinon.stub();
    paymentRefundValidationMock = {
      paymentAutoRefundRequestSchema: Symbol('paymentAutoRefundRequestSchema'),
    };
  });

  afterEach(() => {
    Sinon.restore();
  });

  async function loadService() {
    const mod = await esmock(
      '../../../src/services/v1/paymentAutoRefundService.js',
      {
        '@globetel/cxs-core/core/error/utils/index.js': {
          getError: getErrorMock,
        },
        '@globetel/cxs-core/core/logger/index.js': {
          logger: loggerMock,
        },
        '@globetel/cxs-core/core/validators/index.js': {
          validateSchema: validateSchemaMock,
        },
        '../../../src/util/index.js': {
          paymentsUtil: paymentsUtilMock,
        },
        '../../../src/validations/v1/index.js': {
          paymentRefundValidation: paymentRefundValidationMock,
        },
      }
    );
    return mod.paymentAutoRefund;
  }

  const buildPayload = (refundDetails) => ({
    payload: {
      message: {
        data: Buffer.from(JSON.stringify(refundDetails), 'utf8').toString(
          'base64'
        ),
      },
    },
  });

  it('should return empty results when no refund details', async () => {
    const paymentAutoRefund = await loadService();

    const req = {
      ...buildPayload([]),
      serviceHelpers: {},
      secretManager: {
        paymentServiceRepository: {
          getPaymentAutoRefundConfig: Sinon.stub(),
        },
      },
      secret: {},
    };

    const result = await paymentAutoRefund(req);
    expect(result.statusCode).to.equal(200);
    const body = JSON.parse(result.body);
    expect(body.results).to.equal([]);
    expect(validateSchemaMock.calledOnce).to.be.true();
  });

  it('should process refundable and eligible record and include notification when enabled', async () => {
    const paymentAutoRefund = await loadService();

    const callRequestRefundAPI = Sinon.stub().resolves({
      refundStatus: constants.PAYMENT_STATUS.SUCCESS,
    });
    const updateRefundRequest = Sinon.stub().resolves();
    const emailNotif = Sinon.stub().resolves({
      notificationStatus: constants.STATUS.SUCCESS,
    });

    const req = {
      ...buildPayload([
        {
          tokenPaymentId: 'TOK-1',
          settlementDetails: [{ amount: 100, requestType: 'BuyESIMLocal' }],
        },
      ]),
      serviceHelpers: {
        paymentAutoRefund: {
          callRequestRefundAPI,
          updateRefundRequest,
          emailNotif,
        },
      },
      secretManager: {
        paymentServiceRepository: {
          getPaymentAutoRefundConfig: Sinon.stub().resolves([
            { prefix: 'TOK' },
          ]),
        },
      },
      secret: {},
      mongo: {},
      cxs: { paymentManagementRepository: {} },
      http: {},
      raven: {},
      soap: {},
    };

    paymentsUtilMock.getChannelConfig.returns({
      refundable: true,
      notification: true,
      patternId: 'pattern-1',
    });
    paymentsUtilMock.isPaymentEligibleForRefund.returns(true);

    const result = await paymentAutoRefund(req);

    expect(callRequestRefundAPI.calledOnce).to.be.true();
    const [callArgs] = callRequestRefundAPI.getCall(0).args;
    expect(callArgs).to.include({
      tokenPaymentId: 'TOK-1',
      refundAmount: 100,
    });
    expect(callArgs.secretManager).to.equal(req.secretManager);
    expect(callArgs.secretManagerClient).to.equal(req.secret);
    expect(callArgs.http).to.equal(req.http);
    expect(callArgs.cxs).to.equal(req.cxs);
    expect(updateRefundRequest.calledOnce).to.be.true();
    expect(emailNotif.calledOnce).to.be.true();

    const body = JSON.parse(result.body);
    expect(body.results).to.have.length(1);
    expect(body.results[0]).to.include({ tokenPaymentId: 'TOK-1' });
    expect(body.results[0].refundStatus).to.equal(
      constants.PAYMENT_STATUS.SUCCESS
    );
    expect(body.results[0].notificationStatus).to.equal(
      constants.STATUS.SUCCESS
    );
    expect(validateSchemaMock.calledOnce).to.be.true();
  });

  it('should skip refund when not refundable or not eligible', async () => {
    const paymentAutoRefund = await loadService();

    const callRequestRefundAPI = Sinon.stub().resolves({
      refundStatus: 'success',
    });

    const req = {
      ...buildPayload([
        {
          tokenPaymentId: 'TOK-2',
          settlementDetails: [{ amount: 200, requestType: 'BuyESIMLocal' }],
        },
      ]),
      serviceHelpers: {
        paymentAutoRefund: {
          callRequestRefundAPI,
          updateRefundRequest: Sinon.stub(),
          emailNotif: Sinon.stub(),
        },
      },
      secretManager: {
        paymentServiceRepository: {
          getPaymentAutoRefundConfig: Sinon.stub().resolves([
            { prefix: 'TOK' },
          ]),
        },
      },
      secret: {},
      mongo: {},
    };

    paymentsUtilMock.getChannelConfig.returns({ refundable: false });
    paymentsUtilMock.isPaymentEligibleForRefund.returns(true);

    const result = await paymentAutoRefund(req);
    expect(callRequestRefundAPI.called).to.be.false();
    const body = JSON.parse(result.body);
    expect(body.results).to.equal([]);
    expect(validateSchemaMock.calledOnce).to.be.true();
  });

  it('should skip when settlement details are empty', async () => {
    const paymentAutoRefund = await loadService();

    const callRequestRefundAPI = Sinon.stub().resolves({
      refundStatus: constants.PAYMENT_STATUS.SUCCESS,
    });

    const req = {
      ...buildPayload([
        {
          tokenPaymentId: 'TOK-EMPTY',
          settlementDetails: [],
        },
      ]),
      serviceHelpers: {
        paymentAutoRefund: {
          callRequestRefundAPI,
          updateRefundRequest: Sinon.stub(),
          emailNotif: Sinon.stub(),
        },
      },
      secretManager: {
        paymentServiceRepository: {
          getPaymentAutoRefundConfig: Sinon.stub().resolves([
            { prefix: 'TOK' },
          ]),
        },
      },
      secret: {},
    };

    const result = await paymentAutoRefund(req);

    expect(callRequestRefundAPI.called).to.be.false();
    expect(result.statusCode).to.equal(200);
    const body = JSON.parse(result.body);
    expect(body.results).to.equal([]);
    expect(
      loggerMock.debug.calledWith('PAYMENT_AUTO_REFUND_SKIP_EMPTY_SETTLEMENT', {
        tokenPaymentId: 'TOK-EMPTY',
      })
    ).to.be.true();
  });

  it('should skip when payment is not eligible for refund', async () => {
    const paymentAutoRefund = await loadService();

    const callRequestRefundAPI = Sinon.stub().resolves({
      refundStatus: constants.PAYMENT_STATUS.SUCCESS,
    });

    const req = {
      ...buildPayload([
        {
          tokenPaymentId: 'TOK-NOELIG',
          settlementDetails: [{ amount: 150, requestType: 'BuyESIMLocal' }],
        },
      ]),
      serviceHelpers: {
        paymentAutoRefund: {
          callRequestRefundAPI,
          updateRefundRequest: Sinon.stub(),
          emailNotif: Sinon.stub(),
        },
      },
      secretManager: {
        paymentServiceRepository: {
          getPaymentAutoRefundConfig: Sinon.stub().resolves([
            { prefix: 'TOK' },
          ]),
        },
      },
      secret: {},
      mongo: {},
    };

    paymentsUtilMock.getChannelConfig.returns({ refundable: true });
    paymentsUtilMock.isPaymentEligibleForRefund.returns(false);

    const result = await paymentAutoRefund(req);

    expect(callRequestRefundAPI.called).to.be.false();
    expect(result.statusCode).to.equal(200);
    const body = JSON.parse(result.body);
    expect(body.results).to.equal([]);
    expect(
      loggerMock.debug.calledWith('PAYMENT_AUTO_REFUND_SKIP_NOT_ELIGIBLE', {
        tokenPaymentId: 'TOK-NOELIG',
      })
    ).to.be.true();
  });

  it('should return error body when exception is thrown', async () => {
    const paymentAutoRefund = await loadService();

    const req = {
      ...buildPayload([{ tokenPaymentId: 'TOK-3', settlementDetails: [] }]),
      serviceHelpers: {},
      secretManager: {
        paymentServiceRepository: {
          getPaymentAutoRefundConfig: Sinon.stub().rejects(new Error('boom')),
        },
      },
      secret: {},
      cxs: {},
      http: {},
    };

    getErrorMock.returns({
      statusCode: 500,
      code: 'ERR',
      message: 'fail',
      details: 'boom',
      displayMessage: 'fail',
    });

    const result = await paymentAutoRefund(req);
    expect(result.statusCode).to.equal(500);
    const body = JSON.parse(result.body);
    expect(body.error.code).to.equal('ERR');
  });
});
