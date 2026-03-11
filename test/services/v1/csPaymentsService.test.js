import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { processCSPayments } from '../../../src/services/v1/csPaymentsService.js';
import { constants } from '../../../src/util/index.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Service :: V1 :: CsPayments :: processCSPayments', () => {
  let req;

  beforeEach(() => {
    req = {
      payload: {
        tokenPaymentId: 'abc12345',
        paymentStatus: 'PENDING',
      },
      secretManager: {
        csPaymentsRepository: {
          getCSPaymentsCredentials: Sinon.stub(),
        },
      },
      tokenStore: {
        csPaymentsRepository: {
          fetchAccessToken: Sinon.stub(),
        },
      },
      payment: {
        customerPaymentsRepository: {
          findOne: Sinon.stub(),
        },
      },
      csPaymentsSettlementService: {
        processAllSettlements: Sinon.stub(),
      },
      gorTokenService: {
        getOrRefreshAccessToken: Sinon.stub(),
      },
    };
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should early-return 204 for non-AUTHORISED payments and log info', async () => {
    const infoStub = Sinon.stub(logger, 'info');

    req.payload.paymentStatus = 'FAILED';

    const res = await processCSPayments(req);

    expect(res).to.equal({ statusCode: constants.HTTP_STATUS.NO_CONTENT });
    expect(infoStub.calledOnce).to.be.true();
    const msg = infoStub.getCall(0).args[0];
    expect(msg).to.include('not AUTHORISED');
    expect(msg).to.include(req.payload.tokenPaymentId);

    expect(
      req.csPaymentsSettlementService.processAllSettlements.called
    ).to.be.false();
    expect(req.gorTokenService.getOrRefreshAccessToken.called).to.be.false();
  });

  it('should process AUTHORISED payments end-to-end and return 204', async () => {
    req.payload.paymentStatus = constants.PAYMENT_STATUS.AUTHORISED;

    const decodedCredentials = { headers: { authorization: 'gor-auth' } };
    const cachedToken = { any: 'cachedTokenShape' };
    const paymentSession = { settlementDetails: [{ id: 's1' }] };

    req.secretManager.csPaymentsRepository.getCSPaymentsCredentials.resolves(
      decodedCredentials
    );
    req.tokenStore.csPaymentsRepository.fetchAccessToken.resolves(cachedToken);
    req.payment.customerPaymentsRepository.findOne.resolves(paymentSession);

    const gorAccessToken = 'Bearer gor-access-token';
    req.gorTokenService.getOrRefreshAccessToken.resolves(gorAccessToken);
    req.csPaymentsSettlementService.processAllSettlements.resolves();

    const res = await processCSPayments(req);

    expect(res).to.equal({ statusCode: constants.HTTP_STATUS.NO_CONTENT });
    expect(req.payload.paymentStatus).to.equal(
      constants.PAYMENT_STATUS.AUTHORIZED
    );

    expect(
      req.tokenStore.csPaymentsRepository.fetchAccessToken.calledOnce
    ).to.be.true();
    const [fetchReqArg, entityArg] =
      req.tokenStore.csPaymentsRepository.fetchAccessToken.getCall(0).args;
    expect(fetchReqArg).to.equal(req);
    expect(entityArg).to.equal(constants.SECRET_ENTITY.CHANGE_SIM);

    expect(req.gorTokenService.getOrRefreshAccessToken.calledOnce).to.be.true();
    const [reqArg, cachedArg, credsArg] =
      req.gorTokenService.getOrRefreshAccessToken.getCall(0).args;
    expect(reqArg).to.equal(req);
    expect(cachedArg).to.equal(cachedToken);
    expect(credsArg).to.equal({ authorization: 'Bearer gor-auth' });

    expect(
      req.csPaymentsSettlementService.processAllSettlements.calledOnce
    ).to.be.true();
    const [settlementArgs] =
      req.csPaymentsSettlementService.processAllSettlements.getCall(0).args;
    expect(settlementArgs.req).to.equal(req);
    expect(settlementArgs.settlementDetails).to.equal(
      paymentSession.settlementDetails
    );
    expect(settlementArgs.formatTokenPaymentId).to.equal('abc-12345');
    expect(settlementArgs.gorAccessToken).to.equal(gorAccessToken);
    expect(settlementArgs.accessTokenCredentials).to.equal({
      authorization: 'Bearer gor-auth',
    });
  });

  it('should log debug and rethrow the original error', async () => {
    const debugStub = Sinon.stub(logger, 'debug');

    req.payload.paymentStatus = constants.PAYMENT_STATUS.AUTHORISED;

    req.secretManager.csPaymentsRepository.getCSPaymentsCredentials.rejects(
      new Error('boom')
    );

    try {
      await processCSPayments(req);
      throw new Error('Expected to throw but succeeded');
    } catch (err) {
      expect(err).to.be.instanceOf(Error);
      expect(err.message).to.equal('boom');

      expect(debugStub.calledOnce).to.be.true();
      const [tag, errorArg] = debugStub.getCall(0).args;
      expect(tag).to.equal('API_PROCESS_CS_PAYMENTS_ERROR');
      expect(errorArg).to.be.instanceOf(Error);
    }
  });

  it('should handle when payment session is not wrapped under Item', async () => {
    req.payload.paymentStatus = constants.PAYMENT_STATUS.AUTHORISED;

    req.secretManager.csPaymentsRepository.getCSPaymentsCredentials.resolves({
      headers: { authorization: 'abc' },
    });
    req.tokenStore.csPaymentsRepository.fetchAccessToken.resolves(null);
    const settlementDetails = [{ id: 's1' }];
    req.payment.customerPaymentsRepository.findOne.resolves({
      settlementDetails,
    });

    req.gorTokenService.getOrRefreshAccessToken.resolves('gor-token');
    req.csPaymentsSettlementService.processAllSettlements.resolves();

    const res = await processCSPayments(req);

    expect(res.statusCode).to.equal(constants.HTTP_STATUS.NO_CONTENT);
    const [settlementArgs] =
      req.csPaymentsSettlementService.processAllSettlements.getCall(0).args;
    expect(settlementArgs.settlementDetails).to.equal(settlementDetails);
  });
});
