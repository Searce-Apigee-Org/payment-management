import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';

import { msisdnFormatter } from '@globetel/cxs-core/core/utils/string/index.js';
import * as constants from '../../src/util/constants.js';
import {
  getPaymentsDataDictionary,
  getPaymentsSuccessDataDictionary,
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
