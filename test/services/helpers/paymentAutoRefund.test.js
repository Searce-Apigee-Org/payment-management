import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import {
  callRequestRefundAPI,
  emailNotif,
  getPaymentMethod,
  updateRefundRequest,
  xmlRequestFormatter,
} from '../../../src/services/helpers/paymentAutoRefund.js';
import { constants } from '../../../src/util/index.js';

const lab = Lab.script();
const { describe, it, afterEach } = lab;

export { lab };

describe('Service :: PaymentAutoRefundHelper :: callRequestRefundAPI', () => {
  afterEach(() => {
    Sinon.restore();
  });

  it('should return success when executeRefund returns 202', async () => {
    const secretManager = {
      paymentServiceRepository: {
        getRefundAuthToken: Sinon.stub().resolves('auth-token'),
      },
    };
    const cxs = {
      paymentManagementRepository: {
        executeRefund: Sinon.stub().resolves({ result: { statusCode: 202 } }),
      },
    };
    const http = {};

    const result = await callRequestRefundAPI({
      tokenPaymentId: 'token-1',
      refundAmount: 100,
      secretManager,
      secretManagerClient: {},
      http,
      cxs,
    });

    expect(result).to.equal({
      refundStatus: constants.PAYMENT_STATUS.SUCCESS,
    });
    expect(
      secretManager.paymentServiceRepository.getRefundAuthToken.calledOnce
    ).to.be.true();
    expect(
      cxs.paymentManagementRepository.executeRefund.calledOnce
    ).to.be.true();
  });

  it('should return failed when executeRefund returns non-202', async () => {
    const secretManager = {
      paymentServiceRepository: {
        getRefundAuthToken: Sinon.stub().resolves('auth-token'),
      },
    };
    const cxs = {
      paymentManagementRepository: {
        executeRefund: Sinon.stub().resolves({ result: { statusCode: 400 } }),
      },
    };

    const result = await callRequestRefundAPI({
      tokenPaymentId: 'token-2',
      refundAmount: 200,
      secretManager,
      secretManagerClient: {},
      http: {},
      cxs,
    });

    expect(result.refundStatus).to.equal(constants.PAYMENT_STATUS.FAILED);
    expect(result.refundError).to.exist();
  });

  it('should return failed when exception is thrown and include getError output', async () => {
    const secretManager = {
      paymentServiceRepository: {
        getRefundAuthToken: Sinon.stub().rejects({
          type: 'InvalidOutboundRequest',
          message: 'boom',
        }),
      },
    };
    const cxs = {
      paymentManagementRepository: {
        executeRefund: Sinon.stub(),
      },
    };

    const result = await callRequestRefundAPI({
      tokenPaymentId: 'token-3',
      refundAmount: 300,
      secretManager,
      secretManagerClient: {},
      http: {},
      cxs,
    });

    expect(result.refundStatus).to.equal(constants.PAYMENT_STATUS.FAILED);
    expect(result.refundError).to.exist();
  });
});

describe('Service :: PaymentAutoRefundHelper :: getPaymentMethod', () => {
  it('should return GCASH when paymentType is GCASH', () => {
    const result = getPaymentMethod('GCASH', {});
    expect(result).to.equal('GCASH');
  });

  it('should return Credit/Debit Card for XENDIT CC_DC', () => {
    const result = getPaymentMethod('XENDIT', { type: 'CC_DC' });
    expect(result).to.equal('Credit/Debit Card');
  });

  it('should return channelCode Card for XENDIT DIRECT_DEBIT', () => {
    const result = getPaymentMethod('XENDIT', {
      type: 'DIRECT_DEBIT',
      channelCode: 'BPI',
    });
    expect(result).to.equal('BPI Card');
  });

  it('should return channelCode for XENDIT EWALLET', () => {
    const result = getPaymentMethod('XENDIT', {
      type: 'EWALLET',
      channelCode: 'GCASH',
    });
    expect(result).to.equal('GCASH');
  });

  it('should return empty string for unsupported type', () => {
    const result = getPaymentMethod('ADYEN', { type: 'UNKNOWN' });
    expect(result).to.equal('');
  });

  it('should return empty string for XENDIT with unsupported payment info type', () => {
    const result = getPaymentMethod('XENDIT', { type: 'BANK_TRANSFER' });
    expect(result).to.equal('');
  });
});

describe('Service :: PaymentAutoRefundHelper :: xmlRequestFormatter', () => {
  it('should build XML payload with defaults and parameters', () => {
    const payload = {
      userIdentity: 'user@example.com',
      notifPatternId: 'pattern-1',
      notifParametersList: [
        { Name: '[REFERENCE_NUMBER]', Value: 'REF-1' },
        { Name: '[AMOUNT]', Value: '100' },
      ],
    };

    const xml = xmlRequestFormatter(payload);

    expect(xml).to.contain('<OrigPlatformID>CXS</OrigPlatformID>');
    expect(xml).to.contain('<OrigPlatformNode>CXS</OrigPlatformNode>');
    expect(xml).to.contain('<userIdentity>user@example.com</userIdentity>');
    expect(xml).to.contain('<notifPatternId>pattern-1</notifPatternId>');
    expect(xml).to.contain(
      '<name>[REFERENCE_NUMBER]</name><value>REF-1</value>'
    );
    expect(xml).to.contain('<name>[AMOUNT]</name><value>100</value>');
  });

  it('should build XML payload without notifParametersList when empty', () => {
    const payload = {
      userIdentity: 'user@example.com',
      notifPatternId: 'pattern-1',
      notifParametersList: [],
    };

    const xml = xmlRequestFormatter(payload, 'PLATFORM', 'NODE');

    expect(xml).to.contain('<OrigPlatformID>PLATFORM</OrigPlatformID>');
    expect(xml).to.contain('<OrigPlatformNode>NODE</OrigPlatformNode>');
    expect(xml).to.contain('<userIdentity>user@example.com</userIdentity>');
    expect(xml).to.contain('<notifPatternId>pattern-1</notifPatternId>');
    expect(xml).to.not.contain('<notifParam>');
  });
});

describe('Service :: PaymentAutoRefundHelper :: emailNotif', () => {
  it('should return success when raven response is successful', async () => {
    const paymentDetails = {
      tokenPaymentId: 'TOK-1',
      paymentType: 'XENDIT',
      paymentInformation: JSON.stringify({
        type: 'EWALLET',
        channelCode: 'GCASH',
      }),
      settlementDetails: [{ emailAddress: 'test@example.com', amount: 100 }],
    };

    const raven = {
      pushNotificationRepository: {
        sendPushNotification: Sinon.stub().resolves({
          status: '0',
          notification: { status: '0' },
        }),
      },
    };

    const result = await emailNotif({
      paymentDetails,
      patternId: 'pattern-1',
      raven,
      soap: {},
    });
    expect(result).to.equal({ notificationStatus: constants.STATUS.SUCCESS });
    expect(
      raven.pushNotificationRepository.sendPushNotification.calledOnce
    ).to.be.true();
  });

  it('should return failed when raven response is not successful', async () => {
    const paymentDetails = {
      tokenPaymentId: 'TOK-1B',
      paymentType: 'GCASH',
      paymentInformation: JSON.stringify({ type: 'EWALLET' }),
      settlementDetails: [{ emailAddress: 'test@example.com', amount: 100 }],
    };

    const raven = {
      pushNotificationRepository: {
        sendPushNotification: Sinon.stub().resolves({
          status: '1',
          notification: { status: '1' },
        }),
      },
    };

    const result = await emailNotif({
      paymentDetails,
      patternId: 'pattern-1',
      raven,
      soap: {},
    });
    expect(result.notificationStatus).to.equal(constants.STATUS.FAILED);
    expect(result.notificationError).to.exist();
  });

  it('should return success for XENDIT CC_DC payment info', async () => {
    const paymentDetails = {
      tokenPaymentId: 'TOK-1C',
      paymentType: 'XENDIT',
      paymentInformation: JSON.stringify({ type: 'CC_DC' }),
      settlementDetails: [{ emailAddress: 'test@example.com', amount: 100 }],
    };

    const raven = {
      pushNotificationRepository: {
        sendPushNotification: Sinon.stub().resolves({
          status: '0',
          notification: { status: '0' },
        }),
      },
    };

    const result = await emailNotif({
      paymentDetails,
      patternId: 'pattern-1',
      raven,
      soap: {},
    });
    expect(result).to.equal({ notificationStatus: constants.STATUS.SUCCESS });
  });

  it('should return success for XENDIT DIRECT_DEBIT payment info', async () => {
    const paymentDetails = {
      tokenPaymentId: 'TOK-1D',
      paymentType: 'XENDIT',
      paymentInformation: JSON.stringify({
        type: 'DIRECT_DEBIT',
        channelCode: 'BPI',
      }),
      settlementDetails: [{ emailAddress: 'test@example.com', amount: 100 }],
    };

    const raven = {
      pushNotificationRepository: {
        sendPushNotification: Sinon.stub().resolves({
          status: '0',
          notification: { status: '0' },
        }),
      },
    };

    const result = await emailNotif({
      paymentDetails,
      patternId: 'pattern-1',
      raven,
      soap: {},
    });
    expect(result).to.equal({ notificationStatus: constants.STATUS.SUCCESS });
  });

  it('should return success for unknown payment type', async () => {
    const paymentDetails = {
      tokenPaymentId: 'TOK-1E',
      paymentType: 'ADYEN',
      paymentInformation: JSON.stringify({ type: 'UNKNOWN' }),
      settlementDetails: [{ emailAddress: 'test@example.com', amount: 100 }],
    };

    const raven = {
      pushNotificationRepository: {
        sendPushNotification: Sinon.stub().resolves({
          status: '0',
          notification: { status: '0' },
        }),
      },
    };

    const result = await emailNotif({
      paymentDetails,
      patternId: 'pattern-1',
      raven,
      soap: {},
    });
    expect(result).to.equal({ notificationStatus: constants.STATUS.SUCCESS });
  });

  it('should return failed when paymentInformation is invalid', async () => {
    const paymentDetails = {
      tokenPaymentId: 'TOK-2',
      paymentType: 'XENDIT',
      paymentInformation: '{bad json',
      settlementDetails: [{ emailAddress: 'test@example.com', amount: 100 }],
    };

    const raven = {
      pushNotificationRepository: {
        sendPushNotification: Sinon.stub(),
      },
    };

    const result = await emailNotif({
      paymentDetails,
      patternId: 'pattern-1',
      raven,
      soap: {},
    });
    expect(result.notificationStatus).to.equal(constants.STATUS.FAILED);
  });
});

describe('Service :: PaymentAutoRefundHelper :: updateRefundRequest', () => {
  afterEach(() => {
    Sinon.restore();
  });

  it('should update payment when refund object does not exist', async () => {
    const mongo = {
      customerPaymentsRepository: {
        update: Sinon.stub().resolves(),
      },
    };

    const paymentDetail = {
      settlementDetails: [
        { amount: 120, status: 'XENDIT_AUTHORISED', transactions: [] },
      ],
    };

    await updateRefundRequest(
      'TOKEN-1',
      paymentDetail,
      { refundStatus: constants.PAYMENT_STATUS.SUCCESS },
      mongo
    );

    expect(mongo.customerPaymentsRepository.update.calledOnce).to.be.true();
    const [args] = mongo.customerPaymentsRepository.update.getCall(0).args;
    expect(args.filter).to.equal({ tokenPaymentId: 'TOKEN-1' });
    expect(args.update.$set['settlementDetails.0.status']).to.equal(
      constants.PAYMENT_STATUS.REFUND_REQUESTED
    );
    expect(args.update.$set['settlementDetails.0.refund']).to.exist();
  });

  it('should update status to REFUND_FAILED when refundStatus is failed', async () => {
    const mongo = {
      customerPaymentsRepository: {
        update: Sinon.stub().resolves(),
      },
    };

    const paymentDetail = {
      settlementDetails: [
        { amount: 120, status: 'XENDIT_AUTHORISED', transactions: [] },
      ],
    };

    await updateRefundRequest(
      'TOKEN-1B',
      paymentDetail,
      { refundStatus: constants.PAYMENT_STATUS.FAILED },
      mongo
    );

    const [args] = mongo.customerPaymentsRepository.update.getCall(0).args;
    expect(args.update.$set['settlementDetails.0.status']).to.equal(
      constants.PAYMENT_STATUS.REFUND_FAILED
    );
  });

  it('should not update when refund already exists', async () => {
    const mongo = {
      customerPaymentsRepository: {
        update: Sinon.stub().resolves(),
      },
    };

    const paymentDetail = {
      settlementDetails: [
        { amount: 120, refund: { amount: 120, status: 'REFUND_REQUESTED' } },
      ],
    };

    await updateRefundRequest(
      'TOKEN-2',
      paymentDetail,
      { refundStatus: 'success' },
      mongo
    );

    expect(mongo.customerPaymentsRepository.update.called).to.be.false();
  });

  it('should throw when update fails', async () => {
    const mongo = {
      customerPaymentsRepository: {
        update: Sinon.stub().rejects(new Error('DB error')),
      },
    };

    const paymentDetail = {
      settlementDetails: [
        { amount: 120, status: 'XENDIT_AUTHORISED', transactions: [] },
      ],
    };

    try {
      await updateRefundRequest(
        'TOKEN-ERR',
        paymentDetail,
        { refundStatus: constants.PAYMENT_STATUS.SUCCESS },
        mongo
      );
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err.message).to.equal('DB error');
    }
  });
});
