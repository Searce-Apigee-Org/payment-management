import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import sinon from 'sinon';
import {
  buildCallbackNotification,
  buildMockPaymentEntity,
} from '../../mocks/paymentSessionCallbackMocks.js';

import { callback } from '../../../src/services/v1/paymentSessionCallbackService.js';

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

    // mongo: {
    //   customerPaymentsRepository: {
    //     create: sinon.stub().resolves(),
    //     findOne: sinon.stub(),
    //   },
    //   ecpayTransactionRepository: {
    //     create: sinon.stub().resolves(),
    //     findOne: sinon.stub(),
    //   },
    // },

    payment: {
      customerPaymentsRepository: {
        create: sinon.stub().resolves(),
        findOne: sinon.stub(),
      },
    },
    transactions: {
      ecpayTransactionRepository: {
        create: sinon.stub().resolves(),
        findOne: sinon.stub(),
      },
    },
    processCallbackService: {},

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

describe('Services :: v1 :: paymentSessionCallbackService :: callback', () => {
  afterEach(() => sinon.restore());

  it('throws ResourceNotFound when payment does not exist', async () => {
    const notification = buildCallbackNotification('PaymentProcessed');

    const req = buildReq({ payload: notification });
    req.payment.customerPaymentsRepository.findOne = sinon
      .stub()
      .resolves(null);

    try {
      await callback(req);
      throw new Error('should not reach here');
    } catch (err) {
      expect(err.type).to.equal('ResourceNotFound');
      expect(err.displayMessage).to.equal('Payment Id not found.');
    }
  });

  it('invokes Xendit DNO handler when it returns true', async () => {
    const notification = buildCallbackNotification('PaymentProcessed');

    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'GCASH',
    });

    const req = buildReq({ payload: notification });

    req.payment.customerPaymentsRepository.findOne.resolves(paymentDetails);

    req.dnoService = {
      handleLFDNOXenditUpdatePayment: sinon.stub().resolves(true),
      handleLFDNOUpdatePayment: sinon.stub(),
    };

    req.processCallbackService.processCallback = sinon.stub().resolves();

    await callback(req);

    expect(req.dnoService.handleLFDNOXenditUpdatePayment.calledOnce).to.equal(
      true
    );

    expect(req.dnoService.handleLFDNOUpdatePayment.called).to.equal(false);
  });

  it('falls back to normal DNO handler when Xendit handler returns false', async () => {
    const notification = buildCallbackNotification('PaymentProcessed');

    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'GCASH',
    });

    const req = buildReq({ payload: notification });

    req.payment.customerPaymentsRepository.findOne.resolves(paymentDetails);

    req.dnoService = {
      handleLFDNOXenditUpdatePayment: sinon.stub().resolves(false),
      handleLFDNOUpdatePayment: sinon.stub().resolves(),
    };

    req.processCallbackService.processCallback = sinon.stub().resolves();

    await callback(req);

    expect(req.dnoService.handleLFDNOUpdatePayment.calledOnce).to.equal(true);
  });

  it('handles ECPAY paymentType and mutates settlementDetails', async () => {
    const notification = buildCallbackNotification('PaymentProcessed');
    notification.payload.notification.payload.accounts = [
      {
        payment_code: 'ECPAY123',
        expiry: '2025-01-01',
      },
    ];

    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'ECPAY',
    });

    const req = buildReq({ payload: notification });

    req.payment.customerPaymentsRepository.findOne.resolves(paymentDetails);

    req.dnoService = {
      handleLFDNOXenditUpdatePayment: sinon.stub().resolves(false),
      handleLFDNOUpdatePayment: sinon.stub().resolves(),
    };

    req.processCallbackService.processCallback = sinon.stub().resolves();

    await callback(req);

    expect(paymentDetails.settlementDetails[0].paymentCode).to.equal(
      'ECPAY123'
    );
    expect(paymentDetails.settlementDetails[0].expiry).to.equal('2025-01-01');

    expect(req.app.cxs.isECPayPaymentType).to.equal(true);
  });

  it('detects ECPAY transaction via partnerReferenceNumber', async () => {
    const notification = buildCallbackNotification('PaymentProcessed');

    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'GCASH',
    });

    paymentDetails.settlementDetails[0].transactions = [
      { partnerReferenceNumber: 'PARTNER123' },
    ];

    const ecpayTxn = { id: 'txn-1' };

    const req = buildReq({ payload: notification });

    req.payment.customerPaymentsRepository.findOne.resolves(paymentDetails);
    req.transactions.ecpayTransactionRepository.findOne.resolves(ecpayTxn);

    req.dnoService = {
      handleLFDNOXenditUpdatePayment: sinon.stub().resolves(false),
      handleLFDNOUpdatePayment: sinon.stub().resolves(),
    };

    req.processCallbackService.processCallback = sinon.stub().resolves();

    await callback(req);

    expect(req.app.cxs.isECPayTransaction).to.equal(true);
    expect(ecpayTxn.tokenPaymentId).to.equal(
      notification.payload.notification.payload.paymentId
    );
  });

  it('recomputes refund when shouldRecomputeRefund returns true', async () => {
    const notification = buildCallbackNotification('RefundProcessed');
    notification.payload.notification.payload.refundAmount = '100';
    notification.payload.notification.payload.status = 'PROCESSED';

    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'GCASH',
    });

    const req = buildReq({ payload: notification });

    req.payment.customerPaymentsRepository.findOne.resolves(paymentDetails);

    req.dnoService = {
      handleLFDNOXenditUpdatePayment: sinon.stub().resolves(false),
      handleLFDNOUpdatePayment: sinon.stub().resolves(),
    };

    req.processCallbackService.processCallback = sinon.stub().resolves();

    await callback(req);

    expect(
      req.processCallbackService.processCallback.firstCall.args[2]
    ).to.equal(true);
  });

  it('invokes processCallback with correct arguments and returns accepted response', async () => {
    const notification = buildCallbackNotification('PaymentProcessed');

    const paymentDetails = buildMockPaymentEntity('BuyLoad', {
      paymentType: 'GCASH',
    });

    const req = buildReq({ payload: notification });

    req.payment.customerPaymentsRepository.findOne.resolves(paymentDetails);

    req.dnoService = {
      handleLFDNOXenditUpdatePayment: sinon.stub().resolves(false),
      handleLFDNOUpdatePayment: sinon.stub().resolves(),
    };

    req.processCallbackService.processCallback = sinon.stub().resolves();

    const res = await callback(req);

    expect(req.processCallbackService.processCallback.calledOnce).to.equal(
      true
    );

    expect(res).to.equal({
      statusCode: 200,
      notificationResponse: 'accepted',
    });
  });
});
