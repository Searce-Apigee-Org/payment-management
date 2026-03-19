import { logger } from '@globetel/cxs-core/core/logger/index.js';
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
    cxs: {
      accountsForBuyLoad,
      accountsForBuyRoaming,
      accountsForBuyPromo,
      accountsForBuyVoucher,
      volumeBoostPayload,
      accountsForECPay,
    },
  } = req.app;

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
    cxs: { accountsForCreatePolicy },
  } = req.app;

  if (settlement.requestType === PAY_BILLS) {
    const rawAmount = settlement.amount;

    let normalizedAmount = null;

    if (
      rawAmount &&
      typeof rawAmount === 'object' &&
      '$numberDecimal' in rawAmount
    ) {
      normalizedAmount = rawAmount.$numberDecimal;
    } else {
      normalizedAmount = rawAmount;
    }

    if (typeof normalizedAmount === 'number') {
      normalizedAmount = normalizedAmount.toString();
    }

    // Guard against null/undefined/empty or clearly invalid values
    if (
      normalizedAmount === null ||
      normalizedAmount === undefined ||
      (typeof normalizedAmount === 'string' &&
        normalizedAmount.trim().length === 0)
    ) {
      logger.error('CLASSIFY_NON_TXN_INVALID_AMOUNT', {
        tokenPaymentId,
        rawAmount,
        normalizedAmount,
        reason: 'EMPTY_OR_NULL_AMOUNT',
      });
      accountsForCreatePolicy.push({
        tokenPaymentId,
        successAmount: null,
      });
      return;
    }

    // Final safeguard: if Decimal still considers this invalid, fall back to null
    let successAmount = null;
    try {
      successAmount = new Decimal(normalizedAmount);
    } catch (e) {
      logger.error('CLASSIFY_NON_TXN_DECIMAL_PARSE_ERROR', {
        tokenPaymentId,
        rawAmount,
        normalizedAmount,
        error: e.message,
      });
      successAmount = null;
    }

    accountsForCreatePolicy.push({
      tokenPaymentId,
      successAmount,
    });
  }
};

const classifyRequestForGFP = (settlement, tokenPaymentId, req) => {
  const {
    PAYMENT_REQUEST_TYPES: { BBPREPAIDPROMO, BBPREPAIDREPAIR },
  } = constants;

  const {
    cxs: {
      accountsPrepaidFiberService,
      accountsPrepaidFiberRepair,
      isECPayPaymentType,
    },
  } = req.app;

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
    cxs: { accountsForCSPayment },
  } = req.app;

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
