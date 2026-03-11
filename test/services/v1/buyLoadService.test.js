import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { msisdnFormatter } from '@globetel/cxs-core/core/utils/string/index.js';
import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { buyLoad } from '../../../src/services/v1/buyLoadService.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Service :: V1 :: buyLoadService :: buyLoad', () => {
  let req;

  beforeEach(() => {
    req = {
      app: { dataDictionary: {} },
      params: { customerId: '09171234567' },
      payload: {
        tokenPaymentId: 'CXS12345',
        keyword: 'GOSURF',
        amount: '100',
        wallet: 'WALLET_MAIN',
      },
      secretManagerClient: {},
      secretManager: {},
      amax: {},
      http: {},
      amaxService: {
        executeAmaxTransaction: Sinon.stub(),
      },
      productOrderingService: {
        createPolicy: Sinon.stub(),
        addQuest: Sinon.stub(),
      },
      oneApiService: {
        useVoucher: Sinon.stub(),
      },
      cxs: {},
      oneApi: {},
      refundService: {
        handleRefundProcess: Sinon.stub(),
      },
      refund: {},
      payment: {
        customerPaymentsRepository: {
          findOne: Sinon.stub().resolves({
            userToken: 'Bearer abc.def.ghi',
            deviceId: 'device-123',
            settlementDetails: [
              {
                provisionedAmount: '50.00',
                transactions: [{ transactionId: 'TRANS-1' }],
              },
            ],
          }),
        },
      },
      transactions: {
        buyLoadTransactionsRepository: {
          save: Sinon.stub().resolves({ success: true }),
          findOne: Sinon.stub().resolves({
            some: 'buyload-entity',
          }),
        },
      },
      paymentService: {
        updateOnBuyLoad: Sinon.stub().resolves({}),
      },
    };

    Sinon.stub(logger, 'debug');
    Sinon.stub(logger, 'info');
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should complete non-refund flow and persist entities when AMAX returns a transactionId', async () => {
    req.amaxService.executeAmaxTransaction.resolves({
      transactionId: 'AMAX-TX-1',
    });

    req.productOrderingService.createPolicy.resolves({});
    req.productOrderingService.addQuest.resolves({});
    req.oneApiService.useVoucher.resolves({});

    const buyloadEntityObj = { some: 'buyload-entity' };
    req.transactions.buyLoadTransactionsRepository.findOne.resolves(
      buyloadEntityObj
    );

    const res = await buyLoad(req);

    expect(res).to.be.an.object();
    expect(res.statusCode).to.equal(201);

    Sinon.assert.calledOnce(req.productOrderingService.createPolicy);
    Sinon.assert.calledOnce(req.productOrderingService.addQuest);
    Sinon.assert.calledOnce(req.oneApiService.useVoucher);

    Sinon.assert.calledOnce(req.amaxService.executeAmaxTransaction);
    Sinon.assert.calledWithExactly(
      req.amaxService.executeAmaxTransaction,
      req,
      'CXS',
      msisdnFormatter(req.params.customerId, '0'),
      req.payload.amount,
      req.payload.keyword,
      req.payload.wallet
    );

    Sinon.assert.calledOnce(req.paymentService.updateOnBuyLoad);
    const updateArgs = req.paymentService.updateOnBuyLoad.firstCall.args;
    expect(updateArgs[0]).to.equal(req);
    expect(updateArgs[1]).to.equal('SUCCESS');
    expect(updateArgs[2]).to.equal('AMAX-TX-1');

    Sinon.assert.calledOnce(
      req.transactions.buyLoadTransactionsRepository.save
    );

    const savedArg =
      req.transactions.buyLoadTransactionsRepository.save.firstCall.args[0];
    expect(savedArg.tokenPaymentId).to.equal(req.payload.tokenPaymentId);
    expect(savedArg.transactionId).to.equal('AMAX-TX-1');
    expect(savedArg.amount).to.equal(100);
    expect(savedArg.keyword).to.equal('GOSURF');
    expect(savedArg.wallet).to.equal('WALLET_MAIN');
    expect(savedArg.mobileNumber).to.equal(
      msisdnFormatter(req.params.customerId, '0')
    );
    expect(savedArg.status).to.equal('SUCCESS');
    expect(savedArg.channelCode).to.equal('CXS');
    expect(savedArg.createdDate).to.be.a.string();

    Sinon.assert.calledWithExactly(
      req.transactions.buyLoadTransactionsRepository.findOne,
      'TRANS-1'
    );

    expect(req.app.dataDictionary).to.include({
      transaction_status: 'Success',
    });
    expect(
      req.app.dataDictionary.event_detail.result.provisioned_amount
    ).to.equal(50);
  });

  it('should normalize keyword and wallet to null when request payload fields are undefined', async () => {
    req.payload.keyword = undefined;
    req.payload.wallet = undefined;

    req.amaxService.executeAmaxTransaction.resolves({
      transactionId: 'AMAX-TX-1b',
    });

    req.productOrderingService.createPolicy.resolves({});
    req.productOrderingService.addQuest.resolves({});
    req.oneApiService.useVoucher.resolves({});

    const buyloadEntityObj = { some: 'buyload-entity' };
    req.transactions.buyLoadTransactionsRepository.findOne.resolves(
      buyloadEntityObj
    );

    const res = await buyLoad(req);

    expect(res).to.be.an.object();
    expect(res.statusCode).to.equal(201);

    const savedArg =
      req.transactions.buyLoadTransactionsRepository.save.firstCall.args[0];
    expect(savedArg.keyword).to.equal(null);
    expect(savedArg.wallet).to.equal(null);

    Sinon.assert.calledOnce(req.amaxService.executeAmaxTransaction);
    Sinon.assert.calledWithExactly(
      req.amaxService.executeAmaxTransaction,
      req,
      'CXS',
      msisdnFormatter(req.params.customerId, '0'),
      req.payload.amount,
      null,
      null
    );
  });

  it('should trigger refund flow when AMAX throws an error', async () => {
    const boom = new Error('amax error');
    req.amaxService.executeAmaxTransaction.rejects(boom);

    try {
      await buyLoad(req);
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err).to.shallow.equal(boom);

      Sinon.assert.calledOnce(req.refundService.handleRefundProcess);
      Sinon.assert.calledWithMatch(
        req.refundService.handleRefundProcess,
        req,
        Sinon.match.object
      );

      Sinon.assert.calledOnce(req.paymentService.updateOnBuyLoad);
      const updateArgs = req.paymentService.updateOnBuyLoad.firstCall.args;
      expect(updateArgs[0]).to.equal(req);
      expect(updateArgs[1]).to.equal('FAILED');
      expect(updateArgs[2]).to.be.a.string();
      Sinon.assert.calledOnce(
        req.transactions.buyLoadTransactionsRepository.save
      );

      const savedArg =
        req.transactions.buyLoadTransactionsRepository.save.firstCall.args[0];
      expect(savedArg.status).to.equal('FAILED');
      expect(savedArg.transactionId).to.be.a.string();

      Sinon.assert.calledWithMatch(logger.debug, 'API_BUY_LOAD_ERROR');

      Sinon.assert.calledTwice(req.payment.customerPaymentsRepository.findOne);
      Sinon.assert.calledWithExactly(
        req.payment.customerPaymentsRepository.findOne,
        req.payload.tokenPaymentId,
        req
      );
    }
  });

  it('should skip downstream policy/voucher calls when AMAX response has no transactionId', async () => {
    req.amaxService.executeAmaxTransaction.resolves({});

    const res = await buyLoad(req);

    expect(res).to.be.an.object();
    expect(res.statusCode).to.equal(201);

    Sinon.assert.calledOnce(req.amaxService.executeAmaxTransaction);
    Sinon.assert.notCalled(req.productOrderingService.createPolicy);
    Sinon.assert.notCalled(req.productOrderingService.addQuest);
    Sinon.assert.notCalled(req.oneApiService.useVoucher);

    Sinon.assert.calledTwice(req.payment.customerPaymentsRepository.findOne);
    Sinon.assert.alwaysCalledWithExactly(
      req.payment.customerPaymentsRepository.findOne,
      req.payload.tokenPaymentId,
      req
    );

    Sinon.assert.calledOnce(req.paymentService.updateOnBuyLoad);
    const updateArgs = req.paymentService.updateOnBuyLoad.firstCall.args;
    expect(updateArgs[0]).to.equal(req);
    expect(updateArgs[1]).to.equal('SUCCESS');
    expect(updateArgs[2]).to.be.a.string();

    Sinon.assert.calledOnce(
      req.transactions.buyLoadTransactionsRepository.save
    );
    const savedArg =
      req.transactions.buyLoadTransactionsRepository.save.firstCall.args[0];
    expect(savedArg.status).to.equal('SUCCESS');
    expect(savedArg.transactionId).to.be.a.string();
    expect(updateArgs[2]).to.equal(savedArg.transactionId);
  });

  it('should handle missing settlement details and empty headers when payment entity has no settlementDetails', async () => {
    req.amaxService.executeAmaxTransaction.resolves({
      transactionId: 'AMAX-TX-3',
    });

    const paymentEntityRef = {
      settlementDetails: undefined,
    };
    req.payment.customerPaymentsRepository.findOne.resolves(paymentEntityRef);

    req.productOrderingService.createPolicy.resolves({});
    req.productOrderingService.addQuest.resolves({});
    req.oneApiService.useVoucher.resolves({});

    const buyloadEntityObj = { some: 'buyload-entity' };
    req.transactions.buyLoadTransactionsRepository.findOne.resolves(
      buyloadEntityObj
    );

    const res = await buyLoad(req);

    expect(res).to.be.an.object();
    expect(res.statusCode).to.equal(201);

    Sinon.assert.notCalled(
      req.transactions.buyLoadTransactionsRepository.findOne
    );

    expect(paymentEntityRef.settlementDetails).to.equal({});

    expect(
      req.app.dataDictionary.event_detail.result.provisioned_amount
    ).to.equal('');
  });

  it('should set empty provisioned_amount when provisionedAmount is null', async () => {
    req.amaxService.executeAmaxTransaction.resolves({
      transactionId: 'AMAX-TX-4',
    });

    req.payment.customerPaymentsRepository.findOne.resolves({
      userToken: 'Bearer token',
      deviceId: 'dev-1',
      settlementDetails: [
        {
          provisionedAmount: null,
          transactions: [{ transactionId: 'TRANS-2' }],
        },
      ],
    });

    req.productOrderingService.createPolicy.resolves({});
    req.productOrderingService.addQuest.resolves({});
    req.oneApiService.useVoucher.resolves({});

    const buyloadEntityObj = { some: 'buyload-entity' };
    req.transactions.buyLoadTransactionsRepository.findOne.resolves(
      buyloadEntityObj
    );

    const res = await buyLoad(req);

    expect(res).to.be.an.object();
    expect(res.statusCode).to.equal(201);

    Sinon.assert.calledWithExactly(
      req.transactions.buyLoadTransactionsRepository.findOne,
      'TRANS-2'
    );

    expect(
      req.app.dataDictionary.event_detail.result.provisioned_amount
    ).to.equal('');

    const updateArgs = req.paymentService.updateOnBuyLoad.firstCall.args;
    expect(updateArgs[0]).to.equal(req);
    expect(updateArgs[1]).to.equal('SUCCESS');
    expect(updateArgs[2]).to.equal('AMAX-TX-4');
  });
});
