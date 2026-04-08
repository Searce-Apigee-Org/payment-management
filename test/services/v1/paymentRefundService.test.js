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
      error: Sinon.stub(),
    };

    reqMock = {
      params: { paymentId: 'pid-1', tokenPaymentId: 'token-1' },
      payload: { refundAmount: 100 },
      headers: {},
      paymentRefundHelper: paymentRefundHelperMock,
      mongo: {
        customerPaymentsRepository: {
          find: Sinon.stub(),
        },
      },
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
          logger: { error: loggerMock.error, info: () => {} },
        },
        '../../../src/util/index.js': {
          constants: {
            EPISODES: { PAY: 'PAY' },
            TRANSACTION_STATUS: { SUCCESS: 'SUCCESS' },
            PAYO: { REASONS: 'CANCELLATION' },
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
    reqMock.mongo.customerPaymentsRepository.find.resolves({
      Item: paymentSessionInfo,
    });
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
    reqMock.mongo.customerPaymentsRepository.find.resolves({
      Item: paymentSessionInfo,
    });
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

  it('should log and rethrow errors (cover catch branch)', async () => {
    reqMock.mongo.customerPaymentsRepository.find.throws(new Error('fail'));
    const requestPaymentRefund =
      await getRequestPaymentRefundWithMockedDataDictionary();
    let thrown = false;
    try {
      await requestPaymentRefund(reqMock);
    } catch (err) {
      thrown = true;
      expect(err.message).to.equal('fail');
      expect(loggerMock.error.called).to.be.true();
    }
    expect(thrown).to.be.true();
  });

  it('should log and rethrow non-Error thrown objects (cover catch branch)', async () => {
    reqMock.mongo.customerPaymentsRepository.find.throws({ foo: 'bar' });
    const requestPaymentRefund =
      await getRequestPaymentRefundWithMockedDataDictionary();
    let thrown = false;
    try {
      await requestPaymentRefund(reqMock);
    } catch (err) {
      thrown = true;
      expect(err.foo).to.equal('bar');
      expect(loggerMock.error.called).to.be.true();
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
    reqMock.mongo.customerPaymentsRepository.find.resolves({
      Item: paymentSessionInfo,
    });
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
      expect(loggerMock.error.called).to.be.true();
    }
    expect(thrown).to.be.true();
  });

  it('should log and rethrow string errors (cover catch branch)', async () => {
    // Sinon wraps thrown strings as Error objects with message: 'fail-string: Sinon-provided fail-string'
    reqMock.mongo.customerPaymentsRepository.find.throws('fail-string');
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
      expect(loggerMock.error.called).to.be.true();
    }
    expect(thrown).to.be.true();
  });

  it('should log and rethrow number errors (cover catch branch)', async () => {
    reqMock.mongo.customerPaymentsRepository.find.throws(12345);
    const requestPaymentRefund =
      await getRequestPaymentRefundWithMockedDataDictionary();
    let thrown = false;
    try {
      await requestPaymentRefund(reqMock);
    } catch (err) {
      thrown = true;
      expect(err).to.equal(12345);
      expect(loggerMock.error.called).to.be.true();
    }
    expect(thrown).to.be.true();
  });
});
