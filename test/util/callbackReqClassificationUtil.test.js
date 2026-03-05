import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Decimal from 'decimal.js';

import {
  classifyByRequestType,
  classifyNonTransactionalRequests,
  classifyRequestForChangeSim,
  classifyRequestForGFP,
} from '../../src/util/callbackReqClassificationUtil.js';
import { callbackUtil, constants } from '../../src/util/index.js';
import { buildMockPaymentEntity } from '../mocks/paymentSessionCallbackMocks.js';

const lab = Lab.script();
const { describe, it } = lab;
export { lab };

const buildReq = (overrides = {}) => ({
  app: {
    cxs: {
      accountsForBuyLoad: [],
      accountsForBuyRoaming: [],
      accountsForBuyPromo: [],
      accountsForBuyVoucher: [],
      volumeBoostPayload: [],
      accountsForECPay: [],
      accountsForCreatePolicy: [],
      accountsPrepaidFiberService: [],
      accountsPrepaidFiberRepair: [],
      isECPayPaymentType: false,
      accountsForCSPayment: [],
      ...overrides,
    },
  },
});

const firstSettlement = (paymentEntity) => paymentEntity.settlementDetails[0];

describe('Utils :: paymentSessionCallbackClassifier :: classifyByRequestType', () => {
  it('BUY_LOAD pushes one entry per transaction into accountsForBuyLoad', () => {
    const req = buildReq();
    const payment = buildMockPaymentEntity('BuyLoad_Txn');
    const settlement = firstSettlement(payment);

    classifyByRequestType(
      payment.tokenPaymentId,
      settlement,
      req,
      'CH1',
      'XENDIT'
    );

    expect(req.app.cxs.accountsForBuyLoad.length).to.equal(
      settlement.transactions.length
    );
  });

  it('BUY_PROMO pushes aggregated promos under tokenPaymentId into accountsForBuyPromo', () => {
    const req = buildReq();
    const payment = buildMockPaymentEntity('BuyPromo');
    const settlement = firstSettlement(payment);

    classifyByRequestType(
      payment.tokenPaymentId,
      settlement,
      req,
      'CH1',
      'XENDIT'
    );

    expect(req.app.cxs.accountsForBuyPromo.length).to.equal(1);
    expect(req.app.cxs.accountsForBuyPromo[0].tokenPaymentId).to.equal(
      payment.tokenPaymentId
    );
    expect(req.app.cxs.accountsForBuyPromo[0].promos.length).to.equal(
      settlement.transactions.length
    );
  });

  it('VOLUME_BOOST pushes verificationTokens payload into volumeBoostPayload', () => {
    const req = buildReq();
    const payment = buildMockPaymentEntity('VolumeBoost');
    const settlement = firstSettlement(payment);

    classifyByRequestType(
      payment.tokenPaymentId,
      settlement,
      req,
      'CH1',
      'XENDIT'
    );

    expect(req.app.cxs.volumeBoostPayload.length).to.equal(1);
    expect(req.app.cxs.volumeBoostPayload[0].tokenPaymentId).to.equal(
      payment.tokenPaymentId
    );
    expect(
      req.app.cxs.volumeBoostPayload[0].verificationTokens.length
    ).to.equal(settlement.transactions.length);
  });

  it('ECPAY pushes ecPayRequestList payload into accountsForECPay', () => {
    const req = buildReq();
    const settlement = {
      requestType: constants.PAYMENT_REQUEST_TYPES.ECPAY,
      transactions: [
        {
          partnerReferenceNumber: 'REF123',
          billerName: 'MERALCO',
          accountNumber: 'ACC123',
          accountIdentifier: 'ID123',
          amountToPay: new Decimal('100'),
          serviceCharge: new Decimal('5'),
          totalAmount: new Decimal('105'),
        },
      ],
    };
    const tokenPaymentId = 'PAY123';

    classifyByRequestType(tokenPaymentId, settlement, req, 'CH1', 'XENDIT');

    expect(req.app.cxs.accountsForECPay.length).to.equal(1);
    expect(req.app.cxs.accountsForECPay[0].tokenPaymentId).to.equal(
      tokenPaymentId
    );
    expect(req.app.cxs.accountsForECPay[0].ecPayRequestList.length).to.equal(1);
  });

  it('BUY_VOUCHER pushes buyVoucherRequest into accountsForBuyVoucher', () => {
    const req = buildReq();
    const payment = buildMockPaymentEntity('BuyVoucher');
    const settlement = firstSettlement(payment);

    classifyByRequestType(
      payment.tokenPaymentId,
      settlement,
      req,
      'CH1',
      'XENDIT'
    );

    expect(req.app.cxs.accountsForBuyVoucher.length).to.equal(1);
  });

  it('BUY_ROAMING pushes one entry per transaction into accountsForBuyRoaming', () => {
    const req = buildReq();

    const settlement = {
      requestType: constants.PAYMENT_REQUEST_TYPES.BUY_ROAMING,
      mobileNumber: '09170000000',
      transactions: [
        {
          serviceId: 'PRS123',
          param: new Decimal('299'),
          activationDate: '2024-01-01',
          targetDestination: 'SG',
        },
      ],
    };

    classifyByRequestType('TPID1', settlement, req, 'CHANNEL1', 'CARD');

    expect(req.app.cxs.accountsForBuyRoaming.length).to.equal(
      settlement.transactions.length
    );
  });

  it('does not push anything for unknown requestType', () => {
    const req = buildReq();

    const settlement = {
      requestType: 'UNKNOWN',
      transactions: [{ a: 1 }],
    };

    classifyByRequestType('TPID1', settlement, req, 'CHANNEL1', 'CARD');

    expect(req.app.cxs.accountsForBuyLoad.length).to.equal(0);
    expect(req.app.cxs.accountsForBuyPromo.length).to.equal(0);
    expect(req.app.cxs.accountsForBuyVoucher.length).to.equal(0);
    expect(req.app.cxs.volumeBoostPayload.length).to.equal(0);
    expect(req.app.cxs.accountsForECPay.length).to.equal(0);
    expect(req.app.cxs.accountsForBuyRoaming.length).to.equal(0);
  });
});

/* ------------------------------------------------------------------ */
/* classifyNonTransactionalRequests */
/* ------------------------------------------------------------------ */

describe('Utils :: paymentSessionCallbackClassifier :: classifyNonTransactionalRequests', () => {
  it('pushes tokenPaymentId and successAmount for PAY_BILLS', () => {
    const req = buildReq();
    const tokenPaymentId = 'TPID1';

    const settlement = {
      requestType: constants.PAYMENT_REQUEST_TYPES.PAY_BILLS,
      amount: '123.45',
    };

    classifyNonTransactionalRequests(tokenPaymentId, settlement, req);

    expect(req.app.cxs.accountsForCreatePolicy.length).to.equal(1);
    expect(req.app.cxs.accountsForCreatePolicy[0].tokenPaymentId).to.equal(
      tokenPaymentId
    );
    expect(
      req.app.cxs.accountsForCreatePolicy[0].successAmount instanceof Decimal
    ).to.equal(true);
  });

  it('does not push for non PAY_BILLS requestType', () => {
    const req = buildReq();
    const tokenPaymentId = 'TPID1';

    const settlement = {
      requestType: 'SOMETHING_ELSE',
      amount: '10',
    };

    classifyNonTransactionalRequests(tokenPaymentId, settlement, req);

    expect(req.app.cxs.accountsForCreatePolicy.length).to.equal(0);
  });
});

/* ------------------------------------------------------------------ */
/* classifyRequestForGFP */
/* ------------------------------------------------------------------ */

describe('Utils :: paymentSessionCallbackClassifier :: classifyRequestForGFP', () => {
  it('BBPREPAIDPROMO pushes createOrderExternalRequest entries into accountsPrepaidFiberService', () => {
    const req = buildReq({
      isECPayPaymentType: false,
    });

    const settlement = {
      requestType: constants.PAYMENT_REQUEST_TYPES.BBPREPAIDPROMO,
      createOrderExternal: [
        {
          accountId: 'ACC1',
          entityIds: [{ id: 'E1', type: 'T1' }],
        },
      ],
      amount: '999',
    };

    classifyRequestForGFP(settlement, 'TPID1', req);

    expect(req.app.cxs.accountsPrepaidFiberService.length).to.equal(1);
  });

  it('BBPREPAIDPROMO sets entityReq.amount when isECPayPaymentType is true and amount is present', () => {
    const req = buildReq({
      isECPayPaymentType: true,
    });

    const settlement = {
      requestType: constants.PAYMENT_REQUEST_TYPES.BBPREPAIDPROMO,
      createOrderExternal: [
        {
          accountId: 'ACC1',
          entityIds: [{ id: 'E1', type: 'T1' }],
        },
      ],
      amount: '250',
    };

    classifyRequestForGFP(settlement, 'TPID1', req);

    const pushed = req.app.cxs.accountsPrepaidFiberService[0];

    // transformer output shape may vary; assert amount flowed into some nested entity list
    // we keep it minimal but concrete: stringify and check "250" exists
    expect(JSON.stringify(pushed)).to.contain('"amount":"250"');
  });

  it('BBPREPAIDREPAIR pushes paymentId into accountsPrepaidFiberRepair', () => {
    const req = buildReq();

    const settlement = {
      requestType: constants.PAYMENT_REQUEST_TYPES.BBPREPAIDREPAIR,
    };

    classifyRequestForGFP(settlement, 'TPID1', req);

    expect(req.app.cxs.accountsPrepaidFiberRepair.length).to.equal(1);
    expect(req.app.cxs.accountsPrepaidFiberRepair[0]).to.equal({
      paymentId: 'TPID1',
    });
  });

  it('does nothing for unrelated requestType', () => {
    const req = buildReq();

    classifyRequestForGFP({ requestType: 'OTHER' }, 'TPID1', req);

    expect(req.app.cxs.accountsPrepaidFiberService.length).to.equal(0);
    expect(req.app.cxs.accountsPrepaidFiberRepair.length).to.equal(0);
  });
});

/* ------------------------------------------------------------------ */
/* classifyRequestForChangeSim */
/* ------------------------------------------------------------------ */

describe('Utils :: paymentSessionCallbackClassifier :: classifyRequestForChangeSim', () => {
  it('returns early when requestType is not CHANGE_SIM', () => {
    const req = buildReq();
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      tokenPaymentId: 'TPID1',
    });

    const settlement = {
      requestType: 'NOT_CHANGE_SIM',
      status: 'ANY',
      transactions: [{ transactionId: 'T1' }],
    };

    classifyRequestForChangeSim(settlement, paymentDetails, req);

    expect(req.app.cxs.accountsForCSPayment.length).to.equal(0);
  });

  it('pushes CSPayment entries when CARD authorised', () => {
    const req = buildReq();

    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      tokenPaymentId: 'TPID1',
      paymentType: constants.PAYMENT_TYPES.CARD,
      paymentInformation: {
        type: constants.PAYMENT_MODES.CC_DC,
        channelCode: 'IGNORED',
      },
    });

    const expectedChannel = callbackUtil.setPaymentChannelCS(paymentDetails);

    const settlement = {
      requestType: constants.PAYMENT_REQUEST_TYPES.CHANGE_SIM,
      status: `SOMETHING_${constants.SETTLEMENT_STATUS.AUTHORISED.CARD}_XYZ`,
      transactions: [{ transactionId: 'T1' }, { transactionId: 'T2' }],
    };

    classifyRequestForChangeSim(settlement, paymentDetails, req);

    expect(req.app.cxs.accountsForCSPayment.length).to.equal(2);
    expect(req.app.cxs.accountsForCSPayment[0]).to.include({
      tokenPaymentId: 'TPID1',
      status: settlement.status,
      transactionId: 'T1',
      paymentChannel: expectedChannel,
    });
  });

  it('pushes CSPayment entries when XENDIT authorised', () => {
    const req = buildReq();

    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      tokenPaymentId: 'TPID1',
      paymentType: constants.PAYMENT_TYPES.XENDIT,
      paymentInformation: {
        type: constants.PAYMENT_MODES.DIRECT_DEBIT,
        channelCode: 'ABC',
      },
    });

    const expectedChannel = callbackUtil.setPaymentChannelCS(paymentDetails);

    const settlement = {
      requestType: constants.PAYMENT_REQUEST_TYPES.CHANGE_SIM,
      status: `OK_${constants.SETTLEMENT_STATUS.AUTHORISED.XENDIT}`,
      transactions: [{ transactionId: 'T1' }],
    };

    classifyRequestForChangeSim(settlement, paymentDetails, req);

    expect(req.app.cxs.accountsForCSPayment.length).to.equal(1);
    expect(req.app.cxs.accountsForCSPayment[0].paymentChannel).to.equal(
      expectedChannel
    );
  });

  it('pushes CSPayment entries when GCASH authorised', () => {
    const req = buildReq();

    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      tokenPaymentId: 'TPID1',
      paymentType: 'GCASH',
    });

    const expectedChannel = callbackUtil.setPaymentChannelCS(paymentDetails);

    const settlement = {
      requestType: constants.PAYMENT_REQUEST_TYPES.CHANGE_SIM,
      status: `OK_${constants.SETTLEMENT_STATUS.AUTHORISED.GCASH}`,
      transactions: [{ transactionId: 'T1' }],
    };

    classifyRequestForChangeSim(settlement, paymentDetails, req);

    expect(req.app.cxs.accountsForCSPayment.length).to.equal(1);
    expect(req.app.cxs.accountsForCSPayment[0].paymentChannel).to.equal(
      expectedChannel
    );
  });

  it('does not push when status is not authorised', () => {
    const req = buildReq();

    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      tokenPaymentId: 'TPID1',
      paymentType: constants.PAYMENT_TYPES.CARD,
    });

    const settlement = {
      requestType: constants.PAYMENT_REQUEST_TYPES.CHANGE_SIM,
      status: 'PENDING',
      transactions: [{ transactionId: 'T1' }],
    };

    classifyRequestForChangeSim(settlement, paymentDetails, req);

    expect(req.app.cxs.accountsForCSPayment.length).to.equal(0);
  });
});
