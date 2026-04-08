import { logger } from '@globetel/cxs-core/core/logger/index.js';
import moment from 'moment';
import { constants, getPaymentSessionUtil } from '../../index.js';

const buildPaymentSessionResponse = (paymentDetails) => {
  const tokenPaymentId = paymentDetails.tokenPaymentId;
  let response = { tokenPaymentId };

  if (
    paymentDetails.createPaymentSessionError?.trim() &&
    getPaymentSessionUtil.checkXendit(paymentDetails)
  ) {
    const errorMessages = paymentDetails.createPaymentSessionError.split('|');
    const errCode = paymentDetails.settlementDetails[0]?.statusRemarks;

    const errors = errorMessages.map((error) => ({
      message: error.trim(),
      error_code: errCode,
    }));

    response.errors = errors;
  } else {
    response.paymentSession = paymentDetails.paymentSession?.trim() || null;
    response.checkoutUrl = paymentDetails.checkoutUrl?.trim() || null;
    response.paymentMethods = paymentDetails.paymentMethods;
    response.paymentResult = paymentDetails.paymentResult;
    response.merchantAccount = paymentDetails.merchantAccount?.trim() || null;
    response.storedPaymentMethods = paymentDetails.storedPaymentMethods;
    response.actions = paymentDetails.actions;
    response.accounts = [];
    for (let settlementDetail of paymentDetails.settlementDetails) {
      getPaymentSessionUtil.filterPaymentDetails(settlementDetail);
      response.accounts.push(settlementDetail);
    }

    if (paymentDetails.settlementDetails) {
      let settlementDetails = paymentDetails.settlementDetails[0];
      if (
        settlementDetails.requestType &&
        settlementDetails.requestType ===
          constants.PAYMENT_REQUEST_TYPES.PAY_BILLS &&
        paymentDetails.createDate
      ) {
        try {
          response.transactionDate = moment(paymentDetails.createDate).format(
            'YYYY-MM-DD HH:mm:ss.SSS'
          );
        } catch (error) {
          logger.debug('BUILD_PAYMENT_SESSION_TRANSFORMER_ERROR', error);
        }
      }
    }

    if (paymentDetails.budgetProtectProfile) {
      response.budgetProtect = {
        budgetProtectEnabled:
          paymentDetails.budgetProtectProfile.budgetProtectEnabled,
        budgetProtectStatus:
          paymentDetails.budgetProtectProfile.budgetProtectStatus,
        budgetProtectAmount: paymentDetails.budgetProtectProfile.chargeAmount,
        budgetProtectId: paymentDetails.budgetProtectProfile.budgetProtectId,
        policyCreatedAt: paymentDetails.budgetProtectProfile.policyCreatedAt,
      };
    }

    if (paymentDetails.oona && paymentDetails.oona.length > 0) {
      response.oona = [];
      for (let oonaStatus of paymentDetails.oona) {
        response.oona.push({
          oonaSku: oonaStatus.oonaSku,
          oonaStatus: oonaStatus.oonaStatus,
          amount: oonaStatus.amount,
        });
      }
    }
  }
  return response;
};

export { buildPaymentSessionResponse };
