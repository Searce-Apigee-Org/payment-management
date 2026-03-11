import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { updateOnBuyLoad } from '../../../src/services/v1/paymentService.js';
import * as constants from '../../../src/util/constants.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Service :: V1 :: paymentService :: updateOnBuyLoad', () => {
  let req;
  let paymentEntity;

  const buildBearerTokenWithUuid = (uuid = 'user-uuid-1') => {
    const header = Buffer.from(
      JSON.stringify({ alg: 'none', typ: 'JWT' })
    ).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ uuid })).toString('base64url');
    const signature = Buffer.from('sig').toString('base64url');
    return `Bearer ${header}.${payload}.${signature}`;
  };

  beforeEach(() => {
    paymentEntity = {
      userToken: buildBearerTokenWithUuid('uuid-1'),
      settlementDetails: [
        {
          provisionedAmount: undefined,
          transactions: [
            { amount: 10, provisionStatus: '', transactionId: '' },
            { amount: 5, provisionStatus: '', transactionId: '' },
            { amount: null, provisionStatus: '', transactionId: '' },
          ],
        },
        {
          transactions: [{ amount: 1, provisionStatus: '', transactionId: '' }],
        },
      ],
    };

    req = {
      payload: { tokenPaymentId: 'TPID-1' },
      payment: {
        customerPaymentsRepository: {
          findOne: Sinon.stub().resolves(paymentEntity),
          save: Sinon.stub().resolves({ success: true }),
        },
      },
    };

    Sinon.stub(logger, 'debug');
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should set provisionStatus + transactionId on all settlement transactions, compute provisionedAmount on success, and save with userUuid', async () => {
    await updateOnBuyLoad(req, constants.STATUS.SUCCESS, 'AMAX-TX-1');

    for (const settlementDetail of paymentEntity.settlementDetails) {
      for (const t of settlementDetail.transactions) {
        expect(t.provisionStatus).to.equal(constants.STATUS.SUCCESS);
        expect(t.transactionId).to.equal('AMAX-TX-1');
      }
    }

    expect(paymentEntity.settlementDetails[0].provisionedAmount).to.equal(15);

    Sinon.assert.calledOnce(req.payment.customerPaymentsRepository.save);
    const [tokenPaymentId, userUuid, reqArg] =
      req.payment.customerPaymentsRepository.save.firstCall.args;

    expect(tokenPaymentId).to.equal('TPID-1');
    expect(userUuid).to.equal('uuid-1');
    expect(reqArg).to.equal(req);

    // Verify the paymentEntity was modified correctly
    expect(typeof paymentEntity.lastUpdatedDate).to.equal('string');
  });

  it('should not set provisionedAmount when provisionStatus is FAILED', async () => {
    await updateOnBuyLoad(req, constants.STATUS.FAILED, 'AMAX-TX-2');

    expect(paymentEntity.settlementDetails[0].provisionedAmount).to.equal(
      undefined
    );
    Sinon.assert.calledOnce(req.payment.customerPaymentsRepository.save);
  });

  it('should log and rethrow when findByPaymentId rejects', async () => {
    const boom = new Error('db fail');
    req.payment.customerPaymentsRepository.findOne.rejects(boom);

    try {
      await updateOnBuyLoad(req, constants.STATUS.SUCCESS, 'AMAX-TX-3');
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err).to.shallow.equal(boom);
      Sinon.assert.calledWithMatch(
        logger.debug,
        'PAYMENT_SERVICE_UPDATE_ON_BUYLOAD_ERROR',
        boom
      );
      Sinon.assert.notCalled(req.payment.customerPaymentsRepository.save);
    }
  });
});
