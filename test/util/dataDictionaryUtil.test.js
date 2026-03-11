import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';

import { msisdnFormatter } from '@globetel/cxs-core/core/utils/string/index.js';
import * as constants from '../../src/util/constants.js';
import {
  finalizeBuyLoadDataDictionary,
  getPaymentsDataDictionary,
  getPaymentsSuccessDataDictionary,
  initializeBuyLoadDataDictionary,
} from '../../src/util/dataDictionaryUtil.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Util :: dataDictionaryUtil :: getPaymentsDataDictionary', () => {
  beforeEach(() => {
    Sinon.restore();
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should build base data dictionary from query (episode, msisdn, account_number) and delegate to dataDictionary', async () => {
    const req = {
      app: {},
      query: {
        mobileNumber: '639171234567',
        accountNumber: 'ACC-1',
        extra: 'q',
      },
    };

    const expectedData = {
      episode: constants.EPISODES.PAY,
      msisdn: `${msisdnFormatter('639171234567')}`,
      account_number: 'ACC-1',
    };

    await getPaymentsDataDictionary(req);

    expect(req.app.dataDictionary).to.equal(expectedData);
  });

  it('should default to empty strings when query is missing', async () => {
    const req = { app: {}, query: undefined };

    const expectedData = {
      episode: constants.EPISODES.PAY,
      msisdn: '',
      account_number: '',
    };

    await getPaymentsDataDictionary(req);

    expect(req.app.dataDictionary).to.equal(expectedData);
  });
});

describe('Util :: dataDictionaryUtil :: getPaymentsSuccessDataDictionary', () => {
  beforeEach(() => {
    Sinon.restore();
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should set top-level transaction_status: SUCCESS and event_detail to provided object', async () => {
    const req = { app: {} };
    const eventDetail = {
      request_authorization: { deviceid: 'dev-123', otpreferenceid: 'otp-999' },
      request_parameters: {
        mobileNumber: '639171234567',
        accountNumber: 'ACC-1',
      },
      response_parameters: [{ id: 1 }],
    };

    const expectedData = {
      transaction_status: constants.TRANSACTION_STATUS.SUCCESS,
      event_detail: eventDetail,
    };

    await getPaymentsSuccessDataDictionary(req, eventDetail);

    expect(req.app.dataDictionary).to.equal(expectedData);
  });

  it('should merge with existing dataDictionary keeping base fields and adding success fields', async () => {
    const base = {
      episode: constants.EPISODES.PAY,
      msisdn: '0917xxxxxxx',
      account_number: 'ACC-1',
    };
    const req = { app: { dataDictionary: { ...base } } };
    const eventDetail = { response_parameters: { ok: true }, meta: { t: 1 } };

    const expectedData = {
      ...base,
      transaction_status: constants.TRANSACTION_STATUS.SUCCESS,
      event_detail: eventDetail,
    };

    await getPaymentsSuccessDataDictionary(req, eventDetail);

    expect(req.app.dataDictionary).to.equal(expectedData);
  });
});

describe('Util :: dataDictionaryUtil :: initializeBuyLoadDataDictionary', () => {
  beforeEach(() => {
    Sinon.restore();
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should set buyload base dictionary without optional keyword/wallet when undefined', async () => {
    const req = { app: {} };

    initializeBuyLoadDataDictionary(
      req,
      constants.CHANNEL.SUPERAPP,
      '639171234567',
      'SUPERAPP123',
      '50',
      undefined,
      undefined
    );

    expect(req.app.dataDictionary).to.equal({
      channel: constants.CHANNEL.SUPERAPP,
      event_detail: {
        token_payment_id: 'SUPERAPP123',
        request_authorization: {},
        request_parameters: {
          customer_id: '639171234567',
          token_payment_id: 'SUPERAPP123',
          amount: '50',
        },
      },
    });
  });

  it('should include keyword/wallet even when null (since only undefined is excluded)', async () => {
    const req = { app: {} };

    initializeBuyLoadDataDictionary(
      req,
      constants.CHANNEL.GLOBE_ONLINE,
      '09171234567',
      'GO123',
      100,
      null,
      null
    );

    expect(req.app.dataDictionary).to.equal({
      channel: constants.CHANNEL.GLOBE_ONLINE,
      event_detail: {
        token_payment_id: 'GO123',
        request_authorization: {},
        request_parameters: {
          customer_id: '09171234567',
          token_payment_id: 'GO123',
          amount: 100,
          keyword: null,
          wallet: null,
        },
      },
    });
  });
});

describe('Util :: dataDictionaryUtil :: finalizeBuyLoadDataDictionary', () => {
  let req;
  let paymentEntity;
  let buyLoadEntity;

  beforeEach(() => {
    Sinon.restore();

    paymentEntity = {
      tokenPaymentId: 'TPID-1',
      userToken: '',
      deviceId: '',
      settlementDetails: [
        {
          provisionedAmount: 150,
          transactions: [{ transactionId: 'TXN-1' }],
        },
      ],
    };

    buyLoadEntity = { transactionId: 'TXN-1', foo: 'bar' };

    req = {
      app: {},
      payment: {
        customerPaymentsRepository: {
          findOne: Sinon.stub().resolves(paymentEntity),
        },
      },
      transactions: {
        buyLoadTransactionsRepository: {
          findOne: Sinon.stub().resolves(buyLoadEntity),
        },
      },
    };
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should build the final buyload data dictionary using payment + buyload mongo records', async () => {
    await finalizeBuyLoadDataDictionary(req, 'TPID-1');

    // Verify the repositories were called correctly
    Sinon.assert.calledOnce(req.payment.customerPaymentsRepository.findOne);
    Sinon.assert.calledWithExactly(
      req.payment.customerPaymentsRepository.findOne,
      'TPID-1',
      req
    );

    Sinon.assert.calledOnce(
      req.transactions.buyLoadTransactionsRepository.findOne
    );
    Sinon.assert.calledWithExactly(
      req.transactions.buyLoadTransactionsRepository.findOne,
      'TXN-1'
    );

    // NOTE: finalizeBuyLoadDataDictionary mutates paymentEntity.settlementDetails to a sanitized object
    expect(req.app.dataDictionary).to.equal({
      user_token: '',
      channel_login_id: '',
      unique_session_identifier: '',
      platform: constants.PLATFORMS.APP,
      event_detail: {
        payment_session_information: {
          tokenPaymentId: 'TPID-1',
          userToken: '',
          deviceId: '',
          settlementDetails: {
            transactions: [{ transactionId: 'TXN-1' }],
          },
        },
        mongo_db_records: {
          payment_entity: {
            tokenPaymentId: 'TPID-1',
            userToken: '',
            deviceId: '',
            settlementDetails: {
              transactions: [{ transactionId: 'TXN-1' }],
            },
          },
          buyload_entity: { transactionId: 'TXN-1', foo: 'bar' },
        },
        result: { transactionId: 'TXN-1', foo: 'bar', provisioned_amount: 150 },
      },
    });
  });

  it('should default buyload_entity/result to empty object when no transactionId exists on the payment', async () => {
    const paymentEntityNoTxn = {
      tokenPaymentId: 'TPID-2',
      userToken: '',
      deviceId: '',
      settlementDetails: [{ provisionedAmount: null, transactions: [{}] }],
    };

    req.payment.customerPaymentsRepository.findOne.resolves(paymentEntityNoTxn);

    await finalizeBuyLoadDataDictionary(req, 'TPID-2');

    Sinon.assert.calledOnce(req.payment.customerPaymentsRepository.findOne);
    Sinon.assert.calledWithExactly(
      req.payment.customerPaymentsRepository.findOne,
      'TPID-2',
      req
    );

    // Should NOT call findOne on transactions repository since there's no transactionId
    Sinon.assert.notCalled(
      req.transactions.buyLoadTransactionsRepository.findOne
    );

    expect(req.app.dataDictionary.event_detail.result).to.equal({
      provisioned_amount: '',
    });
    expect(
      req.app.dataDictionary.event_detail.mongo_db_records.buyload_entity
    ).to.equal({});
  });
});
