import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import {
  callGorApiWithRetry,
  markProvisionStatus,
  processAllSettlements,
  processSettlementDetail,
  updateSettlementDetails,
} from '../../../src/services/v1/csPaymentsSettlementService.js';
import { constants } from '../../../src/util/index.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

let req;

beforeEach(() => {
  req = {
    payload: { tokenPaymentId: 'abc-12345' },
    payment: {
      customerPaymentsRepository: {
        update: Sinon.stub(),
        updateOne: Sinon.stub(),
        findOne: Sinon.stub(),
      },
    },
    gor: {
      gorRepository: {
        updatePaymentTokenId: Sinon.stub(),
        getAccessToken: Sinon.stub(),
      },
    },
    tokenStore: {
      csPaymentsRepository: {
        updateAccessToken: Sinon.stub(),
      },
    },
    csPaymentsSettlementService: {
      updateSettlementDetails,
      markProvisionStatus,
      callGorApiWithRetry,
      processSettlementDetail,
      processAllSettlements,
    },
  };
});

afterEach(() => {
  Sinon.restore();
});

describe('Services :: V1 :: CsPaymentsSettlement :: updateSettlementDetails', () => {
  it('should fetch existing payment and update settlement details', async () => {
    const existingPayment = {
      tokenPaymentId: 'abc-12345',
      settlementDetails: [{ existing: 'data' }],
    };
    req.payment.customerPaymentsRepository.findOne.resolves(existingPayment);
    req.payment.customerPaymentsRepository.updateOne.resolves();

    const settlementDetail = { foo: 'bar' };
    const index = 0;

    await updateSettlementDetails(req, settlementDetail, index);

    expect(
      req.payment.customerPaymentsRepository.findOne.calledOnce
    ).to.be.true();
    const [tokenPaymentIdArg, reqArg] =
      req.payment.customerPaymentsRepository.findOne.getCall(0).args;
    expect(tokenPaymentIdArg).to.equal('abc-12345');
    expect(reqArg).to.equal(req);

    expect(
      req.payment.customerPaymentsRepository.updateOne.calledOnce
    ).to.be.true();
    const [updatedPaymentArg, updateReqArg] =
      req.payment.customerPaymentsRepository.updateOne.getCall(0).args;

    expect(updatedPaymentArg.tokenPaymentId).to.equal('abc-12345');
    expect(updatedPaymentArg.settlementDetails[index]).to.equal(
      settlementDetail
    );
    expect(updateReqArg).to.equal(req);
  });

  it('should initialize settlementDetails array if it does not exist', async () => {
    const existingPayment = {
      tokenPaymentId: 'abc-12345',
      // no settlementDetails
    };
    req.payment.customerPaymentsRepository.findOne.resolves(existingPayment);
    req.payment.customerPaymentsRepository.updateOne.resolves();

    const settlementDetail = { foo: 'bar' };
    const index = 1;

    await updateSettlementDetails(req, settlementDetail, index);

    expect(
      req.payment.customerPaymentsRepository.updateOne.calledOnce
    ).to.be.true();
    const [updatedPaymentArg] =
      req.payment.customerPaymentsRepository.updateOne.getCall(0).args;

    expect(updatedPaymentArg.settlementDetails).to.be.an.array();
    expect(updatedPaymentArg.settlementDetails[index]).to.equal(
      settlementDetail
    );
  });

  it('should throw error when payment is not found', async () => {
    req.payment.customerPaymentsRepository.findOne.resolves(null);

    try {
      await updateSettlementDetails(req, { a: 1 }, 1);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err).to.be.instanceOf(Error);
      expect(err.message).to.equal('Payment not found: abc-12345');
      expect(
        req.payment.customerPaymentsRepository.updateOne.called
      ).to.be.false();
    }
  });

  it('should log and rethrow on findOne error', async () => {
    const debugStub = Sinon.stub(logger, 'debug');
    req.payment.customerPaymentsRepository.findOne.rejects(
      new Error('db error')
    );

    try {
      await updateSettlementDetails(req, { a: 1 }, 1);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err).to.be.instanceOf(Error);
      expect(err.message).to.equal('db error');

      expect(debugStub.calledOnce).to.be.true();
      const [tag, errorArg] = debugStub.getCall(0).args;
      expect(tag).to.equal('UPDATE_SETTLEMENT_DETAILS_ERROR');
      expect(errorArg).to.be.instanceOf(Error);
    }
  });

  it('should log and rethrow on updateOne error', async () => {
    const debugStub = Sinon.stub(logger, 'debug');
    const existingPayment = {
      tokenPaymentId: 'abc-12345',
      settlementDetails: [],
    };
    req.payment.customerPaymentsRepository.findOne.resolves(existingPayment);
    req.payment.customerPaymentsRepository.updateOne.rejects(
      new Error('update error')
    );

    try {
      await updateSettlementDetails(req, { a: 1 }, 1);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err).to.be.instanceOf(Error);
      expect(err.message).to.equal('update error');

      expect(debugStub.calledOnce).to.be.true();
      const [tag, errorArg] = debugStub.getCall(0).args;
      expect(tag).to.equal('UPDATE_SETTLEMENT_DETAILS_ERROR');
      expect(errorArg).to.be.instanceOf(Error);
    }
  });
});

describe('Services :: V1 :: CsPaymentsSettlement :: markProvisionStatus', () => {
  it('should set provisionStatus and call updateOne', async () => {
    const existingPayment = {
      tokenPaymentId: 'abc-12345',
      settlementDetails: [
        { transactions: [{ provisionStatus: 'OLD' }] },
        { transactions: [{ provisionStatus: 'OLD' }] },
        { transactions: [{ provisionStatus: 'PENDING' }] },
      ],
    };
    req.payment.customerPaymentsRepository.findOne.resolves(existingPayment);
    req.payment.customerPaymentsRepository.updateOne.resolves();

    const detail = { transactions: [{ provisionStatus: 'PENDING' }] };

    await markProvisionStatus(req, detail, 2, constants.STATUS.SUCCESS);

    expect(detail.transactions[0].provisionStatus).to.equal(
      constants.STATUS.SUCCESS
    );
    expect(
      req.payment.customerPaymentsRepository.findOne.calledOnce
    ).to.be.true();
    expect(
      req.payment.customerPaymentsRepository.updateOne.calledOnce
    ).to.be.true();

    const [updatedPaymentArg] =
      req.payment.customerPaymentsRepository.updateOne.getCall(0).args;
    expect(updatedPaymentArg.tokenPaymentId).to.equal('abc-12345');
    expect(updatedPaymentArg.settlementDetails[2]).to.equal(detail);
  });

  it('should log and rethrow on update error', async () => {
    const debugStub = Sinon.stub(logger, 'debug');
    const existingPayment = {
      tokenPaymentId: 'abc-12345',
      settlementDetails: [{ transactions: [{}] }],
    };
    req.payment.customerPaymentsRepository.findOne.resolves(existingPayment);
    req.payment.customerPaymentsRepository.updateOne.rejects(
      new Error('mark err')
    );

    const detail = { transactions: [{}] };

    try {
      await markProvisionStatus(req, detail, 0, constants.STATUS.FAILED);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err).to.be.instanceOf(Error);
      expect(err.message).to.equal('mark err');

      expect(debugStub.called).to.be.true();
      const tags = debugStub.getCalls().map((c) => c.args[0]);
      expect(tags).to.include('MARK_PROVISION_STATUS_ERROR');
    }
  });
});

describe('Services :: V1 :: CsPaymentsSettlement :: callGorApiWithRetry', () => {
  it('should refresh access token when 401 via status and then succeed', async () => {
    const unauthorizedErr = { status: constants.HTTP_STATUS.UNAUTHORIZED };
    req.gor.gorRepository.updatePaymentTokenId
      .onFirstCall()
      .resolves(unauthorizedErr);
    req.gor.gorRepository.getAccessToken.resolves({
      access_token: 'newtoken3',
      tokenType: 'Bearer',
    });
    const ok = { statusCode: constants.HTTP_STATUS.NO_CONTENT };
    req.gor.gorRepository.updatePaymentTokenId.onSecondCall().resolves(ok);
    req.tokenStore.csPaymentsRepository.updateAccessToken.resolves();

    const res = await callGorApiWithRetry(req, 'abc-12345', 'Bearer old', {
      authorization: 'Bearer cred',
    });

    expect(res).to.equal(ok);
    expect(req.gor.gorRepository.getAccessToken.calledOnce).to.be.true();
    const [reqArg, credsArg] =
      req.gor.gorRepository.getAccessToken.getCall(0).args;
    expect(reqArg).to.equal(req);
    expect(credsArg).to.equal({ authorization: 'Bearer cred' });

    expect(
      req.tokenStore.csPaymentsRepository.updateAccessToken.calledOnce
    ).to.be.true();
    const [updReqArg, valueArg, entityArg] =
      req.tokenStore.csPaymentsRepository.updateAccessToken.getCall(0).args;
    expect(updReqArg).to.equal(req);
    expect(valueArg).to.equal(
      JSON.stringify({ access_token: 'newtoken3', tokenType: 'Bearer' })
    );
    expect(entityArg).to.equal(constants.SECRET_ENTITY.CHANGE_SIM);

    const secondArgs =
      req.gor.gorRepository.updatePaymentTokenId.getCall(1).args;
    expect(secondArgs[0]).to.equal(req);
    expect(secondArgs[1]).to.equal('abc-12345');
    expect(secondArgs[2]).to.equal('Bearer newtoken3');
  });

  it('should return response as-is on non-401 status (no retry)', async () => {
    const nonAuthRes = { status: 500 };
    req.gor.gorRepository.updatePaymentTokenId.resolves(nonAuthRes);

    const res = await callGorApiWithRetry(req, 'abc-12345', 'Bearer old', {
      authorization: 'Bearer cred',
    });

    expect(res).to.equal(nonAuthRes);
    expect(req.gor.gorRepository.getAccessToken.called).to.be.false();
    expect(
      req.tokenStore.csPaymentsRepository.updateAccessToken.called
    ).to.be.false();
  });
});

describe('Services :: V1 :: CsPaymentsSettlement :: processSettlementDetail', () => {
  it('should skip if requestType is not ChangeSim', async () => {
    const detail = {
      requestType: constants.PAYMENT_REQUEST_TYPES.BUYESIM,
      transactions: [{ provisionStatus: 'PENDING' }],
    };

    const res = await processSettlementDetail(
      req,
      detail,
      0,
      'abc-12345',
      'Bearer x',
      { authorization: 'Bearer cred' }
    );

    expect(res).to.be.false();
    expect(req.payment.customerPaymentsRepository.findOne.called).to.be.false();
    expect(
      req.payment.customerPaymentsRepository.updateOne.called
    ).to.be.false();
    expect(req.gor.gorRepository.updatePaymentTokenId.called).to.be.false();
  });

  it('should skip if provisionStatus is FAILED', async () => {
    // Add this stub even though we expect it to skip
    const existingPayment = {
      tokenPaymentId: 'abc-12345',
      settlementDetails: [
        { transactions: [{ provisionStatus: constants.STATUS.FAILED }] },
      ],
    };
    req.payment.customerPaymentsRepository.findOne.resolves(existingPayment);

    const detail = {
      requestType: constants.PAYMENT_REQUEST_TYPES.CHANGE_SIM,
      transactions: [{ provisionStatus: constants.STATUS.FAILED }],
    };

    const res = await processSettlementDetail(
      req,
      detail,
      0,
      'abc-12345',
      'Bearer x',
      { authorization: 'Bearer cred' }
    );

    expect(res).to.be.false();
    expect(req.gor.gorRepository.updatePaymentTokenId.called).to.be.false();
  });

  it('should mark SUCCESS when gor update returns 204', async () => {
    const existingPayment = {
      tokenPaymentId: 'abc-12345',
      settlementDetails: [
        { transactions: [{ provisionStatus: 'OLD' }] },
        { transactions: [{ provisionStatus: 'PENDING' }] },
      ],
    };
    req.payment.customerPaymentsRepository.findOne.resolves(existingPayment);
    req.payment.customerPaymentsRepository.updateOne.resolves();

    const detail = {
      requestType: constants.PAYMENT_REQUEST_TYPES.CHANGE_SIM,
      transactions: [{ provisionStatus: 'PENDING' }],
    };

    req.gor.gorRepository.updatePaymentTokenId.resolves({
      statusCode: constants.HTTP_STATUS.NO_CONTENT,
    });

    const res = await processSettlementDetail(
      req,
      detail,
      1,
      'abc-12345',
      'Bearer x',
      { authorization: 'Bearer cred' }
    );

    expect(res).to.be.true();
    expect(detail.transactions[0].provisionStatus).to.equal(
      constants.STATUS.SUCCESS
    );
    expect(
      req.payment.customerPaymentsRepository.findOne.calledOnce
    ).to.be.true();
    expect(
      req.payment.customerPaymentsRepository.updateOne.calledOnce
    ).to.be.true();

    const [updatedPaymentArg] =
      req.payment.customerPaymentsRepository.updateOne.getCall(0).args;
    expect(updatedPaymentArg.tokenPaymentId).to.equal('abc-12345');
    expect(updatedPaymentArg.settlementDetails[1]).to.equal(detail);
  });

  it('should mark FAILED when all retries do not return 204', async () => {
    const existingPayment = {
      tokenPaymentId: 'abc-12345',
      settlementDetails: [{ transactions: [{ provisionStatus: 'PENDING' }] }],
    };
    req.payment.customerPaymentsRepository.findOne.resolves(existingPayment);
    req.payment.customerPaymentsRepository.updateOne.resolves();

    const detail = {
      requestType: constants.PAYMENT_REQUEST_TYPES.CHANGE_SIM,
      transactions: [{ provisionStatus: 'PENDING' }],
    };

    req.gor.gorRepository.updatePaymentTokenId.resolves({ statusCode: 500 });

    const res = await processSettlementDetail(
      req,
      detail,
      0,
      'abc-12345',
      'Bearer x',
      { authorization: 'Bearer cred' }
    );

    expect(res).to.be.false();
    expect(detail.transactions[0].provisionStatus).to.equal(
      constants.STATUS.FAILED
    );
    expect(
      req.payment.customerPaymentsRepository.findOne.calledOnce
    ).to.be.true();
    expect(
      req.payment.customerPaymentsRepository.updateOne.calledOnce
    ).to.be.true();
  });

  it('should skip if requestType is not ChangeSim', async () => {
    const detail = {
      requestType: constants.PAYMENT_REQUEST_TYPES.BUYESIM,
      transactions: [{ provisionStatus: 'PENDING' }],
    };

    const res = await processSettlementDetail(
      req,
      detail,
      0,
      'abc-12345',
      'Bearer x',
      { authorization: 'Bearer cred' }
    );

    expect(res).to.be.false();
    expect(req.payment.customerPaymentsRepository.findOne.called).to.be.false();
    expect(
      req.payment.customerPaymentsRepository.updateOne.called
    ).to.be.false();
    expect(req.gor.gorRepository.updatePaymentTokenId.called).to.be.false();
  });
});

describe('Services :: V1 :: CsPaymentsSettlement :: processAllSettlements', () => {
  it('should iterate through settlementDetails and process successfully', async () => {
    const existingPayment = {
      tokenPaymentId: 'abc-12345',
      settlementDetails: [
        {
          requestType: constants.PAYMENT_REQUEST_TYPES.BUYESIM,
          transactions: [{ provisionStatus: 'PENDING' }],
        },
        {
          requestType: constants.PAYMENT_REQUEST_TYPES.CHANGE_SIM,
          transactions: [{ provisionStatus: 'PENDING' }],
        },
      ],
    };
    req.payment.customerPaymentsRepository.findOne.resolves(existingPayment);
    req.payment.customerPaymentsRepository.updateOne.resolves();

    const settlements = existingPayment.settlementDetails;

    req.gor.gorRepository.updatePaymentTokenId.resolves({
      statusCode: constants.HTTP_STATUS.NO_CONTENT,
    });

    await processAllSettlements({
      req,
      settlementDetails: settlements,
      formatTokenPaymentId: 'abc-12345',
      gorAccessToken: 'Bearer x',
      accessTokenCredentials: { authorization: 'Bearer cred' },
    });

    expect(
      req.payment.customerPaymentsRepository.findOne.calledOnce
    ).to.be.true();
    expect(
      req.payment.customerPaymentsRepository.updateOne.calledOnce
    ).to.be.true();
    expect(settlements[1].transactions[0].provisionStatus).to.equal(
      constants.STATUS.SUCCESS
    );
  });

  it('should mark FAILED and throw InternalOperationFailed on processing failure', async () => {
    const debugStub = Sinon.stub(logger, 'debug');
    req.gor.gorRepository.updatePaymentTokenId.rejects({ status: 500 });

    const existingPayment = {
      tokenPaymentId: 'abc-12345',
      settlementDetails: [
        {
          requestType: constants.PAYMENT_REQUEST_TYPES.CHANGE_SIM,
          transactions: [{ provisionStatus: 'PENDING' }],
        },
      ],
    };
    req.payment.customerPaymentsRepository.findOne.resolves(existingPayment);
    req.payment.customerPaymentsRepository.updateOne.resolves();

    const settlements = existingPayment.settlementDetails;

    const markStub = (req.csPaymentsSettlementService.markProvisionStatus =
      Sinon.stub().resolves());

    try {
      await processAllSettlements({
        req,
        settlementDetails: settlements,
        formatTokenPaymentId: 'abc-12345',
        gorAccessToken: 'Bearer x',
        accessTokenCredentials: { authorization: 'Bearer cred' },
      });
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err).to.be.an.object();
      expect(err.type).to.equal('InternalOperationFailed');

      expect(debugStub.called).to.be.true();
      const tags = debugStub.getCalls().map((c) => c.args[0]);
      expect(tags).to.include('PROCESS_ALL_SETTLEMENTS_ERROR');

      expect(markStub.calledOnce).to.be.true();
      const [reqArg, detailArg, indexArg, statusArg] = markStub.getCall(0).args;
      expect(reqArg).to.equal(req);
      expect(detailArg).to.equal(settlements[0]);
      expect(indexArg).to.equal(0);
      expect(statusArg).to.equal(constants.STATUS.FAILED);
    }
  });
});
