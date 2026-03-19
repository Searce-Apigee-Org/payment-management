import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import jwt from 'jsonwebtoken';
import Sinon from 'sinon';
import {
  createSignedPaymentsToken,
  getDetailsByMsisdn,
  retrievePayments,
} from '../../../src/services/v1/paymentsRetrievalService.js';
import { constants } from '../../../src/util/index.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Service :: PaymentsRetrievalService :: retrievePayments', () => {
  let secretManager;
  let rudy;
  let headers;
  let secretManagerClient;
  let http;

  beforeEach(() => {
    secretManager = {
      rudyRepository: {
        getRudyAuthCredentials: Sinon.stub(),
        getPaymentsCredentials: Sinon.stub(),
      },
    };

    rudy = {
      rudyRepository: {
        getPayments: Sinon.stub(),
      },
    };

    headers = {};
    secretManagerClient = { client: 'dummy' };
    http = {};
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should retrieve and filter payments, signing payload with mobileNumber when user uuid is not present', async () => {
    const accountNumber = 'ACC-1';
    const startDate = '2025-01-01';
    const endDate = '2025-01-31';
    const mobileNumber = '639171234567';

    const req = {
      rudy,
      secretManager,
      secretManagerClient,
      http,
      headers,
      pre: {},
      paymentsRetrievalService: { createSignedPaymentsToken },
      query: { startDate, endDate, mobileNumber },
    };

    const paymentsRaw = [
      {
        printable: '1',
        notified: '0',
        paymentAmount: 100.5,
        paymentDate: '20250105',
        accountId: 'ACC-1',
        msisdn: '639171234567',
        orId: 'OR-1',
        paymentSourceId: 'SRC-1',
        loadTime: '2025-01-05 12:30:00',
        extra: 'keep',
      },
      {
        printable: '0',
        notified: '1',
        paymentAmount: 50.0,
        paymentDate: '20250301',
        accountId: 'ACC-1',
        msisdn: '639171234567',
        orId: 'OR-2',
        paymentSourceId: 'SRC-2',
        loadTime: '2025-03-01 08:00:00',
      },
    ];

    secretManager.rudyRepository.getRudyAuthCredentials.resolves('auth-cred');
    secretManager.rudyRepository.getPaymentsCredentials.resolves('jwt-secret');
    rudy.rudyRepository.getPayments.resolves(paymentsRaw);

    const result = await retrievePayments(accountNumber, req);

    expect(result.payments).to.equal([
      {
        amount: 100.5,
        date: '2025-01-05',
        accountNumber: 'ACC-1',
        mobileNumber: '639171234567',
        receiptId: 'OR-1',
        sourceId: 'SRC-1',
        printable: true,
        notified: false,
        loadTime: '2025-01-05T12:30:00',
        extra: 'keep',
      },
    ]);
    expect(result.token).to.be.a.string();
    expect(result.token.split('.')).to.have.length(3);

    Sinon.assert.calledOnceWithExactly(
      secretManager.rudyRepository.getRudyAuthCredentials,
      secretManagerClient,
      constants.DOWNSTREAM.RUDY,
      constants.SECRET_ENTITY.AUTH_CREDS
    );
    Sinon.assert.calledOnceWithExactly(
      rudy.rudyRepository.getPayments,
      http,
      'ACC-1',
      'auth-cred'
    );
    Sinon.assert.calledOnceWithExactly(
      secretManager.rudyRepository.getPaymentsCredentials,
      secretManagerClient
    );
  });

  it('should sign payload with user-uuid when user uuid is present', async () => {
    const accountNumber = 'ACC-1';
    const startDate = '2025-01-01';
    const endDate = '2025-01-31';
    const mobileNumber = '639171234567';

    const req = {
      rudy,
      secretManager,
      secretManagerClient,
      http,
      headers,
      pre: { user: { uuid: 'uuid-777' } },
      paymentsRetrievalService: { createSignedPaymentsToken },
      query: { startDate, endDate, mobileNumber },
    };

    const paymentsRaw = [
      {
        printable: '1',
        notified: '0',
        paymentAmount: 100.5,
        paymentDate: '20250105',
        accountId: 'ACC-1',
        msisdn: '639171234567',
        orId: 'OR-1',
        paymentSourceId: 'SRC-1',
        loadTime: '2025-01-05 12:30:00',
      },
      {
        printable: '0',
        notified: '1',
        paymentAmount: 50.0,
        paymentDate: '20250301',
        accountId: 'ACC-1',
        msisdn: '639171234567',
        orId: 'OR-2',
        paymentSourceId: 'SRC-2',
        loadTime: '2025-03-01 08:00:00',
      },
    ];

    secretManager.rudyRepository.getRudyAuthCredentials.resolves('auth-cred');
    secretManager.rudyRepository.getPaymentsCredentials.resolves('jwt-secret');
    rudy.rudyRepository.getPayments.resolves(paymentsRaw);

    const result = await retrievePayments(accountNumber, req);

    expect(result.payments).to.equal([
      {
        amount: 100.5,
        date: '2025-01-05',
        accountNumber: 'ACC-1',
        mobileNumber: '639171234567',
        receiptId: 'OR-1',
        sourceId: 'SRC-1',
        printable: true,
        notified: false,
        loadTime: '2025-01-05T12:30:00',
      },
    ]);
    expect(result.token).to.be.a.string();
    expect(result.token.split('.')).to.have.length(3);

    Sinon.assert.calledOnceWithExactly(
      secretManager.rudyRepository.getRudyAuthCredentials,
      secretManagerClient,
      constants.DOWNSTREAM.RUDY,
      constants.SECRET_ENTITY.AUTH_CREDS
    );
    Sinon.assert.calledOnceWithExactly(
      rudy.rudyRepository.getPayments,
      http,
      'ACC-1',
      'auth-cred'
    );
    Sinon.assert.calledOnceWithExactly(
      secretManager.rudyRepository.getPaymentsCredentials,
      secretManagerClient
    );
  });

  it('should rethrow errors from rudy.getPayments', async () => {
    secretManager.rudyRepository.getRudyAuthCredentials.resolves('auth-cred');
    rudy.rudyRepository.getPayments.rejects(new Error('rudy failed'));

    const req = {
      rudy,
      secretManager,
      secretManagerClient,
      http,
      headers,
      pre: {},
      paymentsRetrievalService: { createSignedPaymentsToken },
      query: {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        mobileNumber: '639171234567',
      },
    };

    try {
      await retrievePayments('ACC-ERR', req);
      throw new Error('Expected to throw but succeeded');
    } catch (err) {
      expect(err).to.be.instanceOf(Error);
      expect(err.message).to.equal('rudy failed');
    }
  });

  it('should log and rethrow when signing token fails', async () => {
    const accountNumber = 'ACC-1';
    const startDate = '2025-01-01';
    const endDate = '2025-01-31';
    const mobileNumber = '639171234567';

    const req = {
      rudy,
      secretManager,
      secretManagerClient,
      http,
      headers,
      pre: {},
      paymentsRetrievalService: { createSignedPaymentsToken },
      query: { startDate, endDate, mobileNumber },
    };

    const paymentsRaw = [{ orId: 'OR-ERR', paymentDate: '20250105' }];

    secretManager.rudyRepository.getRudyAuthCredentials.resolves('auth-cred');
    secretManager.rudyRepository.getPaymentsCredentials.resolves(undefined);
    rudy.rudyRepository.getPayments.resolves(paymentsRaw);

    const debugStub = Sinon.stub(logger, 'debug');

    try {
      await retrievePayments(accountNumber, req);
      throw new Error('Expected to throw but succeeded');
    } catch (err) {
      expect(err).to.be.instanceOf(Error);
      Sinon.assert.calledWithMatch(
        debugStub,
        'CREATE_SIGNED_PAYMENTS_TOKEN_ERROR',
        Sinon.match.instanceOf(Error)
      );
    }
  });
});

describe('Service :: PaymentsRetrievalService :: getDetailsByMsisdn', () => {
  let hip;

  beforeEach(() => {
    hip = {
      interimRepository: {
        getDetailsByMSISDN: Sinon.stub(),
      },
    };
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should return AccountNo when SubscriberHeader is not blank', async () => {
    hip.interimRepository.getDetailsByMSISDN.resolves({
      SubscriberHeader: 'some-subscriber',
      BillingArrangementHeader: { AccountIdInfo: { AccountNo: 'ACC-123' } },
    });

    const req = {
      hip,
      query: { mobileNumber: '639171234567' },
    };

    const res = await getDetailsByMsisdn(req);

    expect(res).to.equal('ACC-123');
    Sinon.assert.calledOnceWithExactly(
      hip.interimRepository.getDetailsByMSISDN,
      req,
      { MSISDN: '639171234567' }
    );
  });

  it('should return empty string when AccountNo is falsy', async () => {
    hip.interimRepository.getDetailsByMSISDN.resolves({
      SubscriberHeader: 'ok',
      BillingArrangementHeader: { AccountIdInfo: { AccountNo: null } },
    });

    const req = {
      hip,
      query: { mobileNumber: '639171234567' },
    };

    const res = await getDetailsByMsisdn(req);

    expect(res).to.equal('');
  });

  it("should throw { type: 'InvalidAccount' } when SubscriberHeader is blank", async () => {
    hip.interimRepository.getDetailsByMSISDN.resolves({
      SubscriberHeader: '',
      BillingArrangementHeader: { AccountIdInfo: { AccountNo: 'IGNORED' } },
    });

    const req = {
      hip,
      query: { mobileNumber: '639171234567' },
    };

    try {
      await getDetailsByMsisdn(req);
      throw new Error('Expected to throw but succeeded');
    } catch (err) {
      expect(err).to.exist();
      expect(err.type).to.equal('InvalidAccount');
    }
  });

  it('should rethrow repository errors', async () => {
    hip.interimRepository.getDetailsByMSISDN.rejects(new Error('hip failed'));

    const req = {
      hip,
      query: { mobileNumber: '639171234567' },
    };

    try {
      await getDetailsByMsisdn(req);
      throw new Error('Expected to throw but succeeded');
    } catch (err) {
      expect(err).to.be.instanceOf(Error);
      expect(err.message).to.equal('hip failed');
    }
  });
});

describe('Service :: PaymentsRetrievalService :: createSignedPaymentsToken', () => {
  let secretManager;
  let secretManagerClient;

  beforeEach(() => {
    secretManager = {
      rudyRepository: {
        getPaymentsCredentials: Sinon.stub(),
      },
    };
    secretManagerClient = { client: 'dummy' };
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should sign payload with receiptIds and user-uuid when user is present', async () => {
    const payments = [{ orId: 'OR-1' }, { orId: 'OR-2' }];
    const req = {
      secretManager,
      secretManagerClient,
      pre: { user: { uuid: 'uuid-777' } },
      query: { mobileNumber: '639171234567' },
    };

    secretManager.rudyRepository.getPaymentsCredentials.resolves('jwt-secret');

    const token = await createSignedPaymentsToken(payments, req);

    expect(token).to.be.a.string();
    expect(token.split('.')).to.have.length(3);

    const decoded = jwt.decode(token);
    expect(decoded).to.exist();
    expect(decoded['user-uuid']).to.equal('uuid-777');
    expect(decoded.mobileNumber).to.be.undefined();
    expect(decoded.receiptIds).to.equal(['OR-1', 'OR-2']);

    Sinon.assert.calledOnceWithExactly(
      secretManager.rudyRepository.getPaymentsCredentials,
      secretManagerClient
    );
  });

  it('should sign payload with receiptIds and mobileNumber when user is not present', async () => {
    const payments = [{ orId: 'OR-1' }, { orId: 'OR-3' }];
    const req = {
      secretManager,
      secretManagerClient,
      pre: {},
      query: { mobileNumber: '639171234567' },
    };

    secretManager.rudyRepository.getPaymentsCredentials.resolves('jwt-secret');

    const token = await createSignedPaymentsToken(payments, req);

    expect(token).to.be.a.string();
    expect(token.split('.')).to.have.length(3);

    const decoded = jwt.decode(token);
    expect(decoded).to.exist();
    expect(decoded.mobileNumber).to.equal('639171234567');
    expect(decoded['user-uuid']).to.be.undefined();
    expect(decoded.receiptIds).to.equal(['OR-1', 'OR-3']);
  });

  it('should log and rethrow when signing fails', async () => {
    const payments = [{ orId: 'OR-1' }];
    const req = {
      secretManager,
      secretManagerClient,
      pre: {},
      query: { mobileNumber: '639171234567' },
    };

    secretManager.rudyRepository.getPaymentsCredentials.resolves('jwt-secret');

    const debugStub = Sinon.stub(logger, 'debug');
    const signStub = Sinon.stub(jwt, 'sign').throws(new Error('sign failed'));

    try {
      await createSignedPaymentsToken(payments, req);
      throw new Error('Expected to throw but succeeded');
    } catch (err) {
      expect(err).to.be.instanceOf(Error);
      expect(err.message).to.equal('sign failed');
      Sinon.assert.calledWithMatch(
        debugStub,
        'CREATE_SIGNED_PAYMENTS_TOKEN_ERROR',
        Sinon.match.instanceOf(Error)
      );
      expect(signStub.called).to.be.true();
    }
  });
});
