import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { constants } from '../../util/index.js';

const checkQuestIndicator = async (req, paymentDetails) => {
  try {
    const {
      cxs,
      mongo,
      pre: { user },
    } = req;
    let userUUID = user.uuid ?? null;

    if (!paymentDetails.settlementDetails) {
      return;
    }

    for (let paymentSession of paymentDetails.settlementDetails) {
      if (
        paymentSession.requestType !== constants.PAYMENT_REQUEST_TYPES.PAY_BILLS
      ) {
        return;
      }

      let isQuestSet = false;
      let skipSave = false;

      if (paymentSession.transactions) {
        if (
          paymentSession.transactions[0]?.questFlag &&
          String(paymentSession.transactions[0].questFlag) === 'true'
        ) {
          return;
        }

        let settlementDetail = paymentSession.transactions[0];

        if (settlementDetail.questInd) {
          skipSave = true;
          isQuestSet = false;

          if (settlementDetail.questInd === 'Y') {
            isQuestSet = true;
          } else {
            settlementDetail.questInd = 'N';
          }
        }
      } else {
        const transactions = [
          {
            questInd: 'N',
          },
        ];
        paymentSession.transactions = transactions;
      }

      if (isQuestSet) {
        continue;
      }

      if (
        (paymentSession.status.includes(constants.PAYMENT_STATUS.AUTHORISED) ||
          paymentSession.status.includes(
            constants.PAYMENT_STATUS.AUTHORIZED
          )) &&
        userUUID !== null
      ) {
        let mobileNumber = paymentSession?.mobileNumber ?? null;
        let accountNumber = paymentSession?.accountNumber ?? null;

        const questRequestParams = {
          uuid: userUUID,
          questType: constants.PAYMENT_REQUEST_TYPES.PAY_BILLS,
          msisdn: mobileNumber,
          userToken: paymentDetails.userToken.split(' ')[1],
        };
        if (accountNumber) questRequestParams.accountNumber = accountNumber;

        const response = await cxs.productOrderingRepository.addQuest(
          questRequestParams,
          req
        );

        if (
          paymentSession.transactions?.length &&
          String(response.statusCode) === '200' &&
          response.questIndicator === 'Y'
        ) {
          for (let transaction of paymentSession.transactions) {
            transaction.questInd = response.questIndicator;
            transaction.questFlag = 'true';
            skipSave = false;
          }
        }
      }

      if (
        !skipSave &&
        (paymentSession.status.includes(constants.PAYMENT_STATUS.AUTHORISED) ||
          paymentSession.status.includes(constants.PAYMENT_STATUS.AUTHORIZED))
      ) {
        paymentSession.transactions[0].questFlag = 'true';
        await mongo.customerPaymentsRepository.updateOne(paymentDetails);
      }
    }
  } catch (error) {
    logger.debug('CHECK_QUEST_INDICATOR_ERROR', error);
    throw error;
  }
};

export { checkQuestIndicator };
