import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { getPayments } from '../../../src/services/v1/paymentsService.js';
import * as constants from '../../../src/util/constants.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Service :: PaymentsService :: getPayments', () => {
  let reqMock;

  beforeEach(() => {
    reqMock = {
      query: {
        accountNumber: undefined,
        mobileNumber: undefined,
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      },
      hip: {},
      rudy: {},
      secretManager: {},
      jwt: {},
      headers: {
        'x-request-id': 'req-1',
        deviceid: 'dev-1',
        otpreferenceid: 'otp-1',
      },
      app: { dataDictionary: {} },
      paymentsRetrievalService: {
        getDetailsByMsisdn: Sinon.stub(),
        retrievePayments: Sinon.stub(),
        validateFields: Sinon.stub(),
      },
      soap: {},
    };
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should return payments when accountNumber is provided (no MSISDN lookup)', async () => {
    const payments = [{ id: 'pmt-1' }];
    reqMock.query.accountNumber = 'ACC-12345';
    reqMock.query.mobileNumber = '';

    reqMock.paymentsRetrievalService.retrievePayments.resolves(payments);

    const result = await getPayments(reqMock);

    expect(result).to.equal(payments);
    Sinon.assert.notCalled(reqMock.paymentsRetrievalService.getDetailsByMsisdn);
    Sinon.assert.calledOnceWithExactly(
      reqMock.paymentsRetrievalService.retrievePayments,
      'ACC-12345',
      reqMock
    );

    const dd = reqMock.app.dataDictionary;
    expect(dd).to.be.an.object();
    expect(dd.transaction_status).to.equal(
      constants.TRANSACTION_STATUS.SUCCESS
    );
    expect(dd.event_detail).to.be.an.object();
    expect(dd.event_detail.response_parameters).to.equal(payments);
    expect(dd.event_detail.request_authorization).to.equal({
      deviceid: reqMock.headers.deviceid || '',
      otpreferenceid: reqMock.headers.otpreferenceid || '',
    });
    expect(dd.event_detail.request_parameters).to.equal(reqMock.query);
  });

  it('should lookup account by MSISDN when accountNumber is missing/blank', async () => {
    const payments = [{ id: 'pmt-2' }];
    reqMock.query.accountNumber = '';
    reqMock.query.mobileNumber = '639171234567';

    reqMock.paymentsRetrievalService.getDetailsByMsisdn.resolves(
      'ACC-LOOKED-UP'
    );
    reqMock.paymentsRetrievalService.retrievePayments.resolves(payments);

    const result = await getPayments(reqMock);

    expect(result).to.equal(payments);
    Sinon.assert.calledOnceWithExactly(
      reqMock.paymentsRetrievalService.getDetailsByMsisdn,
      reqMock
    );
    Sinon.assert.calledOnceWithExactly(
      reqMock.paymentsRetrievalService.retrievePayments,
      'ACC-LOOKED-UP',
      reqMock
    );

    const dd = reqMock.app.dataDictionary;
    expect(dd).to.be.an.object();
    expect(dd.transaction_status).to.equal(
      constants.TRANSACTION_STATUS.SUCCESS
    );
    expect(dd.event_detail).to.be.an.object();
    expect(dd.event_detail.response_parameters).to.equal(payments);
    expect(dd.event_detail.request_authorization).to.equal({
      deviceid: reqMock.headers.deviceid || '',
      otpreferenceid: reqMock.headers.otpreferenceid || '',
    });
    expect(dd.event_detail.request_parameters).to.equal(reqMock.query);
  });

  it('should rethrow errors coming from retrievePayments', async () => {
    reqMock.query.accountNumber = 'ACC-ERR';
    const error = new Error('retrieve failed');
    reqMock.paymentsRetrievalService.retrievePayments.rejects(error);
    const debugStub = Sinon.stub(logger, 'debug');

    try {
      await getPayments(reqMock);
      throw new Error('Expected to throw but succeeded');
    } catch (err) {
      expect(err).to.be.instanceOf(Error);
      expect(err.message).to.equal(error.message);
      Sinon.assert.calledWithMatch(debugStub, 'API_GET_PAYMENTS_ERROR', error);

      const dd = reqMock.app.dataDictionary;
      expect(dd).to.be.an.object();
      expect(dd.event_detail).to.be.an.object();
      expect(dd.event_detail.request_authorization).to.equal({
        deviceid: reqMock.headers.deviceid || '',
        otpreferenceid: reqMock.headers.otpreferenceid || '',
      });
      expect(dd.event_detail.request_parameters).to.equal(reqMock.query);
    }
  });

  it('should throw InsufficientParameters when only startDate is provided', async () => {
    reqMock.query.accountNumber = 'ACC-12345';
    reqMock.query.startDate = '2025-01-01';
    reqMock.query.endDate = undefined;

    const debugStub = Sinon.stub(logger, 'debug');

    try {
      await getPayments(reqMock);
      throw new Error('Expected to throw but succeeded');
    } catch (err) {
      expect(err).to.exist();
      expect(err.type).to.equal('InsufficientParameters');
      Sinon.assert.notCalled(
        reqMock.paymentsRetrievalService.getDetailsByMsisdn
      );
      Sinon.assert.notCalled(reqMock.paymentsRetrievalService.retrievePayments);
      Sinon.assert.calledWithMatch(debugStub, 'API_GET_PAYMENTS_ERROR', err);

      const dd = reqMock.app.dataDictionary;
      expect(dd).to.be.an.object();
      expect(dd.event_detail).to.be.an.object();
      expect(dd.event_detail.request_authorization).to.equal({
        deviceid: reqMock.headers.deviceid || '',
        otpreferenceid: reqMock.headers.otpreferenceid || '',
      });
      expect(dd.event_detail.request_parameters).to.equal(reqMock.query);
    }
  });

  it('should throw InsufficientParameters when only endDate is provided', async () => {
    reqMock.query.accountNumber = 'ACC-12345';
    reqMock.query.startDate = undefined;
    reqMock.query.endDate = '2025-01-31';

    const debugStub = Sinon.stub(logger, 'debug');

    try {
      await getPayments(reqMock);
      throw new Error('Expected to throw but succeeded');
    } catch (err) {
      expect(err).to.exist();
      expect(err.type).to.equal('InsufficientParameters');
      Sinon.assert.notCalled(
        reqMock.paymentsRetrievalService.getDetailsByMsisdn
      );
      Sinon.assert.notCalled(reqMock.paymentsRetrievalService.retrievePayments);
      Sinon.assert.calledWithMatch(debugStub, 'API_GET_PAYMENTS_ERROR', err);

      const dd = reqMock.app.dataDictionary;
      expect(dd).to.be.an.object();
      expect(dd.event_detail).to.be.an.object();
      expect(dd.event_detail.request_authorization).to.equal({
        deviceid: reqMock.headers.deviceid || '',
        otpreferenceid: reqMock.headers.otpreferenceid || '',
      });
      expect(dd.event_detail.request_parameters).to.equal(reqMock.query);
    }
  });

  it('should throw InvalidParameter when startDate is not before endDate', async () => {
    reqMock.query.accountNumber = 'ACC-12345';
    reqMock.query.startDate = '2025-01-31';
    reqMock.query.endDate = '2025-01-31';

    const debugStub = Sinon.stub(logger, 'debug');

    try {
      await getPayments(reqMock);
      throw new Error('Expected to throw but succeeded');
    } catch (err) {
      expect(err).to.exist();
      expect(err.type).to.equal('InvalidParameter');
      Sinon.assert.notCalled(
        reqMock.paymentsRetrievalService.getDetailsByMsisdn
      );
      Sinon.assert.notCalled(reqMock.paymentsRetrievalService.retrievePayments);
      Sinon.assert.calledWithMatch(debugStub, 'API_GET_PAYMENTS_ERROR', err);

      const dd = reqMock.app.dataDictionary;
      expect(dd).to.be.an.object();
      expect(dd.event_detail).to.be.an.object();
      expect(dd.event_detail.request_authorization).to.equal({
        deviceid: reqMock.headers.deviceid || '',
        otpreferenceid: reqMock.headers.otpreferenceid || '',
      });
      expect(dd.event_detail.request_parameters).to.equal(reqMock.query);
    }
  });

  it('should set default empty request_authorization when headers are missing', async () => {
    const payments = [{ id: 'pmt-headers' }];
    reqMock.headers = { 'x-request-id': 'req-1' };
    reqMock.query.accountNumber = 'ACC-HEADERS';
    reqMock.query.mobileNumber = '';

    reqMock.paymentsRetrievalService.retrievePayments.resolves(payments);

    const result = await getPayments(reqMock);

    expect(result).to.equal(payments);
    const dd = reqMock.app.dataDictionary;
    expect(dd.transaction_status).to.equal(
      constants.TRANSACTION_STATUS.SUCCESS
    );
    expect(dd.event_detail.request_authorization).to.equal({
      deviceid: '',
      otpreferenceid: '',
    });
    expect(dd.event_detail.request_parameters).to.equal(reqMock.query);
  });

  it('should set request_parameters to empty string when query is empty string', async () => {
    const payments = [{ id: 'pmt-empty-str' }];
    reqMock.query = '';
    reqMock.headers = {
      'x-request-id': 'req-1',
      deviceid: 'dev-1',
      otpreferenceid: 'otp-1',
    };

    reqMock.paymentsRetrievalService.getDetailsByMsisdn.resolves(
      'ACC-EMPTY-STR'
    );
    reqMock.paymentsRetrievalService.retrievePayments.resolves(payments);

    const result = await getPayments(reqMock);

    expect(result).to.equal(payments);
    const dd = reqMock.app.dataDictionary;
    expect(dd.transaction_status).to.equal(
      constants.TRANSACTION_STATUS.SUCCESS
    );
    expect(dd.event_detail.request_authorization).to.equal({
      deviceid: 'dev-1',
      otpreferenceid: 'otp-1',
    });
    expect(dd.event_detail.request_parameters).to.equal('');
  });
});
