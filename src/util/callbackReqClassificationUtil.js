import Decimal from 'decimal.js';
import { callbackUtil, constants } from './index.js';
import { v1Transformers } from './transformers/index.js';

const classifyByRequestType = (
  tokenPaymentId,
  settlement,
  req,
  channelId,
  paymentType
) => {
  let promos = [];
  let vouchers = [];
  let volumeBoost = [];
  let ecPayTransaction = [];

  const {
    app: {
      cxs: {
        accountsForBuyLoad,
        accountsForBuyRoaming,
        accountsForBuyPromo,
        accountsForBuyVoucher,
        volumeBoostPayload,
        accountsForECPay,
      },
    },
  } = req;

  const {
    PAYMENT_REQUEST_TYPES: {
      BUY_LOAD,
      BUY_PROMO,
      VOLUME_BOOST,
      ECPAY,
      BUY_VOUCHER,
      BUY_ROAMING,
    },
  } = constants;

  const { transactions, requestType, mobileNumber } = settlement;

  for (const txn of transactions) {
    if (BUY_LOAD === requestType) {
      const buyLoadRequest =
        v1Transformers.paymentSessionCallback.buyLoadRequest(
          txn,
          tokenPaymentId,
          mobileNumber
        );
      accountsForBuyLoad.push(buyLoadRequest);
    } else if (BUY_PROMO === requestType) {
      const promoReq =
        v1Transformers.paymentSessionCallback.purchasePromoRequest(
          txn,
          mobileNumber
        );

      promos.push(promoReq);
    } else if (VOLUME_BOOST === requestType) {
      const volumeBoostPromoReq = { verificationToken: txn.verificationToken };
      volumeBoost.push(volumeBoostPromoReq);
    } else if (ECPAY === requestType) {
      const ecPayReq = v1Transformers.paymentSessionCallback.ecPayRequest(txn);
      ecPayTransaction.push(ecPayReq);
    } else if (BUY_VOUCHER === requestType) {
      const buyVoucherReq = {
        amount: txn.amount.toString(),
        voucherCategory: txn.voucherCategory,
      };

      vouchers.push(buyVoucherReq);
    } else if (BUY_ROAMING === requestType) {
      const buyRoamingReq =
        v1Transformers.paymentSessionCallback.buyRoamingRequest(
          txn,
          tokenPaymentId,
          mobileNumber,
          channelId,
          paymentType
        );

      accountsForBuyRoaming.push(buyRoamingReq);
    }
  }

  if (promos.length) {
    accountsForBuyPromo.push({
      tokenPaymentId,
      promos,
    });
  }

  if (vouchers.length) {
    const buyVoucherReq =
      v1Transformers.paymentSessionCallback.buyVoucherRequest(
        transactions[0],
        settlement,
        tokenPaymentId,
        vouchers
      );
    accountsForBuyVoucher.push(buyVoucherReq);
  }

  if (volumeBoost.length) {
    volumeBoostPayload.push({
      tokenPaymentId,
      verificationTokens: volumeBoost,
    });
  }

  if (ecPayTransaction.length) {
    accountsForECPay.push({
      tokenPaymentId,
      ecPayRequestList: ecPayTransaction,
    });
  }
};

const classifyNonTransactionalRequests = (tokenPaymentId, settlement, req) => {
  const {
    PAYMENT_REQUEST_TYPES: { PAY_BILLS },
  } = constants;

  const {
    app: {
      cxs: { accountsForCreatePolicy },
    },
  } = req;

  if (settlement.requestType === PAY_BILLS) {
    accountsForCreatePolicy.push({
      tokenPaymentId,
      successAmount: new Decimal(settlement.amount),
    });
  }
};

const classifyRequestForGFP = (settlement, tokenPaymentId, req) => {
  const {
    PAYMENT_REQUEST_TYPES: { BBPREPAIDPROMO, BBPREPAIDREPAIR },
  } = constants;

  const {
    app: {
      cxs: {
        accountsPrepaidFiberService,
        accountsPrepaidFiberRepair,
        isECPayPaymentType,
      },
    },
  } = req;

  const { requestType, createOrderExternal, amount } = settlement;

  if (requestType === BBPREPAIDPROMO) {
    for (const order of createOrderExternal) {
      const entityIdList = [];

      for (const entity of order.entityIds || []) {
        const entityReq = {
          id: entity.id,
          type: entity.type,
          amount: null,
        };

        if (
          isECPayPaymentType &&
          amount !== null &&
          amount !== undefined &&
          amount.toString().trim()
        ) {
          entityReq.amount = amount.toString();
        }

        entityIdList.push(entityReq);
      }

      const createExOrderReq =
        v1Transformers.paymentSessionCallback.createOrderExternalRequest(
          order.accountId,
          tokenPaymentId,
          entityIdList
        );

      accountsPrepaidFiberService.push(createExOrderReq);
    }
  } else if (requestType === BBPREPAIDREPAIR) {
    accountsPrepaidFiberRepair.push({
      paymentId: tokenPaymentId,
    });
  }
};

const classifyRequestForChangeSim = (settlement, paymentDetails, req) => {
  const {
    PAYMENT_REQUEST_TYPES: { CHANGE_SIM },
    SETTLEMENT_STATUS: {
      AUTHORISED: { CARD, GCASH, XENDIT },
    },
  } = constants;

  const {
    app: {
      cxs: { accountsForCSPayment },
    },
  } = req;

  const { status, requestType, transactions } = settlement;

  if (requestType !== CHANGE_SIM) return;

  const isCardAuthorised = typeof status === 'string' && status.includes(CARD);

  const isWalletAuthorised =
    typeof status === 'string' &&
    (status.includes(XENDIT) || status.includes(GCASH));

  if (isCardAuthorised) {
    for (const txn of transactions) {
      accountsForCSPayment.push({
        tokenPaymentId: paymentDetails.tokenPaymentId,
        status,
        transactionId: txn.transactionId,
        paymentChannel: callbackUtil.setPaymentChannelCS(paymentDetails),
      });
    }
    return;
  }

  if (isWalletAuthorised) {
    for (const txn of transactions) {
      accountsForCSPayment.push({
        tokenPaymentId: paymentDetails.tokenPaymentId,
        status,
        transactionId: txn.transactionId,
        paymentChannel: callbackUtil.setPaymentChannelCS(paymentDetails),
      });
    }
  }
};

export {
  classifyByRequestType,
  classifyNonTransactionalRequests,
  classifyRequestForChangeSim,
  classifyRequestForGFP,
};
