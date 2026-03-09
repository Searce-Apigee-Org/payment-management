import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Decimal from 'decimal.js';

const lab = Lab.script();
const { describe, it } = lab;
export { lab };

import {
  buyLoadRequest,
  buyRoamingRequest,
  buyVoucherRequest,
  createOrderExternalRequest,
  ecPayRequest,
  generateEntityDetailList,
  globeOnlineCallbackCardRequest,
  globeOnlineCallbackRequest,
  purchasePromoRequest,
} from '../../../../src/util/transformers/v1/paymentSessionCallback.js'; // adjust path

describe('Utils :: paymentSessionCallback :: generateEntityDetailList', () => {
  it('returns list with mapped installment details', () => {
    const input = {
      bank: 'BPI',
      term: 12,
      interval: 'MONTHLY',
      percentage: 0.05,
      cardType: 'CREDIT',
      cardBrand: 'VISA',
    };

    const res = generateEntityDetailList(input);

    expect(res).to.equal([
      {
        bank: 'BPI',
        term: 12,
        interval: 'MONTHLY',
        percentage: 0.05,
        cardType: 'CREDIT',
        cardBrand: 'VISA',
      },
    ]);
  });
});

describe('Utils :: paymentSessionCallback :: buyLoadRequest', () => {
  it('maps transaction fields and converts amount to string', () => {
    const txn = {
      keyword: 'LOAD10',
      wallet: 'PREPAID',
      amount: new Decimal(40),
      agentName: 'AGENT1',
      externalTransactionId: 'EXT1',
    };

    const res = buyLoadRequest(txn, 'TPID', '0917');

    expect(res).to.equal({
      mobileNumber: '0917',
      keyword: 'LOAD10',
      wallet: 'PREPAID',
      amount: '40',
      tokenPaymentId: 'TPID',
      agentName: 'AGENT1',
      externalTransactionId: 'EXT1',
    });
  });

  it('sets agentName and externalTransactionId to null when missing', () => {
    const txn = {
      keyword: 'LOAD10',
      wallet: 'PREPAID',
      amount: 40,
    };

    const res = buyLoadRequest(txn, 'TPID', '0917');

    expect(res.agentName).to.equal(null);
    expect(res.externalTransactionId).to.equal(null);
  });
});

describe('Utils :: paymentSessionCallback :: purchasePromoRequest', () => {
  it('maps promo transaction correctly', () => {
    const txn = {
      keyword: 'PROMO1',
      serviceId: 'SVC1',
      amount: new Decimal(99),
      param: 'X',
    };

    const res = purchasePromoRequest(txn, '0917');

    expect(res).to.equal({
      keyword: 'PROMO1',
      mobileNumber: '0917',
      serviceID: 'SVC1',
      price: '99',
      param: 'X',
    });
  });
});

describe('Utils :: paymentSessionCallback :: ecPayRequest', () => {
  it('maps ecPay transaction and stringifies amounts', () => {
    const txn = {
      partnerReferenceNumber: 'REF1',
      billerName: 'MERALCO',
      accountNumber: 'ACC1',
      accountIdentifier: 'ID1',
      amountToPay: new Decimal(100),
      serviceCharge: new Decimal(5),
      totalAmount: new Decimal(105),
    };

    const res = ecPayRequest(txn);

    expect(res).to.equal({
      partnerReferenceNumber: 'REF1',
      billerName: 'MERALCO',
      accountNumber: 'ACC1',
      accountIdentifier: 'ID1',
      amountToPay: '100',
      serviceCharge: '5',
      totalAmount: '105',
    });
  });
});

describe('Utils :: paymentSessionCallback :: buyRoamingRequest', () => {
  it('maps roaming transaction and stringifies denomination', () => {
    const txn = {
      serviceId: 'PRS1',
      param: new Decimal(299),
      activationDate: '2024-01-01',
      targetDestination: 'SG',
    };

    const res = buyRoamingRequest(txn, 'TPID', '0917', 'APP', 'CARD');

    expect(res).to.equal({
      mobileNumber: '0917',
      prsId: 'PRS1',
      denomination: '299',
      activationDate: '2024-01-01',
      targetDestination: 'SG',
      originatingChannel: 'APP',
      tokenPaymentId: 'TPID',
      paymentType: 'CARD',
    });
  });
});

describe('Utils :: paymentSessionCallback :: buyVoucherRequest', () => {
  it('maps voucher request correctly', () => {
    const txn = { serviceNumber: 'SN1' };
    const settlement = {
      mobileNumber: '0917',
      accountNumber: 'ACC1',
    };

    const vouchers = [{ amount: '50' }];

    const res = buyVoucherRequest(txn, settlement, 'TPID', vouchers);

    expect(res).to.equal({
      tokenPaymentId: 'TPID',
      serviceNumber: 'SN1',
      mobileNumber: '0917',
      accountNumber: 'ACC1',
      vouchers,
    });
  });
});

describe('Utils :: paymentSessionCallback :: createOrderExternalRequest', () => {
  it('creates external order request with ACCOUNT_ID identityType', () => {
    const res = createOrderExternalRequest('ACC1', 'TPID', [{ id: 'E1' }]);

    expect(res).to.equal({
      identityType: 'ACCOUNT_ID',
      identityValue: 'ACC1',
      paymentId: 'TPID',
      orders: [{ id: 'E1' }],
    });
  });
});

describe('Utils :: paymentSessionCallback :: globeOnlineCallbackRequest', () => {
  it('maps callback payload using accounts list', () => {
    const payload = {
      paymentId: 'PID',
      accounts: [
        { accountNumber: 'A1', status: 'SUCCESS', refusalReasonRaw: 'R1' },
        { accountNumber: 'A2', status: 'SUCCESS' },
      ],
    };

    const res = globeOnlineCallbackRequest(payload, 'CH1');

    expect(res).to.equal({
      channelId: 'CH1',
      tokenPaymentId: 'PID',
      paymentStatusRemarks: 'R1',
      paymentAccounts: [
        { paymentStatus: 'SUCCESS', accountNumber: 'A1' },
        { paymentStatus: 'SUCCESS', accountNumber: 'A2' },
      ],
    });
  });
});

describe('Utils :: paymentSessionCallback :: globeOnlineCallbackCardRequest', () => {
  it('maps card callback request without installment details', () => {
    const payload = { paymentId: 'PID', status: 'APPROVED' };
    const accounts = ['A1', 'A2'];

    const res = globeOnlineCallbackCardRequest(payload, 'CH1', accounts, null);

    expect(res).to.equal({
      channelId: 'CH1',
      tokenPaymentId: 'PID',
      paymentStatusRemarks: 'APPROVED',
      paymentAccounts: [
        { accountNumber: 'A1', paymentStatus: 'APPROVED' },
        { accountNumber: 'A2', paymentStatus: 'APPROVED' },
      ],
    });
  });

  it('includes installmentDetails when present', () => {
    const payload = { paymentId: 'PID', status: 'APPROVED' };

    const installment = {
      installmentDetails: [
        {
          bank: 'BPI',
          term: 12,
          interval: 'MONTHLY',
          percentage: 0.05,
          cardType: 'CREDIT',
          cardBrand: 'VISA',
        },
      ],
    };

    const res = globeOnlineCallbackCardRequest(
      payload,
      'CH1',
      ['A1'],
      installment
    );

    expect(res.installmentDetails).to.equal({
      bank: 'BPI',
      term: 12,
      interval: 'MONTHLY',
      percentage: 0.05,
      cardType: 'CREDIT',
      cardBrand: 'VISA',
    });
  });
});
