import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { constants } from '../../util/index.js';

const computeSinglifePricing = async (params) => {
  const { payload, secretManager, secret } = params;

  const getBudgetProtectConfig =
    await secretManager.singlifeRepository.getPricing(secret);
  const budgetProtectConfig = JSON.parse(
    getBudgetProtectConfig
  ).budgetProtectConfig;

  const requestTypeAllowed = budgetProtectConfig.requestTypeAllowed || [];
  const rate = Number(budgetProtectConfig.rate || 0);
  const rateType = budgetProtectConfig.rateType;

  const requestTypeAndAmount = [];

  for (const item of payload.settlementInfo.breakdown) {
    if (item.transactionType !== 'S' && item.requestType) {
      if (!requestTypeAllowed.includes(item.requestType)) {
        throw {
          type: 'OperationFailed',
          message: 'The request type is not eligible for budget protection.',
        };
      }

      requestTypeAndAmount.push({
        requestType: item.requestType,
        amount: item.amount,
      });
    }
  }

  logger.debug('REQUEST_TYPE_AND_AMOUNT', requestTypeAndAmount);

  // Add all amounts
  const totalAmount = requestTypeAndAmount.reduce((sum, req) => {
    return sum + Number(req.amount);
  }, 0);

  logger.debug('TOTAL_AMOUNT', totalAmount);

  if (rateType === constants.WEBPAYMENT_CONSTANTS.PERCENTAGE_RATE_TYPE) {
    const rawPercentageAmount = (totalAmount * rate) / 100;
    const scaled = Math.ceil(rawPercentageAmount * 10000) / 10000;
    const percentageAmount = Math.round(scaled * 100) / 100;

    logger.debug('PERCENTAGE_AMOUNT', percentageAmount);

    // Update the amount of Singlife Transaction
    for (const item of payload.settlementInfo.breakdown) {
      if (item.transactionType === 'S') {
        item.amount = percentageAmount;
        item.transactions[0].transactionProfile.chargeAmount = percentageAmount;
        item.transactions[0].transactionProfile.chargeRate = rate;
        item.transactions[0].transactionProfile.chargeType = rateType;
      }
    }
  }

  return payload;
};

export { computeSinglifePricing };
