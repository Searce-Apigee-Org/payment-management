import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { buyLoadUtil, constants } from '../../util/index.js';

const createPolicy = async (req) => {
  try {
    const {
      payload: { tokenPaymentId },
      mongo,
      cxs,
    } = req;
    const payments =
      await mongo.paymentRepository.findByPaymentId(tokenPaymentId);
    if (payments?.budgetProtectProfile !== null) {
      const requestBody = {
        tokenPaymentId,
        successAmount: payments.settlementDetails[0].amount,
      };
      await cxs.productOrderingRepository.createPolicyAsync(req, requestBody);
    }
  } catch (error) {
    logger.debug('PRODUCT_ORDERING_SERVICE_CREATE_POLICY_ERROR', error);
    throw error;
  }
};

const addQuest = async (req) => {
  const {
    mongo,
    payload: { tokenPaymentId },
  } = req;
  try {
    const payments =
      await mongo.paymentRepository.findByPaymentId(tokenPaymentId);

    const userUuid = buyLoadUtil.extractUserUuid(payments.userToken);

    if (tokenPaymentId.includes(constants.CHANNEL_NAME.SUPERAPP) && userUuid) {
      await processSettlementDetails(req, payments, userUuid);
    } else {
      buyLoadUtil.setQuestIndicatorToN(payments);
    }

    await mongo.paymentRepository.savePayment(payments, userUuid);
  } catch (err) {
    logger.debug('PRODUCT_ORDERING_SERVICE_ADD_QUEST_ERROR', err);
    throw err;
  }
};

const processSettlementDetails = async (req, payments, userUuid) => {
  const { cxs } = req;
  for (const details of payments.settlementDetails ?? []) {
    const tokenParts = (payments.userToken ?? '').split(' ');
    const requestBody = {
      uuid: userUuid,
      questType: constants.QUEST_TYPE.BUYLOAD,
      msisdn: details.mobileNumber,
      userToken: tokenParts[1] ?? '',
    };

    try {
      const res = await cxs.productOrderingRepository.addQuest(
        req,
        requestBody
      );
      const success = res?.status === 200;

      for (const settlementDetail of details.transactions ?? []) {
        settlementDetail.questIndicator = success
          ? res.questIndicator
          : constants.QUEST_INDICATOR.N;
      }
    } catch (err) {
      logger.debug(
        'PRODUCT_ORDERING_SERVICE_PROCESS_SETTLEMENT_DETAILS_ERROR',
        err
      );
      for (const settlementDetail of details.transactions ?? []) {
        settlementDetail.questIndicator = constants.QUEST_INDICATOR.N;
      }
    }
  }
};

export { addQuest, createPolicy };
