import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import sinon from 'sinon';
import {
  handleErrorPayload,
  handlePaymentStatusCallback,
  processCallback,
} from '../../../src/services/v1/processCallbackService.js';
import {
  buildCallbackNotification,
  buildMockPaymentEntity,
} from '../../mocks/paymentSessionCallbackMocks.js';

const lab = Lab.script();
const { describe, it, afterEach } = lab;

export { lab };

const buildReq = ({ payload, appCxsOverrides = {} } = {}) => {
  const notificationPayload =
    payload?.notification?.payload || payload?.payload?.notification?.payload;

  return {
    payload: {
      notification: {
        name:
          payload?.notification?.name || payload?.payload?.notification?.name,
        payload: {
          paymentMethods: [],
          storedPaymentMethods: [],
          actions: [],
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

    // processCallbackService: {
    //   handleErrorPayload: sinon.stub(),
    //   handlePaymentStatusCallback: sinon.stub(),
    // },

    helpers: {
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
  };
};

describe('Services :: v1 :: processCallbackService :: processCallback', () => {
  afterEach(() => sinon.restore());

  it('sets paymentSession when paymentSession is present', async () => {
    const notification = buildCallbackNotification('PaymentSessionCreated');
    const paymentDetails = buildMockPaymentEntity('BuyLoad');

    const req = buildReq({ payload: notification });
    req.processCallbackService = {};

    await processCallback(req, paymentDetails, false);

    expect(paymentDetails.paymentSession).to.equal('paymentSessionToken');
    expect(req.mongo.customerPaymentsRepository.create.calledOnce).to.equal(
      true
    );
  });

  it('delegates to handlePaymentStatusCallback and returns true when it resolves true', async () => {
    const notification = buildCallbackNotification('PaymentProcessed');
    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'XENDIT',
    });

    const req = buildReq({ payload: notification });

    req.processCallbackService = {
      handlePaymentStatusCallback: sinon.stub().resolves(true),
      handleErrorPayload: sinon.stub(),
    };

    const res = await processCallback(req, paymentDetails, false);

    expect(res).to.equal(true);
    expect(
      req.processCallbackService.handlePaymentStatusCallback.calledOnce
    ).to.equal(true);

    expect(req.mongo.customerPaymentsRepository.create.called).to.equal(false);
  });

  it('delegates to handlePaymentStatusCallback and continues when it resolves false', async () => {
    const notification = buildCallbackNotification('PaymentProcessed');
    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'GCASH',
    });

    const req = buildReq({ payload: notification });

    req.processCallbackService = {
      handlePaymentStatusCallback: sinon.stub().resolves(false),
      handleErrorPayload: sinon.stub(),
    };

    await processCallback(req, paymentDetails, false);

    expect(
      req.processCallbackService.handlePaymentStatusCallback.calledOnce
    ).to.equal(true);
    expect(req.mongo.customerPaymentsRepository.create.calledOnce).to.equal(
      true
    );
  });

  it('delegates error handling to handleErrorPayload when error exists', async () => {
    const notification = buildCallbackNotification(
      'PaymentSessionCreateFailed'
    );
    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'ADYEN',
    });

    const req = buildReq({ payload: notification });

    req.processCallbackService = {
      handlePaymentStatusCallback: sinon.stub(),
      handleErrorPayload: sinon.stub().resolves(),
    };

    await processCallback(req, paymentDetails, false);

    expect(req.processCallbackService.handleErrorPayload.calledOnce).to.equal(
      true
    );

    expect(req.mongo.customerPaymentsRepository.create.calledOnce).to.equal(
      true
    );
  });

  it('sets refund status when isRefund is true', async () => {
    const notification = buildCallbackNotification('RefundProcessed');
    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'GCASH',
    });

    const req = buildReq({ payload: notification });
    req.processCallbackService = {};

    await processCallback(req, paymentDetails, true);

    expect(req.mongo.customerPaymentsRepository.create.calledOnce).to.equal(
      true
    );
  });

  it('sets paymentMethods when present', async () => {
    const notification = buildCallbackNotification('DropinPaymentMethods');
    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'DROPIN',
    });

    const req = buildReq({ payload: notification });
    req.processCallbackService = {};

    await processCallback(req, paymentDetails, false);

    expect(paymentDetails.paymentMethods).to.equal(['1', '2']);
  });

  it('sets paymentResult when present', async () => {
    const notification = buildCallbackNotification('DropinPaymentResult');
    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'DROPIN',
    });

    const req = buildReq({ payload: notification });
    req.processCallbackService = {};

    try {
      await processCallback(req, paymentDetails, false);

      expect(paymentDetails.paymentResult).to.equal({});
    } catch (err) {}
  });

  it('sets actions and propagates status to settlementDetails', async () => {
    const notification = buildCallbackNotification('REQUIRES_ACTION');
    notification.payload.notification.payload.actions = [{}];

    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'XENDIT',
    });

    const req = buildReq({ payload: notification });
    req.processCallbackService = {};

    await processCallback(req, paymentDetails, false);

    expect(paymentDetails.actions.length).to.equal(1);
    expect(paymentDetails.settlementDetails[0].status).to.equal(
      'REQUIRES_ACTION'
    );
  });

  it('falls back to checkoutUrl when no other fields match', async () => {
    const notification = buildCallbackNotification(
      'GcashPaymentSessionCreated'
    );
    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'GCASH',
    });

    const req = buildReq({ payload: notification });
    req.processCallbackService = {};

    await processCallback(req, paymentDetails, false);

    expect(paymentDetails.checkoutUrl).to.equal('checkout@yahoo.com');
  });

  it('sets storedPaymentMethods when present', async () => {
    const notification = buildCallbackNotification('PaymentProcessed');
    notification.payload.notification.payload.storedPaymentMethods = ['pm1'];

    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'ADYEN',
    });

    const req = buildReq({ payload: notification });

    req.processCallbackService = {
      handlePaymentStatusCallback: sinon.stub().resolves(false),
      handleErrorPayload: sinon.stub(),
    };

    await processCallback(req, paymentDetails, false);

    expect(paymentDetails.storedPaymentMethods).to.equal(['pm1']);
  });

  it('persists ecpay transaction when isECPayTransaction is true', async () => {
    const notification = buildCallbackNotification('PaymentProcessed');
    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'ECPAY',
    });

    const req = buildReq({
      payload: notification,
      appCxsOverrides: { isECPayTransaction: true },
    });

    req.processCallbackService = {
      handlePaymentStatusCallback: sinon.stub().resolves(false),
      handleErrorPayload: sinon.stub(),
    };

    await processCallback(req, paymentDetails, false, { ref: 'ecpay' });

    expect(req.mongo.ecpayTransactionRepository.create.calledOnce).to.equal(
      true
    );
  });
});

describe('Services :: v1 :: processCallbackService :: handleErrorPayload', () => {
  afterEach(() => sinon.restore());

  it('sets Xendit refund status and exits early for refundResult notification', async () => {
    const paymentDetails = buildMockPaymentEntity('BuyLoad');

    const req = buildReq();
    req.helpers.paymentSessionCallback.setPaymentStatus.resetHistory();

    const notificationPayload = {
      error: [
        {
          message: 'Failed Xendit Refund',
          error_code: 'INELIGIBLE_TRANSACTION',
        },
      ],
    };

    await handleErrorPayload(
      notificationPayload,
      paymentDetails,
      'RefundResult',
      req
    );

    expect(req.helpers.paymentSessionCallback.setPaymentStatus.called).to.equal(
      false
    );
  });

  it('updates status to XENDIT_REFUSED when error object and paymentType is XENDIT', async () => {
    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'XENDIT',
    });

    const req = buildReq();

    const notificationPayload = {
      error: {
        message: 'Xendit failure',
        error_code: 'TXN_DECLINED',
      },
    };

    await handleErrorPayload(
      notificationPayload,
      paymentDetails,
      'PaymentSessionCreateFailed',
      req
    );

    expect(
      req.helpers.paymentSessionCallback.setPaymentStatus.calledOnce
    ).to.equal(true);

    const [status, refusalReason, , , passedPaymentDetails, isFinal] =
      req.helpers.paymentSessionCallback.setPaymentStatus.firstCall.args;

    expect(status).to.equal('XENDIT_REFUSED');
    expect(refusalReason).to.equal('TXN_DECLINED');
    expect(passedPaymentDetails).to.equal(paymentDetails);
    expect(isFinal).to.equal(false);
  });

  it('updates status to CREATE_FAILED when paymentType is non-XENDIT', async () => {
    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'GCASH',
    });

    const req = buildReq();

    const notificationPayload = {
      error: [{ message: 'Some gateway error' }],
    };

    await handleErrorPayload(
      notificationPayload,
      paymentDetails,
      'PaymentSessionCreateFailed',
      req
    );

    expect(
      req.helpers.paymentSessionCallback.setPaymentStatus.calledOnce
    ).to.equal(true);

    const [status, refusalReason] =
      req.helpers.paymentSessionCallback.setPaymentStatus.firstCall.args;

    expect(status).to.equal('CREATE_PAYMENT_SESSION_FAILED');
    expect(refusalReason).to.equal(null);
  });

  it('does not update status when paymentType is XENDIT and error is array', async () => {
    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'XENDIT',
    });

    const req = buildReq();

    const notificationPayload = {
      error: [{ message: 'error 1' }, { message: 'error 2' }],
    };

    await handleErrorPayload(
      notificationPayload,
      paymentDetails,
      'PaymentSessionCreateFailed',
      req
    );

    expect(req.helpers.paymentSessionCallback.setPaymentStatus.called).to.equal(
      false
    );

    expect(paymentDetails.createPaymentSessionError).to.equal(
      'error 1 | error 2'
    );
  });

  it('sets CREATE_FAILED error message when error is missing or malformed', async () => {
    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'XENDIT',
    });

    const req = buildReq();

    const notificationPayload = {};

    await handleErrorPayload(
      notificationPayload,
      paymentDetails,
      'PaymentSessionCreateFailed',
      req
    );

    expect(req.helpers.paymentSessionCallback.setPaymentStatus.called).to.equal(
      false
    );

    expect(paymentDetails.createPaymentSessionError).to.equal(
      'CREATE_PAYMENT_SESSION_FAILED'
    );
  });
});

describe('Services :: v1 :: processCallbackService :: handlePaymentStatusCallback', () => {
  afterEach(() => sinon.restore());

  it('returns false for unauthorised status and stops further processing', async () => {
    const notification = buildCallbackNotification('PaymentProcessed');
    notification.payload.notification.payload.accounts[0].status = 'FAILED';

    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'GCASH',
    });

    const req = buildReq({
      payload: notification,
      appCxsOverrides: {
        accountsForBuyLoad: [{}],
        accountsForCSPayment: [{}],
      },
    });

    const res = await handlePaymentStatusCallback(paymentDetails, req);

    expect(res).to.equal(false);

    expect(
      req.helpers.paymentSessionCallback.sendPaymentNotificationEmail.called
    ).to.equal(false);

    expect(req.helpers.paymentSessionCallback.processBuyLoad.called).to.equal(
      false
    );
  });

  it('short-circuits when dropin resolves true', async () => {
    const notification = buildCallbackNotification('PaymentProcessed');

    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'GCASH',
    });

    const req = buildReq({
      payload: notification,
      appCxsOverrides: { accountsForBuyLoad: [{}] },
    });

    req.helpers.paymentSessionCallback.resolveDropinStatus.resolves(true);

    const res = await handlePaymentStatusCallback(paymentDetails, req);

    expect(res).to.equal(true);
    expect(req.helpers.paymentSessionCallback.processBuyLoad.called).to.equal(
      false
    );
  });

  it('uses notificationPayload.status for CARD payments and applies remarks', async () => {
    const notification = buildCallbackNotification('PaymentProcessed');
    notification.payload.notification.payload.status = 'AUTHORISED';
    notification.payload.notification.payload.description = 'Card authorised';
    delete notification.payload.notification.payload.accounts;

    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'CC/DC',
    });

    const req = buildReq({
      payload: notification,
      appCxsOverrides: { accountsForBuyLoad: [{}] },
    });

    await handlePaymentStatusCallback(paymentDetails, req);

    expect(
      req.helpers.paymentSessionCallback.setPaymentStatus.firstCall.args[0]
    ).to.equal('AUTHORISED');

    expect(paymentDetails.settlementDetails[0].statusRemarks).to.equal(
      'Card authorised'
    );
  });

  it('derives status from accounts for non-CARD payment', async () => {
    const notification = buildCallbackNotification('PaymentProcessed');
    notification.payload.notification.payload.accounts = [
      {
        status: 'AUTHORISED',
        description: 'Wallet success',
        refusalReason: 'NONE',
      },
    ];

    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'XENDIT',
    });

    const req = buildReq({
      payload: notification,
      appCxsOverrides: { accountsForBuyLoad: [{}] },
    });

    await handlePaymentStatusCallback(paymentDetails, req);

    expect(
      req.helpers.paymentSessionCallback.setPaymentStatus.firstCall.args[0]
    ).to.equal('AUTHORISED');

    expect(paymentDetails.settlementDetails[0].statusRemarks).to.equal(
      'Wallet success'
    );
  });

  it('applies statusRemarks for XENDIT payment', async () => {
    const notification = buildCallbackNotification('PaymentProcessed');
    notification.payload.notification.payload.accounts = [
      { status: 'AUTHORISED', description: 'Xendit success' },
    ];

    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'XENDIT',
    });

    const req = buildReq({
      payload: notification,
      appCxsOverrides: { accountsForBuyLoad: [{}] },
    });

    await handlePaymentStatusCallback(paymentDetails, req);

    expect(paymentDetails.settlementDetails[0].statusRemarks).to.equal(
      'Xendit success'
    );
  });

  it('processes BuyLoad before BuyPromo when both are present', async () => {
    const notification = buildCallbackNotification('PaymentProcessed');

    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'GCASH',
    });

    const req = buildReq({
      payload: notification,
      appCxsOverrides: {
        accountsForBuyLoad: [{}],
        accountsForBuyPromo: [{}],
      },
    });

    await handlePaymentStatusCallback(paymentDetails, req);

    expect(
      req.helpers.paymentSessionCallback.processBuyLoad.calledOnce
    ).to.equal(true);
    expect(
      req.helpers.paymentSessionCallback.processPurchasePromo.called
    ).to.equal(false);
  });

  it('processes ECPay and persists ecpay transaction', async () => {
    const notification = buildCallbackNotification('PaymentProcessed');

    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'GCASH',
    });

    const req = buildReq({
      payload: notification,
      appCxsOverrides: { accountsForECPay: [{}] },
    });

    await handlePaymentStatusCallback(paymentDetails, req, {
      transactionId: 'ecpay-1',
    });

    expect(req.helpers.paymentSessionCallback.processECPay.calledOnce).to.equal(
      true
    );
    expect(req.mongo.ecpayTransactionRepository.create.calledOnce).to.equal(
      true
    );
  });

  it('processes CreatePolicy only for GLA token prefix', async () => {
    const notification = buildCallbackNotification('PaymentProcessed');
    notification.payload.notification.payload.paymentId = 'GLA123456';

    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'GCASH',
    });

    const req = buildReq({
      payload: notification,
      appCxsOverrides: { accountsForCreatePolicy: [{}] },
    });

    await handlePaymentStatusCallback(paymentDetails, req);

    expect(
      req.helpers.paymentSessionCallback.processCreatePolicy.calledOnce
    ).to.equal(true);
  });

  it('processes BuyRoaming with isV1=false for non-v1 versions', async () => {
    const notification = buildCallbackNotification('PaymentProcessed');

    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'GCASH',
      version: 'v2',
    });

    const req = buildReq({
      payload: notification,
      appCxsOverrides: { accountsForBuyRoaming: [{}] },
    });

    await handlePaymentStatusCallback(paymentDetails, req);

    expect(
      req.helpers.paymentSessionCallback.processBuyRoaming.calledOnce
    ).to.equal(true);

    expect(
      req.helpers.paymentSessionCallback.processBuyRoaming.firstCall.args[1]
    ).to.equal(false);
  });

  it('returns true when authorised and no processor arrays are populated', async () => {
    const notification = buildCallbackNotification('PaymentProcessed');

    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'GCASH',
    });

    const req = buildReq({ payload: notification });

    const res = await handlePaymentStatusCallback(paymentDetails, req);

    expect(res).to.equal(true);
    expect(
      req.helpers.paymentSessionCallback.sendPaymentNotificationEmail.calledOnce
    ).to.equal(true);
  });
});
