import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import esmock from 'esmock';
import Sinon from 'sinon';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Service :: PaymentRefundService :: requestPaymentRefund', () => {
  let reqMock,
    paymentRefundHelperMock,
    paymentMock,
    payoMock,
    dataDictionaryMock,
    loggerMock;

  beforeEach(() => {
    paymentRefundHelperMock = {
      retrievePaymentServiceAccessToken: Sinon.stub(),
      retrieveGPayOAccessToken: Sinon.stub(),
      isT1PaymentType: Sinon.stub(),
    };
    paymentMock = {
      paymentRepository: {
        requestRefundByTokenId: Sinon.stub(),
      },
      customerPaymentsRepository: {
        findOne: Sinon.stub(),
      },
    };
    payoMock = {
      paymentServiceRepository: {
        requestRefundByTokenId: Sinon.stub(),
      },
    };
    dataDictionaryMock = {
      setDataDictionary: Sinon.stub(),
    };
    loggerMock = {
      debug: Sinon.stub(),
      error: Sinon.stub(),
    };

    reqMock = {
      params: { paymentId: 'pid-1', tokenPaymentId: 'token-1' },
      payload: { refundAmount: 100 },
      headers: {},
      paymentRefundHelper: paymentRefundHelperMock,
      payment: paymentMock,
      http: {},
      payo: payoMock,
      logger: loggerMock,
      app: { dataDictionary: dataDictionaryMock },
    };
  });

  afterEach(() => {
    Sinon.restore();
  });

  async function getRequestPaymentRefundWithMockedDataDictionary() {
    const { requestPaymentRefund } = await esmock(
      '../../../src/services/v1/paymentRefundService.js',
      {
        '@globetel/cxs-core/core/index.js': {
          dataDictionary: dataDictionaryMock,
        },
        '@globetel/cxs-core/core/logger/index.js': {
          logger: {
            error: loggerMock.error,
            debug: loggerMock.debug,
            info: () => {},
          },
        },
        '../../../src/util/index.js': {
          constants: {
            EPISODES: { PAY: 'PAY' },
            TRANSACTION_STATUS: { SUCCESS: 'SUCCESS' },
            PAYO: { REASONS: 'CANCELLATION' },
            PAYMENT_TYPES: { GCASH: 'GCASH' },
          },
          paymentsUtil: {
            identifySourceChannel: Sinon.stub().returns('channel-1'),
          },
          xenditUtil: {
            isXenditPayment: (pt) => (pt || '').toUpperCase() === 'XENDIT',
          },
        },
      }
    );
    return requestPaymentRefund;
  }

  it('should process refund with XENDIT paymentType (case-insensitive)', async () => {
    const paymentSessionInfo = {
      tokenPaymentId: 'GLA1758865804330643',
      channelId: '7uupmf7ajrd1aesvnvqkkckud3',
      createDate: new Date('2025-09-26T13:50:04.396Z'),
      customerInfo: {
        customerId: 'a3cdef-p3j2j-d30as2-fa2as-o02ams',
        customerName: 'Rey Cruz',
      },
      lastUpdateDate: new Date('2025-09-26T14:58:16.487Z'),
      paymentType: 'XENDIT',
      settlementDetails: [
        {
          amount: 800,
          mobileNumber: '639534600009',
          refund: {
            amount: 800,
            status: 'REFUND_FAILED',
          },
          requestType: 'BuyRoaming',
          status: 'CARD_AUTHORISED',
          statusRemarks: 'Approved and completed sucessfully',
          transactions: [
            {
              activationDate: new Date('2026-01-23T00:00:00Z'),
              amount: 800,
              param: 'A',
              provisionStatus: 'PROCESSING',
              serviceId: '147',
              status: 'FAILED',
              targetDestination: 'China',
            },
          ],
          transactionType: 'N',
        },
      ],
      userToken: 'Bearer ...',
      version: 'v2',
    };
    reqMock.payment.customerPaymentsRepository.findOne.resolves(
      paymentSessionInfo
    );
    // CARD/XENDIT flows are handled by the “T1 payment type” branch
    paymentRefundHelperMock.isT1PaymentType.returns(true);
    paymentRefundHelperMock.retrievePaymentServiceAccessToken.resolves(
      'access-token'
    );
    paymentMock.paymentRepository.requestRefundByTokenId.resolves({
      status: 200,
    });

    const requestPaymentRefund =
      await getRequestPaymentRefundWithMockedDataDictionary();
    const result = await requestPaymentRefund(reqMock);

    expect(result).to.equal({ statusCode: 202 });
    expect(dataDictionaryMock.setDataDictionary.called).to.be.true();
    // Ensure xendit-specific payload is used
    expect(
      paymentMock.paymentRepository.requestRefundByTokenId.called
    ).to.be.true();
    const refundArgs =
      paymentMock.paymentRepository.requestRefundByTokenId.getCall(0).args;
    expect(refundArgs[1].command.name).to.equal('XenditRefundSession');
  });

  it('should process refund with CARD paymentType (default branch) and call setDataDictionary with success', async () => {
    const paymentSessionInfo = {
      tokenPaymentId: 'GLA1758865804330643',
      channelId: '7uupmf7ajrd1aesvnvqkkckud3',
      createDate: new Date('2025-09-26T13:50:04.396Z'),
      customerInfo: {
        customerId: 'a3cdef-p3j2j-d30as2-fa2as-o02ams',
        customerName: 'Rey Cruz',
      },
      lastUpdateDate: new Date('2025-09-26T14:58:16.487Z'),
      paymentType: 'CARD',
      settlementDetails: [
        {
          amount: 800,
          mobileNumber: '639534600009',
          refund: {
            amount: 800,
            status: 'REFUND_FAILED',
          },
          requestType: 'BuyRoaming',
          status: 'CARD_AUTHORISED',
          statusRemarks: 'Approved and completed sucessfully',
          transactions: [
            {
              activationDate: new Date('2026-01-23T00:00:00Z'),
              amount: 800,
              param: 'A',
              provisionStatus: 'PROCESSING',
              serviceId: '147',
              status: 'FAILED',
              targetDestination: 'China',
            },
          ],
          transactionType: 'N',
        },
      ],
      userToken: 'Bearer ...',
      version: 'v2',
    };
    reqMock.payment.customerPaymentsRepository.findOne.resolves(
      paymentSessionInfo
    );
    paymentRefundHelperMock.isT1PaymentType.returns(true);
    paymentRefundHelperMock.retrievePaymentServiceAccessToken.resolves(
      'access-token'
    );
    paymentMock.paymentRepository.requestRefundByTokenId.resolves({
      status: 200,
    });

    const requestPaymentRefund =
      await getRequestPaymentRefundWithMockedDataDictionary();
    const result = await requestPaymentRefund(reqMock);

    expect(result).to.equal({ statusCode: 202 });
    const calls = dataDictionaryMock.setDataDictionary.getCalls();
    const found = calls.some(
      (call) => call.args[1] && call.args[1].transaction_status
    );
    expect(found).to.be.true();
    // Ensure default payload is used
    const refundArgs =
      paymentMock.paymentRepository.requestRefundByTokenId.getCall(0).args;
    expect(refundArgs[1].command.name).to.equal('CreateRefundSession');
  });

  it('should process refund with GCASH paymentType and use gcash refund command payload', async () => {
    const paymentSessionInfo = {
      tokenPaymentId: 'GLA1758865804330643',
      channelId: '7uupmf7ajrd1aesvnvqkkckud3',
      createDate: new Date('2025-09-26T13:50:04.396Z'),
      customerInfo: {
        customerId: 'a3cdef-p3j2j-d30as2-fa2as-o02ams',
        customerName: 'Rey Cruz',
      },
      lastUpdateDate: new Date('2025-09-26T14:58:16.487Z'),
      paymentType: 'GCASH',
      settlementDetails: [],
      userToken: 'Bearer ...',
      version: 'v2',
    };

    reqMock.payment.customerPaymentsRepository.findOne.resolves(
      paymentSessionInfo
    );
    paymentRefundHelperMock.isT1PaymentType.returns(true);
    paymentRefundHelperMock.retrievePaymentServiceAccessToken.resolves(
      'access-token'
    );
    paymentMock.paymentRepository.requestRefundByTokenId.resolves({
      status: 200,
    });

    const requestPaymentRefund =
      await getRequestPaymentRefundWithMockedDataDictionary();
    const result = await requestPaymentRefund(reqMock);

    expect(result).to.equal({ statusCode: 202 });
    expect(
      paymentMock.paymentRepository.requestRefundByTokenId.called
    ).to.be.true();

    const refundArgs =
      paymentMock.paymentRepository.requestRefundByTokenId.getCall(0).args;
    expect(refundArgs[1].command.name).to.equal('GcashRefund');
    expect(refundArgs[1].command.payload).to.equal({
      paymentId: reqMock.params.tokenPaymentId,
      refundAmount: reqMock.payload.refundAmount,
    });
  });

  it('should log and rethrow errors (cover catch branch)', async () => {
    reqMock.payment.customerPaymentsRepository.findOne.throws(
      new Error('fail')
    );
    const requestPaymentRefund =
      await getRequestPaymentRefundWithMockedDataDictionary();
    let thrown = false;
    try {
      await requestPaymentRefund(reqMock);
    } catch (err) {
      thrown = true;
      expect(err.message).to.equal('fail');
      expect(loggerMock.debug.called).to.be.true();
    }
    expect(thrown).to.be.true();
  });

  it('should log and rethrow non-Error thrown objects (cover catch branch)', async () => {
    reqMock.payment.customerPaymentsRepository.findOne.throws({ foo: 'bar' });
    const requestPaymentRefund =
      await getRequestPaymentRefundWithMockedDataDictionary();
    let thrown = false;
    try {
      await requestPaymentRefund(reqMock);
    } catch (err) {
      thrown = true;
      expect(err.foo).to.equal('bar');
      expect(loggerMock.debug.called).to.be.true();
    }
    expect(thrown).to.be.true();
  });

  it('should log and rethrow errors thrown by downstream call (cover catch branch)', async () => {
    const paymentSessionInfo = {
      tokenPaymentId: 'GLA1758865804330643',
      channelId: '7uupmf7ajrd1aesvnvqkkckud3',
      createDate: new Date('2025-09-26T13:50:04.396Z'),
      customerInfo: {
        customerId: 'a3cdef-p3j2j-d30as2-fa2as-o02ams',
        customerName: 'Rey Cruz',
      },
      lastUpdateDate: new Date('2025-09-26T14:58:16.487Z'),
      paymentType: 'CARD',
      settlementDetails: [],
      userToken: 'Bearer ...',
      version: 'v2',
    };
    reqMock.payment.customerPaymentsRepository.findOne.resolves(
      paymentSessionInfo
    );
    paymentRefundHelperMock.isT1PaymentType.returns(true);
    paymentRefundHelperMock.retrievePaymentServiceAccessToken.resolves(
      'access-token'
    );
    paymentMock.paymentRepository.requestRefundByTokenId.throws(
      new Error('downstream error')
    );

    const requestPaymentRefund =
      await getRequestPaymentRefundWithMockedDataDictionary();
    let thrown = false;
    try {
      await requestPaymentRefund(reqMock);
    } catch (err) {
      thrown = true;
      expect(err.message).to.equal('downstream error');
      expect(loggerMock.debug.called).to.be.true();
    }
    expect(thrown).to.be.true();
  });

  it('should log and rethrow string errors (cover catch branch)', async () => {
    // Sinon wraps thrown strings as Error objects with message: 'fail-string: Sinon-provided fail-string'
    reqMock.payment.customerPaymentsRepository.findOne.throws('fail-string');
    const requestPaymentRefund =
      await getRequestPaymentRefundWithMockedDataDictionary();
    let thrown = false;
    try {
      await requestPaymentRefund(reqMock);
    } catch (err) {
      thrown = true;
      // Accept either the raw string or the sinon-wrapped error message
      if (typeof err === 'string') {
        expect(err).to.equal('fail-string');
      } else {
        expect(err.message).to.match(/fail-string/);
      }
      expect(loggerMock.debug.called).to.be.true();
    }
    expect(thrown).to.be.true();
  });

  it('should log and rethrow number errors (cover catch branch)', async () => {
    reqMock.payment.customerPaymentsRepository.findOne.throws(12345);
    const requestPaymentRefund =
      await getRequestPaymentRefundWithMockedDataDictionary();
    let thrown = false;
    try {
      await requestPaymentRefund(reqMock);
    } catch (err) {
      thrown = true;
      expect(err).to.equal(12345);
      expect(loggerMock.debug.called).to.be.true();
    }
    expect(thrown).to.be.true();
  });

  it('should process refund with GPayO T2 paymentType, set deviceid header and mark success', async () => {
    const paymentSessionInfo = {
      tokenPaymentId: 'GLA1758865804330643',
      channelId: '7uupmf7ajrd1aesvnvqkkckud3',
      createDate: new Date('2025-09-26T13:50:04.396Z'),
      customerInfo: {
        customerId: 'a3cdef-p3j2j-d30as2-fa2as-o02ams',
        customerName: 'Rey Cruz',
      },
      lastUpdateDate: new Date('2025-09-26T14:58:16.487Z'),
      paymentType: 'GPAYO_T2',
      settlementDetails: [],
      userToken: 'Bearer ...',
      version: 'v2',
      deviceId: 'device-123',
    };

    // GPayO T2 flow is the non-T1 branch
    reqMock.payment.customerPaymentsRepository.findOne.resolves(
      paymentSessionInfo
    );
    paymentRefundHelperMock.isT1PaymentType.returns(false);

    const gpayoAccessToken = 'gpayo-access-token';

    reqMock.payoT2AuthService = {
      retrieveGPayOAccessToken: Sinon.stub().resolves(gpayoAccessToken),
    };

    reqMock.payoT2 = {
      paymentServiceRepository: {
        requestRefundByTokenIdT2: Sinon.stub().resolves({ status: 200 }),
      },
    };

    const requestPaymentRefund =
      await getRequestPaymentRefundWithMockedDataDictionary();
    const result = await requestPaymentRefund(reqMock);

    expect(result).to.equal({ statusCode: 202 });

    // Access token retrieval for GPayO T2
    expect(
      reqMock.payoT2AuthService.retrieveGPayOAccessToken.calledWith(
        reqMock,
        paymentSessionInfo.channelId
      )
    ).to.be.true();

    // GPayO T2 refund repository is called with the expected payload and header
    expect(
      reqMock.payoT2.paymentServiceRepository.requestRefundByTokenIdT2.called
    ).to.be.true();

    const refundArgs =
      reqMock.payoT2.paymentServiceRepository.requestRefundByTokenIdT2.getCall(
        0
      ).args;

    expect(refundArgs[1]).to.equal({
      paymentId: reqMock.params.tokenPaymentId,
      amount: reqMock.payload.refundAmount,
      reason: 'CANCELLATION', // from constants.PAYO.REASONS stub
    });
    expect(refundArgs[2]).to.equal({
      Authorization: `Bearer ${gpayoAccessToken}`,
    });

    // deviceId header should be propagated when present
    expect(reqMock.headers.deviceid).to.equal(paymentSessionInfo.deviceId);

    // Ensure success transaction status is eventually recorded
    const calls = dataDictionaryMock.setDataDictionary.getCalls();
    const hasSuccessStatus = calls.some(
      (call) => call.args[1] && call.args[1].transaction_status === 'SUCCESS'
    );
    expect(hasSuccessStatus).to.be.true();
  });

  it('should throw InternalOperationFailed when GPayO T2 refund returns non-200 status', async () => {
    const paymentSessionInfo = {
      tokenPaymentId: 'GLA1758865804330643',
      channelId: '7uupmf7ajrd1aesvnvqkkckud3',
      createDate: new Date('2025-09-26T13:50:04.396Z'),
      customerInfo: {
        customerId: 'a3cdef-p3j2j-d30as2-fa2as-o02ams',
        customerName: 'Rey Cruz',
      },
      lastUpdateDate: new Date('2025-09-26T14:58:16.487Z'),
      paymentType: 'GPAYO_T2',
      settlementDetails: [],
      userToken: 'Bearer ...',
      version: 'v2',
      deviceId: 'device-123',
    };

    reqMock.payment.customerPaymentsRepository.findOne.resolves(
      paymentSessionInfo
    );
    paymentRefundHelperMock.isT1PaymentType.returns(false);

    const gpayoAccessToken = 'gpayo-access-token';
    const failedResult = {
      status: 500,
      data: { message: 'GPAYO_ERROR' },
    };

    reqMock.payoT2AuthService = {
      retrieveGPayOAccessToken: Sinon.stub().resolves(gpayoAccessToken),
    };

    reqMock.payoT2 = {
      paymentServiceRepository: {
        requestRefundByTokenIdT2: Sinon.stub().resolves(failedResult),
      },
    };

    const requestPaymentRefund =
      await getRequestPaymentRefundWithMockedDataDictionary();

    let thrownError;
    try {
      await requestPaymentRefund(reqMock);
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).to.exist();
    expect(thrownError.message).to.equal('InternalOperationFailed:GPAYO_ERROR');

    // Ensure error is logged via logger.error with the original result
    expect(loggerMock.error.called).to.be.true();
    const [logMessage, loggedResult] = loggerMock.error.getCall(0).args;
    expect(logMessage).to.equal('REQUEST_PAYMENT_REFUND_ERROR');
    expect(loggedResult).to.equal(failedResult);

    // Event detail should still be recorded before the error is thrown
    const calls = dataDictionaryMock.setDataDictionary.getCalls();
    const hasEventDetail = calls.some(
      (call) => call.args[1] && call.args[1].event_detail
    );
    expect(hasEventDetail).to.be.true();
  });
});
