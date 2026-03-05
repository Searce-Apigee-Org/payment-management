import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import moment from 'moment';
import sinon from 'sinon';
import { paymentTransactionDetailsService } from '../../../src/services/common/index.js';

const lab = Lab.script();
const { describe, it, afterEach } = lab;
export { lab };

describe('Services :: common :: paymentTransactionDetailsService :: updateProvisionStatusAndProductAttributes', () => {
  afterEach(() => sinon.restore());

  const buildReq = (settlementDetails = [{}]) => ({
    provisionStatus: { status: 'SUCCESS' },
    productAttributes: { attr: 'val' },
    tokenPaymentId: '12345',
    paymentDetails: { settlementDetails },
    mongo: {
      customerPaymentRepository: {
        updateCustomerPaymentInfo: sinon.stub().resolves(),
      },
    },
  });

  it('updates existing transaction at index 0 when transactions array is present', async () => {
    const req = buildReq([{ transactions: [{ id: 'old' }] }]);

    await paymentTransactionDetailsService.updateProvisionStatusAndProductAttributes(
      req
    );

    const updateCall =
      req.mongo.customerPaymentRepository.updateCustomerPaymentInfo.firstCall
        .args[1];
    expect(updateCall.settlementDetails[0].transactions[0]).to.include({
      id: 'old',
      status: 'SUCCESS',
    });
  });

  it('pushes new status when transactions array is empty', async () => {
    const req = buildReq([{ transactions: [] }]);

    await paymentTransactionDetailsService.updateProvisionStatusAndProductAttributes(
      req
    );

    const updateCall =
      req.mongo.customerPaymentRepository.updateCustomerPaymentInfo.firstCall
        .args[1];
    expect(updateCall.settlementDetails[0].transactions).to.have.length(1);
    expect(updateCall.settlementDetails[0].transactions[0].status).to.equal(
      'SUCCESS'
    );
  });

  it('handles missing transactions property by initializing array and pushing status', async () => {
    const req = buildReq([{}]);

    await paymentTransactionDetailsService.updateProvisionStatusAndProductAttributes(
      req
    );

    const updateCall =
      req.mongo.customerPaymentRepository.updateCustomerPaymentInfo.firstCall
        .args[1];
    expect(updateCall.settlementDetails[0].transactions[0].status).to.equal(
      'SUCCESS'
    );
  });

  it('logs and throws error when repository update fails', async () => {
    const req = buildReq();
    req.mongo.customerPaymentRepository.updateCustomerPaymentInfo.rejects(
      new Error('DB_ERROR')
    );

    await expect(
      paymentTransactionDetailsService.updateProvisionStatusAndProductAttributes(
        req
      )
    ).to.reject('DB_ERROR');
  });

  it('sets lastUpdateDate in correct ISO format', async () => {
    const req = buildReq();
    const now = moment().utc().format('YYYY-MM-DDTHH:mm:ss');

    await paymentTransactionDetailsService.updateProvisionStatusAndProductAttributes(
      req
    );

    const updateCall =
      req.mongo.customerPaymentRepository.updateCustomerPaymentInfo.firstCall
        .args[1];
    expect(updateCall.lastUpdateDate).to.startWith(now);
  });
});
