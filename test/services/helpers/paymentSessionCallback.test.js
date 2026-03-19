import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Decimal from 'decimal.js';
import esmock from 'esmock';
import sinon from 'sinon';
import { buildMockPaymentEntity } from '../../mocks/paymentSessionCallbackMocks.js';

const lab = Lab.script();
const { describe, it, afterEach, before } = lab;
export { lab };

const DEFAULT_MIGRATED_LAMBDAS = [
  'PaymentStatusCallback',
  'PaymentSendEmail',
  'ProcessCSPayment',
  'BuyLoad',
  'PurchasePromo',
  'CreatePromoVouchers',
  'ECPayProcessTransaction',
  'PrepaidFiberServiceOrders',
  'PrepaidFiberRepairOrders',
  'CreatePolicy',
];

const buildLambdaConfig = ({ migratedLambdas } = {}) => ({
  migratedLambdas,
  paymentStatusCallback: { name: 'PaymentStatusCallback' },
  paymentSendEmail: { name: 'PaymentSendEmail' },
  processCSPayment: { name: 'ProcessCSPayment' },
  buyLoad: { name: 'BuyLoad' },
  purchasePromo: { name: 'PurchasePromo' },
  createPromoVouchers: { name: 'CreatePromoVouchers' },
  ecPayProcessTransaction: { name: 'ECPayProcessTransaction' },
  prepaidFiberServiceOrders: { name: 'PrepaidFiberServiceOrders' },
  prepaidFiberRepairOrders: { name: 'PrepaidFiberRepairOrders' },
  createPolicy: { name: 'CreatePolicy' },
});

const loadPaymentSessionCallbackHelper = async (
  { migratedLambdas = DEFAULT_MIGRATED_LAMBDAS } = {
    migratedLambdas: DEFAULT_MIGRATED_LAMBDAS,
  }
) => {
  return esmock('../../../src/services/helpers/paymentSessionCallback.js', {
    '../../../convict/config.js': {
      config: {
        get: (key) => {
          if (key !== 'lambda') {
            throw new Error(`Unexpected config.get('${key}') call in test`);
          }

          return buildLambdaConfig({ migratedLambdas });
        },
      },
    },
  });
};

const loadPaymentSessionCallbackWithClassificationSpies = async (
  classificationSpies,
  { migratedLambdas = DEFAULT_MIGRATED_LAMBDAS } = {
    migratedLambdas: DEFAULT_MIGRATED_LAMBDAS,
  }
) => {
  return esmock('../../../src/services/helpers/paymentSessionCallback.js', {
    '../../../convict/config.js': {
      config: {
        get: (key) => {
          if (key !== 'lambda') {
            throw new Error(`Unexpected config.get('${key}') call in test`);
          }

          return buildLambdaConfig({ migratedLambdas });
        },
      },
    },
    '../../../src/util/index.js': {
      callbackClassificationUtil: classificationSpies,
      callbackUtil: {},
      constants: {},
      stringUtil: {},
    },
  });
};

let paymentSessionCallback;

before(async () => {
  paymentSessionCallback = await loadPaymentSessionCallbackHelper();
});

const buildReq = ({ payload, appCxsOverrides = {} } = {}) => {
  const notificationPayload =
    payload?.notification?.payload || payload?.payload?.notification?.payload;

  const paymentId =
    payload?.notification?.paymentId ||
    payload?.payload?.notification?.paymentId ||
    notificationPayload?.paymentId ||
    'PAYMENT_ID_1';

  return {
    payload: {
      notification: {
        name:
          payload?.notification?.name || payload?.payload?.notification?.name,
        paymentId,
        payload: {
          paymentMethods: [],
          storedPaymentMethods: [],
          actions: [],
          paymentId,
          ...notificationPayload,
        },
      },
    },

    app: {
      cxs: {
        accountsForCSPayment: [],
        accountsForBuyLoad: [],
        accountsForECPay: [],
        accountsForBuyPromo: [],
        accountsForBuyVoucher: [],
        volumeBoostPayload: [],
        accountsPrepaidFiberService: [],
        accountsPrepaidFiberRepair: [],
        accountsForCreatePolicy: [],
        accountsForBuyRoaming: [],
        isECPayTransaction: false,
        ...appCxsOverrides,
      },
    },

    mongo: {
      customerPaymentsRepository: {
        create: sinon.stub().resolves(),
      },
      ecpayTransactionRepository: {
        create: sinon.stub().resolves(),
      },
    },

    processCallbackService: {
      handleErrorPayload: sinon.stub(),
      handlePaymentStatusCallback: sinon.stub(),
    },

    serviceHelpers: {
      lambdaService: {
        paymentStatusCallbackLambda: sinon.stub().resolves(),
        paymentSendEmailLambda: sinon.stub().resolves(),
        processCSPaymentLambda: sinon.stub().resolves(),
        buyLoadLambda: sinon.stub().resolves(),
        purchasePromoLambda: sinon.stub().resolves(),
        createPromoVouchersLambda: sinon.stub().resolves(),
        ecPayProcessTransactionLambda: sinon.stub().resolves(),
        prepaidFiberServiceOrdersLambda: sinon.stub().resolves(),
        prepaidFiberRepairOrdersLambda: sinon.stub().resolves(),
        createPolicyLambda: sinon.stub().resolves(),
      },
      paymentSessionCallback: {
        setPaymentStatus: sinon.stub().resolves(),
        tiggerGlobeCallback: sinon.stub().resolves(),
        sendPaymentNotificationEmail: sinon.stub().resolves(),
        resolveDropinStatus: sinon.stub().resolves(false),

        processCSPayment: sinon.stub(),
        processBuyLoad: sinon.stub(),
        processPurchasePromo: sinon.stub(),
        processBuyVoucher: sinon.stub(),
        processVolumeBoost: sinon.stub(),
        processECPay: sinon.stub(),
        processPrepaidFiberServiceOrders: sinon.stub(),
        processPrepaidFiberRepairOrders: sinon.stub(),
        processCreatePolicy: sinon.stub(),
        processBuyRoaming: sinon.stub(),
      },
    },

    invokeLambda: sinon.stub().resolves(),
  };
};

describe('Repositroy :: paymentSessionCallback :: processBuyRoaming', () => {
  afterEach(() => sinon.restore());

  it('when isV1=false: invokes async for each account', () => {
    const req = buildReq({
      appCxsOverrides: {
        accountsForBuyRoaming: [{ a: 1 }, { a: 2 }],
      },
    });

    req.cxs = {
      productOrderingRepository: {
        buyRoamingAsync: sinon.spy(),
      },
    };

    paymentSessionCallback.processBuyRoaming(req, false);

    expect(
      req.cxs.productOrderingRepository.buyRoamingAsync.callCount
    ).to.equal(2);
  });

  it('when isV1=true: invokes async only for first account', () => {
    const req = buildReq({
      appCxsOverrides: {
        accountsForBuyRoaming: [{ a: 1 }, { a: 2 }],
      },
    });

    req.cxs = {
      productOrderingRepository: {
        buyRoamingAsync: sinon.spy(),
      },
    };

    paymentSessionCallback.processBuyRoaming(req, true);

    expect(
      req.cxs.productOrderingRepository.buyRoamingAsync.callCount
    ).to.equal(1);
    expect(
      req.cxs.productOrderingRepository.buyRoamingAsync.firstCall.args[1]
    ).to.equal({
      a: 1,
    });
  });
});

describe('Repositroy :: paymentSessionCallback :: setPaymentStatus', () => {
  afterEach(() => sinon.restore());

  it('sets status and fills empty statusRemarks without processing classifications when toProcess is false', async () => {
    const paymentDetails = buildMockPaymentEntity('BuyLoad');

    // add a second settlement without statusRemarks so it gets populated
    paymentDetails.settlementDetails.push({
      accountNumber: 'ACC2',
      transactions: [],
    });

    const req = buildReq();

    const status = 'FAILED';
    const refusalReason = 'Some refusal reason';

    const classificationSpies = {
      classifyByRequestType: sinon.spy(),
      classifyNonTransactionalRequests: sinon.spy(),
      classifyRequestForGFP: sinon.spy(),
      classifyRequestForChangeSim: sinon.spy(),
    };

    const paymentSessionCallbackWithSpies =
      await loadPaymentSessionCallbackWithClassificationSpies(
        classificationSpies
      );

    await paymentSessionCallbackWithSpies.setPaymentStatus(
      status,
      refusalReason,
      'description',
      'errorCode',
      paymentDetails,
      false,
      req
    );

    expect(paymentDetails.settlementDetails[0].status).to.equal(status);
    expect(paymentDetails.settlementDetails[1].status).to.equal(status);

    // first settlement had remarks from mock, so should keep original
    expect(paymentDetails.settlementDetails[0].statusRemarks).to.equal(
      'remarks'
    );
    // second had no remarks, should be filled with refusalReason
    expect(paymentDetails.settlementDetails[1].statusRemarks).to.equal(
      refusalReason
    );

    expect(classificationSpies.classifyByRequestType.called).to.equal(false);
    expect(
      classificationSpies.classifyNonTransactionalRequests.called
    ).to.equal(false);
    expect(classificationSpies.classifyRequestForGFP.called).to.equal(false);
    expect(classificationSpies.classifyRequestForChangeSim.called).to.equal(
      false
    );
  });

  it('when settlement has transactions: calls classifyByRequestType and classifyRequestForChangeSim', async () => {
    const paymentDetails = buildMockPaymentEntity('BuyLoad_Txn', {
      channelId: 'CH1',
      paymentType: 'GCASH',
    });

    const req = buildReq();

    const classificationSpies = {
      classifyByRequestType: sinon.spy(),
      classifyNonTransactionalRequests: sinon.spy(),
      classifyRequestForGFP: sinon.spy(),
      classifyRequestForChangeSim: sinon.spy(),
    };

    const paymentSessionCallbackWithSpies =
      await loadPaymentSessionCallbackWithClassificationSpies(
        classificationSpies
      );

    await paymentSessionCallbackWithSpies.setPaymentStatus(
      'SUCCESS',
      'Reason',
      'description',
      'errorCode',
      paymentDetails,
      true,
      req
    );

    expect(classificationSpies.classifyByRequestType.calledOnce).to.equal(true);
    const settlement = paymentDetails.settlementDetails[0];
    expect(classificationSpies.classifyByRequestType.firstCall.args).to.equal([
      paymentDetails.tokenPaymentId,
      settlement,
      req,
      'CH1',
      'GCASH',
    ]);

    expect(
      classificationSpies.classifyNonTransactionalRequests.called
    ).to.equal(false);

    expect(classificationSpies.classifyRequestForChangeSim.calledOnce).to.equal(
      true
    );
    expect(
      classificationSpies.classifyRequestForChangeSim.firstCall.args
    ).to.equal([settlement, paymentDetails, req]);
  });

  it('when settlement has no transactions: calls classifyNonTransactionalRequests and classifyRequestForChangeSim', async () => {
    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      channelId: 'CH2',
      paymentType: 'GCASH',
    });

    // force transactions to be empty to hit non-transactional path
    paymentDetails.settlementDetails[0].transactions = [];

    const req = buildReq();

    const classificationSpies = {
      classifyByRequestType: sinon.spy(),
      classifyNonTransactionalRequests: sinon.spy(),
      classifyRequestForGFP: sinon.spy(),
      classifyRequestForChangeSim: sinon.spy(),
    };

    const paymentSessionCallbackWithSpies =
      await loadPaymentSessionCallbackWithClassificationSpies(
        classificationSpies
      );

    await paymentSessionCallbackWithSpies.setPaymentStatus(
      'SUCCESS',
      'Reason',
      'description',
      'errorCode',
      paymentDetails,
      true,
      req
    );

    expect(classificationSpies.classifyByRequestType.called).to.equal(false);

    const settlement = paymentDetails.settlementDetails[0];
    expect(
      classificationSpies.classifyNonTransactionalRequests.calledOnce
    ).to.equal(true);
    expect(
      classificationSpies.classifyNonTransactionalRequests.firstCall.args
    ).to.equal([paymentDetails.tokenPaymentId, settlement, req]);

    expect(classificationSpies.classifyRequestForChangeSim.calledOnce).to.equal(
      true
    );
    expect(
      classificationSpies.classifyRequestForChangeSim.firstCall.args
    ).to.equal([settlement, paymentDetails, req]);
  });

  it('when settlement has createOrderExternal: additionally calls classifyRequestForGFP', async () => {
    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      channelId: 'CH3',
      paymentType: 'GCASH',
    });

    // non-transactional settlement with GFP flag
    paymentDetails.settlementDetails[0].transactions = [];
    paymentDetails.settlementDetails[0].createOrderExternal = true;

    const req = buildReq();

    const classificationSpies = {
      classifyByRequestType: sinon.spy(),
      classifyNonTransactionalRequests: sinon.spy(),
      classifyRequestForGFP: sinon.spy(),
      classifyRequestForChangeSim: sinon.spy(),
    };

    const paymentSessionCallbackWithSpies =
      await loadPaymentSessionCallbackWithClassificationSpies(
        classificationSpies
      );

    await paymentSessionCallbackWithSpies.setPaymentStatus(
      'SUCCESS',
      'Reason',
      'description',
      'errorCode',
      paymentDetails,
      true,
      req
    );

    const settlement = paymentDetails.settlementDetails[0];

    expect(
      classificationSpies.classifyNonTransactionalRequests.calledOnce
    ).to.equal(true);
    expect(classificationSpies.classifyRequestForGFP.calledOnce).to.equal(true);
    expect(classificationSpies.classifyRequestForGFP.firstCall.args).to.equal([
      settlement,
      paymentDetails.tokenPaymentId,
      req,
    ]);

    expect(classificationSpies.classifyRequestForChangeSim.calledOnce).to.equal(
      true
    );
  });
});

describe('Repositroy :: paymentSessionCallback :: processCreatePolicy', () => {
  afterEach(() => sinon.restore());

  it('adds chargedAmount to each successAmount when budgetProtectProfile exists, then invokes createPolicyAsync', () => {
    const req = buildReq({
      appCxsOverrides: {
        accountsForCreatePolicy: [{ successAmount: 10 }, { successAmount: 20 }],
      },
    });

    req.cxs = {
      productOrderingRepository: {
        createPolicyAsync: sinon.spy(),
      },
    };

    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'GCASH',
      budgetProtectProfile: { chargeAmount: '2.5' },
    });

    paymentSessionCallback.processCreatePolicy(paymentDetails, req);

    expect(req.app.cxs.accountsForCreatePolicy[0].successAmount).to.equal(
      new Decimal(10).add(new Decimal('2.5')).toNumber()
    );
    expect(req.app.cxs.accountsForCreatePolicy[1].successAmount).to.equal(
      new Decimal(20).add(new Decimal('2.5')).toNumber()
    );

    expect(
      req.cxs.productOrderingRepository.createPolicyAsync.callCount
    ).to.equal(2);
  });

  it('does not modify amounts when budgetProtectProfile is missing', () => {
    const req = buildReq({
      appCxsOverrides: {
        accountsForCreatePolicy: [{ successAmount: 10 }, { successAmount: 20 }],
      },
    });

    req.cxs = {
      productOrderingRepository: {
        createPolicyAsync: sinon.spy(),
      },
    };

    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'GCASH',
      budgetProtectProfile: null,
    });

    paymentSessionCallback.processCreatePolicy(paymentDetails, req);

    expect(req.app.cxs.accountsForCreatePolicy[0].successAmount).to.equal(10);
    expect(req.app.cxs.accountsForCreatePolicy[1].successAmount).to.equal(20);

    expect(
      req.cxs.productOrderingRepository.createPolicyAsync.callCount
    ).to.equal(2);
  });
});

describe('Repositroy :: paymentSessionCallback :: processCSPayment', () => {
  it('invokes async per account', () => {
    const req = buildReq({
      appCxsOverrides: { accountsForCSPayment: [{}, {}] },
    });
    req.cxs = {
      paymentManagementRepository: { processCSPaymentAsync: sinon.spy() },
    };
    paymentSessionCallback.processCSPayment(req);
    expect(
      req.cxs.paymentManagementRepository.processCSPaymentAsync.callCount
    ).to.equal(2);
  });
});

describe('Repositroy :: paymentSessionCallback :: processBuyLoad', () => {
  it('invokes async per account', () => {
    const req = buildReq({ appCxsOverrides: { accountsForBuyLoad: [{}, {}] } });
    req.cxs = { paymentManagementRepository: { buyLoadAsync: sinon.spy() } };
    paymentSessionCallback.processBuyLoad(req);
    expect(req.cxs.paymentManagementRepository.buyLoadAsync.callCount).to.equal(
      2
    );
  });
});

describe('Repositroy :: paymentSessionCallback :: processPrepaidFiberRepairOrders', () => {
  afterEach(() => sinon.restore());

  it('invokes prepaidFiberRepairOrderAsync for each repair order', () => {
    const req = buildReq({
      appCxsOverrides: {
        accountsPrepaidFiberRepair: [{ id: 1 }, { id: 2 }],
      },
    });

    req.cxs = {
      workforceManagementRepository: {
        prepaidFiberRepairOrderAsync: sinon.spy(),
      },
    };

    paymentSessionCallback.processPrepaidFiberRepairOrders(req);

    expect(
      req.cxs.workforceManagementRepository.prepaidFiberRepairOrderAsync
        .callCount
    ).to.equal(2);

    expect(
      req.cxs.workforceManagementRepository.prepaidFiberRepairOrderAsync
        .firstCall.args[1]
    ).to.equal({ id: 1 });
  });
});

describe('Repositroy :: paymentSessionCallback :: processPrepaidFiberServiceOrders', () => {
  afterEach(() => sinon.restore());

  it('invokes prepaidFiberServiceOrderAsync for each service order', () => {
    const req = buildReq({
      appCxsOverrides: {
        accountsPrepaidFiberService: [{ id: 1 }, { id: 2 }],
      },
    });

    req.cxs = {
      serviceOrderingRepository: {
        prepaidFiberServiceOrderAsync: sinon.spy(),
      },
    };

    paymentSessionCallback.processPrepaidFiberServiceOrders(req);

    expect(
      req.cxs.serviceOrderingRepository.prepaidFiberServiceOrderAsync.callCount
    ).to.equal(2);

    expect(
      req.cxs.serviceOrderingRepository.prepaidFiberServiceOrderAsync.firstCall
        .args[1]
    ).to.equal({ id: 1 });
  });
});

describe('Repositroy :: paymentSessionCallback :: processECPay', () => {
  afterEach(() => sinon.restore());

  it('invokes ecPayAsync for each ECPay payload entry', () => {
    const req = buildReq({
      appCxsOverrides: {
        ecPayPayload: [{ id: 1 }, { id: 2 }],
      },
    });

    req.cxs = {
      ecpayRepository: {
        ecPayAsync: sinon.spy(),
      },
    };

    paymentSessionCallback.processECPay(req);

    expect(req.cxs.ecpayRepository.ecPayAsync.callCount).to.equal(2);

    expect(req.cxs.ecpayRepository.ecPayAsync.firstCall.args[1]).to.equal({
      id: 1,
    });
  });
});

describe('Repositroy :: paymentSessionCallback :: processVolumeBoost', () => {
  afterEach(() => sinon.restore());

  it('invokes volumeBoostAsync for each volume boost payload', () => {
    const req = buildReq({
      appCxsOverrides: {
        volumeBoostPayload: [{ id: 1 }, { id: 2 }],
      },
    });

    req.cxs = {
      productOrderingRepository: {
        volumeBoostAsync: sinon.spy(),
      },
    };

    paymentSessionCallback.processVolumeBoost(req);

    expect(
      req.cxs.productOrderingRepository.volumeBoostAsync.callCount
    ).to.equal(2);

    expect(
      req.cxs.productOrderingRepository.volumeBoostAsync.firstCall.args[1]
    ).to.equal({ id: 1 });
  });
});

describe('Repositroy :: paymentSessionCallback :: processPurchasePromo', () => {
  afterEach(() => sinon.restore());

  it('invokes purchasePromoAsync for each promo account', () => {
    const req = buildReq({
      appCxsOverrides: {
        accountsForBuyPromo: [{ id: 1 }, { id: 2 }],
      },
    });

    req.cxs = {
      productOrderingRepository: {
        purchasePromoAsync: sinon.spy(),
      },
    };

    paymentSessionCallback.processPurchasePromo(req);

    expect(
      req.cxs.productOrderingRepository.purchasePromoAsync.callCount
    ).to.equal(2);

    expect(
      req.cxs.productOrderingRepository.purchasePromoAsync.firstCall.args[1]
    ).to.equal({ id: 1 });
  });
});

describe('Repositroy :: paymentSessionCallback :: processBuyVoucher', () => {
  afterEach(() => sinon.restore());

  it('invokes processBuyVoucherAsync for each voucher account', () => {
    const req = buildReq({
      appCxsOverrides: {
        accountsForBuyVoucher: [{ id: 1 }, { id: 2 }],
      },
    });

    req.cxs = {
      paymentMethodsRepository: {
        processBuyVoucherAsync: sinon.spy(),
      },
    };

    paymentSessionCallback.processBuyVoucher(req);

    expect(
      req.cxs.paymentMethodsRepository.processBuyVoucherAsync.callCount
    ).to.equal(2);

    expect(
      req.cxs.paymentMethodsRepository.processBuyVoucherAsync.firstCall.args[1]
    ).to.equal({ id: 1 });
  });
});

describe('Repositroy :: paymentSessionCallback :: resolveDropinStatus', () => {
  afterEach(() => sinon.restore());

  it('returns false when paymentType is missing', async () => {
    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: null,
    });

    const req = buildReq();

    const result = await paymentSessionCallback.resolveDropinStatus(
      paymentDetails,
      req
    );

    expect(result).to.equal(false);
  });

  it('returns false when paymentType is not DROPIN', async () => {
    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'GCASH',
    });

    const req = buildReq();

    const result = await paymentSessionCallback.resolveDropinStatus(
      paymentDetails,
      req
    );

    expect(result).to.equal(false);
  });

  it('returns false when no settlementDetails exist', async () => {
    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'DROPIN',
      settlementDetails: [],
    });

    const req = buildReq();

    const result = await paymentSessionCallback.resolveDropinStatus(
      paymentDetails,
      req
    );

    expect(result).to.equal(false);
  });

  it('returns true when a transaction has provisionStatus SUCCESS and appStatus is not set', async () => {
    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'DROPIN',
      settlementDetails: [
        {
          transactions: [{ provisionStatus: 'SUCCESS' }],
        },
        {
          transactions: [],
        },
      ],
    });

    const req = buildReq();
    req.mongo.customerPaymentsRepository.create.resetHistory();

    const result = await paymentSessionCallback.resolveDropinStatus(
      paymentDetails,
      req
    );

    expect(result).to.equal(true);

    expect(paymentDetails.settlementDetails[0].appStatus).to.equal('SUCCESS');
    expect(paymentDetails.settlementDetails[1].appStatus).to.equal('SUCCESS');

    expect(req.mongo.customerPaymentsRepository.create.calledOnce).to.equal(
      true
    );
  });

  it('returns true when first settlement appStatus is already SUCCESS', async () => {
    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'DROPIN',
      settlementDetails: [
        {
          transactions: [],
          appStatus: 'SUCCESS',
        },
      ],
    });

    const req = buildReq();
    req.mongo.customerPaymentsRepository.create.resetHistory();

    const result = await paymentSessionCallback.resolveDropinStatus(
      paymentDetails,
      req
    );

    expect(result).to.equal(true);
    expect(req.mongo.customerPaymentsRepository.create.called).to.equal(false);
  });

  it('updates appStatus from PROCESSING to SUCCESS and persists, then returns false', async () => {
    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'DROPIN',
      settlementDetails: [
        {
          transactions: [],
          appStatus: 'PROCESSING',
        },
        {
          transactions: [],
        },
      ],
    });

    const req = buildReq();
    req.mongo.customerPaymentsRepository.create.resetHistory();

    const result = await paymentSessionCallback.resolveDropinStatus(
      paymentDetails,
      req
    );

    expect(result).to.equal(false);

    expect(paymentDetails.settlementDetails[0].appStatus).to.equal('SUCCESS');
    expect(paymentDetails.settlementDetails[1].appStatus).to.equal('SUCCESS');

    expect(req.mongo.customerPaymentsRepository.create.calledOnce).to.equal(
      true
    );
  });

  it('persists and returns false when appStatus is neither SUCCESS nor PROCESSING', async () => {
    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'DROPIN',
      settlementDetails: [
        {
          transactions: [],
          appStatus: 'FAILED',
        },
      ],
    });

    const req = buildReq();
    req.mongo.customerPaymentsRepository.create.resetHistory();

    const result = await paymentSessionCallback.resolveDropinStatus(
      paymentDetails,
      req
    );

    expect(result).to.equal(false);
    expect(req.mongo.customerPaymentsRepository.create.calledOnce).to.equal(
      true
    );
  });
});

describe('Repositroy :: paymentSessionCallback :: sendPaymentNotificationEmail', () => {
  afterEach(() => sinon.restore());

  it('does not send email when requestType is missing', async () => {
    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'GCASH',
      settlementDetails: [{}],
    });

    const req = buildReq();
    req.cxs = {
      communcationsRepository: {
        sendPaymentsEmailAsync: sinon.spy(),
      },
    };

    await paymentSessionCallback.sendPaymentNotificationEmail(
      paymentDetails,
      req
    );

    expect(
      req.cxs.communcationsRepository.sendPaymentsEmailAsync.called
    ).to.equal(false);
  });

  it('does not send email when requestType is not an ESIM request', async () => {
    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'GCASH',
      settlementDetails: [{ requestType: 'BuyLoad' }],
    });

    const req = buildReq();
    req.cxs = {
      communcationsRepository: {
        sendPaymentsEmailAsync: sinon.spy(),
      },
    };

    await paymentSessionCallback.sendPaymentNotificationEmail(
      paymentDetails,
      req
    );

    expect(
      req.cxs.communcationsRepository.sendPaymentsEmailAsync.called
    ).to.equal(false);
  });

  it('sends email when requestType is ESIM and true-client-ip header is present', async () => {
    const paymentDetails = buildMockPaymentEntity('BuyESIM', {
      paymentType: 'GCASH',
      settlementDetails: [{ requestType: 'BuyESIM' }],
    });

    const req = buildReq();
    req.headers = {
      'true-client-ip': '1.1.1.1',
    };

    req.cxs = {
      communcationsRepository: {
        sendPaymentsEmailAsync: sinon.spy(),
      },
    };

    await paymentSessionCallback.sendPaymentNotificationEmail(
      paymentDetails,
      req
    );

    expect(
      req.cxs.communcationsRepository.sendPaymentsEmailAsync.calledOnce
    ).to.equal(true);

    const payload =
      req.cxs.communcationsRepository.sendPaymentsEmailAsync.firstCall.args[1];

    expect(payload).to.equal({
      tokenPaymentId: req.payload.notification.payload.paymentId,
      ipAddress: '1.1.1.1',
    });
  });

  it('uses cf-connecting-ip when true-client-ip is missing', async () => {
    const paymentDetails = buildMockPaymentEntity('BuyESIM', {
      paymentType: 'GCASH',
      settlementDetails: [{ requestType: 'BuyESIM' }],
    });

    const req = buildReq();
    req.headers = {
      'cf-connecting-ip': '2.2.2.2',
    };

    req.cxs = {
      communcationsRepository: {
        sendPaymentsEmailAsync: sinon.spy(),
      },
    };

    await paymentSessionCallback.sendPaymentNotificationEmail(
      paymentDetails,
      req
    );

    const payload =
      req.cxs.communcationsRepository.sendPaymentsEmailAsync.firstCall.args[1];

    expect(payload.ipAddress).to.equal('2.2.2.2');
  });

  it('uses first IP when x-forwarded-for contains multiple IPs', async () => {
    const paymentDetails = buildMockPaymentEntity('BuyESIM', {
      paymentType: 'GCASH',
      settlementDetails: [{ requestType: 'BuyESIM' }],
    });

    const req = buildReq();
    req.headers = {
      'x-forwarded-for': '3.3.3.3, 4.4.4.4',
    };

    req.cxs = {
      communcationsRepository: {
        sendPaymentsEmailAsync: sinon.spy(),
      },
    };

    await paymentSessionCallback.sendPaymentNotificationEmail(
      paymentDetails,
      req
    );

    const payload =
      req.cxs.communcationsRepository.sendPaymentsEmailAsync.firstCall.args[1];

    expect(payload.ipAddress).to.equal('3.3.3.3');
  });

  it('sets ipAddress as null when no IP headers are present', async () => {
    const paymentDetails = buildMockPaymentEntity('BuyESIM', {
      paymentType: 'GCASH',
      settlementDetails: [{ requestType: 'BuyESIM' }],
    });

    const req = buildReq();
    req.headers = {};

    req.cxs = {
      communcationsRepository: {
        sendPaymentsEmailAsync: sinon.spy(),
      },
    };

    await paymentSessionCallback.sendPaymentNotificationEmail(
      paymentDetails,
      req
    );

    const payload =
      req.cxs.communcationsRepository.sendPaymentsEmailAsync.firstCall.args[1];

    expect(payload.ipAddress).to.equal(null);
  });

  it('when lambda is NOT migrated: invokes AWS lambdaService.paymentSendEmailLambda', async () => {
    const paymentSessionCallbackNonMigrated =
      await loadPaymentSessionCallbackHelper({
        migratedLambdas: [],
      });

    const paymentDetails = buildMockPaymentEntity('BuyESIM', {
      paymentType: 'GCASH',
      settlementDetails: [{ requestType: 'BuyESIM' }],
    });

    const req = buildReq({
      payload: {
        notification: {
          payload: {
            paymentId: 'PAYID_123',
          },
        },
      },
    });
    req.headers = { 'true-client-ip': '1.1.1.1' };

    req.cxs = {
      communcationsRepository: {
        sendPaymentsEmailAsync: sinon.spy(),
      },
    };

    await paymentSessionCallbackNonMigrated.sendPaymentNotificationEmail(
      paymentDetails,
      req
    );

    expect(
      req.serviceHelpers.lambdaService.paymentSendEmailLambda.calledOnce
    ).to.equal(true);
    expect(
      req.cxs.communcationsRepository.sendPaymentsEmailAsync.called
    ).to.equal(false);

    const lambdaArgs =
      req.serviceHelpers.lambdaService.paymentSendEmailLambda.firstCall.args[0];
    expect(lambdaArgs.payload).to.equal({
      tokenPaymentId: 'PAYID_123',
      ipAddress: '1.1.1.1',
    });
  });
});

describe('Repositroy :: paymentSessionCallback :: triggerGlobeCallback', () => {
  afterEach(() => sinon.restore());

  it('returns early when tokenPaymentId prefix is NOT GOR or GLE', async () => {
    const req = buildReq();

    req.payload.notification.payload.paymentId = 'ABC123';

    req.cxs = {
      paymentManagementRepository: {
        paymentStatusCallbackAsync: sinon.spy(),
      },
    };

    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'GCASH',
      channelId: 'CH1',
    });

    await paymentSessionCallback.triggerGlobeCallback(paymentDetails, req);

    expect(
      req.cxs.paymentManagementRepository.paymentStatusCallbackAsync.called
    ).to.equal(false);
  });

  it('invokes globe callback for non-CARD payment when prefix is GOR', async () => {
    const req = buildReq();
    req.payload.notification.payload.paymentId = 'GOR123456';

    req.cxs = {
      paymentManagementRepository: {
        paymentStatusCallbackAsync: sinon.spy(),
      },
    };

    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'GCASH',
      channelId: 'CH1',
    });

    await paymentSessionCallback.triggerGlobeCallback(paymentDetails, req);

    expect(
      req.cxs.paymentManagementRepository.paymentStatusCallbackAsync.calledOnce
    ).to.equal(true);

    const args =
      req.cxs.paymentManagementRepository.paymentStatusCallbackAsync.firstCall
        .args;

    expect(args[0]).to.equal(req);
  });

  it('invokes globe callback for non-CARD payment when prefix is GLE', async () => {
    const req = buildReq();
    req.payload.notification.payload.paymentId = 'GLE987654';

    req.cxs = {
      paymentManagementRepository: {
        paymentStatusCallbackAsync: sinon.spy(),
      },
    };

    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'GCASH',
      channelId: 'CH9',
    });

    await paymentSessionCallback.triggerGlobeCallback(paymentDetails, req);

    expect(
      req.cxs.paymentManagementRepository.paymentStatusCallbackAsync.calledOnce
    ).to.equal(true);
  });

  it('throws when underlying logic throws', async () => {
    const req = buildReq();
    req.payload.notification.payload.paymentId = 'GOR000000';

    req.cxs = null;

    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'GCASH',
      channelId: 'CH1',
    });

    try {
      await paymentSessionCallback.triggerGlobeCallback(paymentDetails, req);
    } catch (err) {
      expect(err).to.be.instanceOf(Error);
    }
  });

  it('when lambda is NOT migrated: invokes AWS lambdaService.paymentStatusCallbackLambda for non-CARD', async () => {
    const paymentSessionCallbackNonMigrated =
      await loadPaymentSessionCallbackHelper({
        migratedLambdas: [],
      });

    const req = buildReq({
      payload: {
        notification: {
          paymentId: 'GOR123456',
          payload: {
            paymentId: 'GOR123456',
            accounts: [{ accountNumber: '123', status: 'SUCCESS' }],
          },
        },
      },
    });

    req.cxs = {
      paymentManagementRepository: {
        paymentStatusCallbackAsync: sinon.spy(),
      },
    };

    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'GCASH',
      channelId: 'CH1',
    });

    await paymentSessionCallbackNonMigrated.triggerGlobeCallback(
      paymentDetails,
      req
    );

    expect(
      req.serviceHelpers.lambdaService.paymentStatusCallbackLambda.calledOnce
    ).to.equal(true);
    expect(
      req.cxs.paymentManagementRepository.paymentStatusCallbackAsync.called
    ).to.equal(false);
  });

  it('when paymentType is CARD and lambda is migrated: uses CARD transformer payload and invokes GCP repo', async () => {
    const paymentSessionCallbackMigrated =
      await loadPaymentSessionCallbackHelper({
        migratedLambdas: DEFAULT_MIGRATED_LAMBDAS,
      });

    const req = buildReq({
      payload: {
        notification: {
          paymentId: 'GOR123456',
          payload: {
            paymentId: 'GOR123456',
            status: 'SUCCESS',
          },
        },
      },
    });

    req.cxs = {
      paymentManagementRepository: {
        paymentStatusCallbackAsync: sinon.spy(),
      },
    };

    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'CARD',
      channelId: 'CH1',
      settlementDetails: [
        { accountNumber: 'ACC1', transactions: [] },
        { mobileNumber: '0917', transactions: [] },
      ],
    });

    await paymentSessionCallbackMigrated.triggerGlobeCallback(
      paymentDetails,
      req
    );

    expect(
      req.cxs.paymentManagementRepository.paymentStatusCallbackAsync.calledOnce
    ).to.equal(true);

    const payload =
      req.cxs.paymentManagementRepository.paymentStatusCallbackAsync.firstCall
        .args[1];

    expect(payload.tokenPaymentId).to.equal('GOR123456');
    expect(payload.paymentAccounts).to.equal([
      { accountNumber: 'ACC1', paymentStatus: 'SUCCESS' },
      { accountNumber: '0917', paymentStatus: 'SUCCESS' },
    ]);
  });
});
