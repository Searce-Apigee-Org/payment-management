import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import { constants, getPaymentSessionUtil } from '../../src/util/index.js';

const lab = Lab.script();
const { describe, it } = lab;

export { lab };

describe('Util :: getPaymentSessionUtil :: checkXendit', () => {
  it('should return false when paymentType is XENDIT and refund exists', () => {
    const paymentDetails = {
      paymentType: constants.PAYMENT_TYPES.XENDIT,
      settlementDetails: [{ refund: true }],
    };
    expect(getPaymentSessionUtil.checkXendit(paymentDetails)).to.be.false();
  });

  it('should return true when paymentType is not XENDIT', () => {
    const paymentDetails = {
      paymentType: 'OTHER',
      settlementDetails: [{ refund: true }],
    };
    expect(getPaymentSessionUtil.checkXendit(paymentDetails)).to.be.true();
  });

  it('should return true when no refund exists', () => {
    const paymentDetails = {
      paymentType: constants.PAYMENT_TYPES.XENDIT,
      settlementDetails: [{}],
    };
    expect(getPaymentSessionUtil.checkXendit(paymentDetails)).to.be.true();
  });

  it('should return true when settlementDetails is missing', () => {
    const paymentDetails = {
      paymentType: constants.PAYMENT_TYPES.XENDIT,
    };
    expect(getPaymentSessionUtil.checkXendit(paymentDetails)).to.be.true();
  });
});

describe('Util :: getPaymentSessionUtil :: filterPaymentDetails', () => {
  it('should update transactions for ECPAY request type', () => {
    const settlementDetail = {
      requestType: constants.PAYMENT_REQUEST_TYPES.ECPAY,
      transactions: [
        { transactionId: '123', processingFee: 5, questFlag: 'true' },
      ],
    };

    getPaymentSessionUtil.filterPaymentDetails(settlementDetail);

    expect(settlementDetail.transactions[0].transactionId).to.equal('123');
    expect(settlementDetail.transactions[0].processingFee).to.be.null();
    expect(settlementDetail.transactions[0].questFlag).to.be.null();
  });

  it('should handle BBPREPAIDPROMO with GCASH_AUTHORISED status', () => {
    const settlementDetail = {
      requestType: constants.PAYMENT_REQUEST_TYPES.BBPREPAIDPROMO,
      status: 'GCASH_AUTHORISED',
      orderId: 'order-1',
    };

    getPaymentSessionUtil.filterPaymentDetails(settlementDetail);

    expect(settlementDetail.transactions).to.be.an.array();
    expect(
      settlementDetail.transactions[0].createOrderExternal.orderId
    ).to.equal('order-1');
    expect(
      settlementDetail.transactions[0].createOrderExternal.status
    ).to.equal(constants.PAYMENT_STATUS.SUCCESS);
  });

  it('should handle BBPREPAIDREPAIR with GCASH_AUTHORISED status', () => {
    const settlementDetail = {
      requestType: constants.PAYMENT_REQUEST_TYPES.BBPREPAIDREPAIR,
      status: 'GCASH_AUTHORISED',
      orderId: 'order-2',
      appointmentId: 'apt-1',
    };

    getPaymentSessionUtil.filterPaymentDetails(settlementDetail);

    expect(settlementDetail.transactions).to.be.an.array();
    const tx = settlementDetail.transactions[0];
    expect(tx.createOrderExternal.orderId).to.equal('order-2');
    expect(tx.createOrderExternal.status).to.equal(
      constants.PAYMENT_STATUS.SUCCESS
    );
    expect(tx.appointmentBooking.appointmentId).to.equal('apt-1');
    expect(tx.appointmentBooking.status).to.equal(
      constants.PAYMENT_STATUS.SUCCESS
    );
  });

  it('should set FAILED status if orderId or appointmentId is null', () => {
    const settlementDetail = {
      requestType: constants.PAYMENT_REQUEST_TYPES.BBPREPAIDREPAIR,
      status: 'GCASH_AUTHORISED',
      orderId: null,
      appointmentId: null,
    };

    getPaymentSessionUtil.filterPaymentDetails(settlementDetail);

    const tx = settlementDetail.transactions[0];
    expect(tx.createOrderExternal.status).to.equal(
      constants.PAYMENT_STATUS.FAILED
    );
    expect(tx.appointmentBooking.status).to.equal(
      constants.PAYMENT_STATUS.FAILED
    );
  });
});
