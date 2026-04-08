import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import {
  addQuest,
  createPolicy,
} from '../../../src/services/v1/productOrderingService.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

let mongo;
let cxs;
let req;

beforeEach(() => {
  mongo = {
    paymentRepository: {
      findByPaymentId: Sinon.stub(),
      savePayment: Sinon.stub().resolves({}),
    },
  };
  cxs = {
    productOrderingRepository: {
      createPolicyAsync: Sinon.stub(),
      addQuest: Sinon.stub(),
    },
  };

  req = {
    payload: { tokenPaymentId: 'ANY123' },
    mongo,
    cxs,
  };

  Sinon.stub(logger, 'debug');
});

afterEach(() => {
  Sinon.restore();
});

describe('Services :: V1 :: productOrderingService :: createPolicy', () => {
  it('should call createPolicy when budgetProtectProfile exists', async () => {
    req.payload.tokenPaymentId = 'ANY123';
    mongo.paymentRepository.findByPaymentId.resolves({
      budgetProtectProfile: {},
      settlementDetails: [{ amount: 10 }],
    });
    cxs.productOrderingRepository.createPolicyAsync.resolves({});

    await createPolicy(req);

    Sinon.assert.calledOnce(cxs.productOrderingRepository.createPolicyAsync);
    const args = cxs.productOrderingRepository.createPolicyAsync.firstCall.args;
    expect(args[0]).to.equal(req);
    expect(args[1]).to.equal({ tokenPaymentId: 'ANY123', successAmount: 10 });
  });

  it('should not call createPolicy when budgetProtectProfile is null', async () => {
    req.payload.tokenPaymentId = 'ANY124';
    mongo.paymentRepository.findByPaymentId.resolves({
      budgetProtectProfile: null,
      settlementDetails: [{ amount: 20 }],
    });

    await createPolicy(req);

    Sinon.assert.notCalled(cxs.productOrderingRepository.createPolicyAsync);
  });

  it('should log and rethrow when repository createPolicy rejects', async () => {
    req.payload.tokenPaymentId = 'ANYERR';
    mongo.paymentRepository.findByPaymentId.resolves({
      budgetProtectProfile: {},
      settlementDetails: [{ amount: 42 }],
    });
    const boom = new Error('create-policy-failed');
    cxs.productOrderingRepository.createPolicyAsync.rejects(boom);

    try {
      await createPolicy(req);
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err).to.shallow.equal(boom);
      Sinon.assert.calledWithMatch(
        logger.debug,
        'PRODUCT_ORDERING_SERVICE_CREATE_POLICY_ERROR',
        boom
      );
    }
  });
});

describe('Services :: V1 :: productOrderingService :: addQuest', () => {
  const makeJwt = (payloadObj) => {
    const header = { alg: 'none', typ: 'JWT' };
    const b64url = (obj) =>
      Buffer.from(JSON.stringify(obj))
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    return `${b64url(header)}.${b64url(payloadObj)}.`;
  };

  it('should call addQuest for SUPERAPP with valid userUuid and set questIndicator from response', async () => {
    req.payload.tokenPaymentId = 'GLA-ABC-123';
    const jwt = makeJwt({ uuid: 'user-1' });
    const payments = {
      userToken: `Bearer ${jwt}`,
      settlementDetails: [
        { mobileNumber: '09171234567', transactions: [{}, {}] },
      ],
    };

    mongo.paymentRepository.findByPaymentId.resolves(payments);
    cxs.productOrderingRepository.addQuest.resolves({
      status: 200,
      questIndicator: 'Y',
    });

    await addQuest(req);

    Sinon.assert.calledOnce(cxs.productOrderingRepository.addQuest);
    const [reqArg, requestBody] =
      cxs.productOrderingRepository.addQuest.firstCall.args;
    expect(reqArg).to.equal(req);
    expect(requestBody).to.include([
      'uuid',
      'questType',
      'msisdn',
      'userToken',
    ]);
    expect(requestBody.uuid).to.equal('user-1');
    expect(requestBody.msisdn).to.equal('09171234567');
    expect(typeof requestBody.userToken).to.equal('string');
    expect(requestBody.userToken.length).to.be.greaterThan(0);

    Sinon.assert.calledOnce(mongo.paymentRepository.savePayment);
    expect(mongo.paymentRepository.savePayment.firstCall.args[1]).to.equal(
      'user-1'
    );
    const saved = mongo.paymentRepository.savePayment.firstCall.args[0];
    const txs = saved.settlementDetails[0].transactions;
    expect(txs.every((t) => t.questIndicator === 'Y')).to.be.true();
  });

  it('should set questIndicator to N on addQuest failure and still save', async () => {
    req.payload.tokenPaymentId = 'GLA-DEF-456';
    const jwt = makeJwt({ uuid: 'user-2' });
    const payments = {
      userToken: `Bearer ${jwt}`,
      settlementDetails: [
        { mobileNumber: '09181234567', transactions: [{}, {}] },
      ],
    };

    mongo.paymentRepository.findByPaymentId.resolves(payments);
    cxs.productOrderingRepository.addQuest.rejects(new Error('downstream'));

    await addQuest(req);

    Sinon.assert.calledWithMatch(
      logger.debug,
      'PRODUCT_ORDERING_SERVICE_PROCESS_SETTLEMENT_DETAILS_ERROR'
    );

    Sinon.assert.calledOnce(mongo.paymentRepository.savePayment);
    expect(mongo.paymentRepository.savePayment.firstCall.args[1]).to.equal(
      'user-2'
    );
    const saved = mongo.paymentRepository.savePayment.firstCall.args[0];
    const txs = saved.settlementDetails[0].transactions;
    expect(txs.every((t) => t.questIndicator === 'N')).to.be.true();
  });

  it('should set questIndicator to N when not SUPERAPP or missing userUuid', async () => {
    req.payload.tokenPaymentId = 'CXS-XYZ-789';
    const payments = {
      userToken: 'Bearer invalid',
      settlementDetails: [
        { mobileNumber: '09181234567', transactions: [{}, {}] },
      ],
    };

    mongo.paymentRepository.findByPaymentId.resolves(payments);

    await addQuest(req);

    Sinon.assert.notCalled(cxs.productOrderingRepository.addQuest);

    Sinon.assert.calledOnce(mongo.paymentRepository.savePayment);
    expect(mongo.paymentRepository.savePayment.firstCall.args[1]).to.equal(
      null
    );
    const saved = mongo.paymentRepository.savePayment.firstCall.args[0];
    const txs = saved.settlementDetails[0].transactions;
    expect(txs.every((t) => t.questIndicator === 'N')).to.be.true();
  });

  it('should set questIndicator to N when addQuest resolves non-200 response', async () => {
    req.payload.tokenPaymentId = 'GLA-NON200-001';
    const jwt = makeJwt({ uuid: 'user-3' });
    const payments = {
      userToken: `Bearer ${jwt}`,
      settlementDetails: [
        { mobileNumber: '09191234567', transactions: [{}, {}] },
      ],
    };

    mongo.paymentRepository.findByPaymentId.resolves(payments);
    cxs.productOrderingRepository.addQuest.resolves({
      status: 400,
      questIndicator: 'Y',
    });

    await addQuest(req);

    Sinon.assert.calledOnce(cxs.productOrderingRepository.addQuest);
    Sinon.assert.calledOnce(mongo.paymentRepository.savePayment);
    expect(mongo.paymentRepository.savePayment.firstCall.args[1]).to.equal(
      'user-3'
    );
    const saved = mongo.paymentRepository.savePayment.firstCall.args[0];
    const txs = saved.settlementDetails[0].transactions;
    expect(txs.every((t) => t.questIndicator === 'N')).to.be.true();
  });

  it('should pass empty userToken to addQuest when payments.userToken has no space/prefix', async () => {
    req.payload.tokenPaymentId = 'GLA-NOPREFIX-002';
    const jwt = makeJwt({ uuid: 'user-4' });
    const payments = {
      userToken: jwt,
      settlementDetails: [{ mobileNumber: '09170000000', transactions: [{}] }],
    };

    mongo.paymentRepository.findByPaymentId.resolves(payments);
    cxs.productOrderingRepository.addQuest.resolves({
      status: 200,
      questIndicator: 'Y',
    });

    await addQuest(req);

    Sinon.assert.calledOnce(cxs.productOrderingRepository.addQuest);
    const [reqArg, requestBody] =
      cxs.productOrderingRepository.addQuest.firstCall.args;
    expect(reqArg).to.equal(req);
    expect(requestBody.userToken).to.equal('');
    expect(requestBody.uuid).to.equal('user-4');

    Sinon.assert.calledOnce(mongo.paymentRepository.savePayment);
    expect(mongo.paymentRepository.savePayment.firstCall.args[1]).to.equal(
      'user-4'
    );
    const saved = mongo.paymentRepository.savePayment.firstCall.args[0];
    const txs = saved.settlementDetails[0].transactions;
    expect(txs.every((t) => t.questIndicator === 'Y')).to.be.true();
  });

  it('should not call addQuest and still save when settlementDetails is undefined', async () => {
    req.payload.tokenPaymentId = 'GLA-UNDEF-SETTLEMENT';
    const jwt = makeJwt({ uuid: 'user-6' });
    const payments = {
      userToken: `Bearer ${jwt}`,
    };

    mongo.paymentRepository.findByPaymentId.resolves(payments);
    cxs.productOrderingRepository.addQuest.resolves({
      status: 200,
      questIndicator: 'Y',
    });

    await addQuest(req);

    Sinon.assert.notCalled(cxs.productOrderingRepository.addQuest);
    Sinon.assert.calledOnce(mongo.paymentRepository.savePayment);
    expect(mongo.paymentRepository.savePayment.firstCall.args[1]).to.equal(
      'user-6'
    );
  });

  it('should handle null transactions without iterating on success', async () => {
    req.payload.tokenPaymentId = 'GLA-NULLTX-SUCCESS';
    const jwt = makeJwt({ uuid: 'user-7' });
    const payments = {
      userToken: `Bearer ${jwt}`,
      settlementDetails: [{ mobileNumber: '09171111111', transactions: null }],
    };

    mongo.paymentRepository.findByPaymentId.resolves(payments);
    cxs.productOrderingRepository.addQuest.resolves({
      status: 200,
      questIndicator: 'Y',
    });

    await addQuest(req);

    Sinon.assert.calledOnce(cxs.productOrderingRepository.addQuest);
    Sinon.assert.calledOnce(mongo.paymentRepository.savePayment);
    expect(mongo.paymentRepository.savePayment.firstCall.args[1]).to.equal(
      'user-7'
    );
    const saved = mongo.paymentRepository.savePayment.firstCall.args[0];
    expect(saved.settlementDetails[0].transactions).to.equal(null);
  });

  it('should handle null transactions without iterating on failure', async () => {
    req.payload.tokenPaymentId = 'GLA-NULLTX-FAIL';
    const jwt = makeJwt({ uuid: 'user-8' });
    const payments = {
      userToken: `Bearer ${jwt}`,
      settlementDetails: [{ mobileNumber: '09172222222', transactions: null }],
    };

    mongo.paymentRepository.findByPaymentId.resolves(payments);
    cxs.productOrderingRepository.addQuest.rejects(new Error('downstream'));

    await addQuest(req);

    Sinon.assert.calledWithMatch(
      logger.debug,
      'PRODUCT_ORDERING_SERVICE_PROCESS_SETTLEMENT_DETAILS_ERROR'
    );
    Sinon.assert.calledOnce(mongo.paymentRepository.savePayment);
    expect(mongo.paymentRepository.savePayment.firstCall.args[1]).to.equal(
      'user-8'
    );
    const saved = mongo.paymentRepository.savePayment.firstCall.args[0];
    expect(saved.settlementDetails[0].transactions).to.equal(null);
  });

  it('should pass empty userToken when payments.userToken becomes undefined after uuid extraction', async () => {
    req.payload.tokenPaymentId = 'GLA-TOGGLE-TOKEN';
    const jwt = makeJwt({ uuid: 'user-9' });

    let accessCount = 0;
    const payments = {
      settlementDetails: [{ mobileNumber: '09174444444', transactions: [{}] }],
    };
    Object.defineProperty(payments, 'userToken', {
      configurable: true,
      enumerable: true,
      get() {
        accessCount += 1;
        return accessCount === 1 ? `Bearer ${jwt}` : undefined;
      },
    });

    mongo.paymentRepository.findByPaymentId.resolves(payments);
    cxs.productOrderingRepository.addQuest.resolves({
      status: 200,
      questIndicator: 'Y',
    });

    await addQuest(req);

    Sinon.assert.calledOnce(cxs.productOrderingRepository.addQuest);
    const [reqArg, requestBody] =
      cxs.productOrderingRepository.addQuest.firstCall.args;
    expect(reqArg).to.equal(req);
    expect(requestBody.userToken).to.equal('');
    expect(requestBody.uuid).to.equal('user-9');

    Sinon.assert.calledOnce(mongo.paymentRepository.savePayment);
    expect(mongo.paymentRepository.savePayment.firstCall.args[1]).to.equal(
      'user-9'
    );
    const saved = mongo.paymentRepository.savePayment.firstCall.args[0];
    const txs = saved.settlementDetails[0].transactions;
    expect(txs.every((t) => t.questIndicator === 'Y')).to.be.true();
  });

  it('should log and rethrow on unexpected error (e.g., findByPaymentId rejects)', async () => {
    req.payload.tokenPaymentId = 'GLA-ERR-123';
    const err = new Error('db-fail');
    mongo.paymentRepository.findByPaymentId.rejects(err);

    try {
      await addQuest(req);
      throw new Error('Expected failure but succeeded');
    } catch (e) {
      expect(e).to.shallow.equal(err);
      Sinon.assert.calledWithMatch(
        logger.debug,
        'PRODUCT_ORDERING_SERVICE_ADD_QUEST_ERROR'
      );
    }
  });
});
