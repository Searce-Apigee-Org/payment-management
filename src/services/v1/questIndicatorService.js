import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { config } from '../../../convict/config.js';
import { constants } from '../../util/index.js';

const checkQuestIndicator = async (req, paymentDetails) => {
  try {
    const { cxs, payment, pre, http, invokeLambda, serviceHelpers } = req;
    const userUUID = pre?.user?.uuid ?? null;

    if (
      paymentDetails.tokenPaymentId.includes(constants.CHANNEL_NAME.SUPERAPP) ||
      paymentDetails.tokenPaymentId.includes(constants.CHANNEL_NAME.CPT)
    ) {
      if (!paymentDetails.settlementDetails) {
        return;
      }

      for (let paymentSession of paymentDetails.settlementDetails) {
        if (
          paymentSession.requestType !==
          constants.PAYMENT_REQUEST_TYPES.PAY_BILLS
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

          // questIndicator for DynamoDB, update once migrated to MongoDB
          // questInd for MongoDB

          if (settlementDetail.questIndicator) {
            skipSave = true;
            isQuestSet = false;

            if (settlementDetail.questIndicator === 'Y') {
              isQuestSet = true;
            } else {
              settlementDetail.questIndicator = 'N';
            }
          }
        } else {
          const transactions = [
            {
              questIndicator: 'N',
            },
          ];
          paymentSession.transactions = transactions;
        }

        if (isQuestSet) {
          continue;
        }

        if (
          (paymentSession.status.includes(
            constants.PAYMENT_STATUS.AUTHORISED
          ) ||
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
            userToken: paymentDetails.userToken
              ? paymentDetails.userToken.split(' ')[1]
              : null,
          };

          if (accountNumber) questRequestParams.accountNumber = accountNumber;

          const {
            migratedLambdas,
            addAccountQuest: { name: addAccountQuestLambda },
          } = config.get('lambda');
          const isMigratedLambda = migratedLambdas.includes(
            addAccountQuestLambda
          );
          let response;

          if (isMigratedLambda) {
            response = await cxs.productOrderingRepository.addQuest(
              questRequestParams,
              http
            );
            logger.info('GCP AddAccountQuest response', response);
          } else {
            response = await serviceHelpers.lambda.addAccountQuestLambda({
              invokeLambda,
              payload: questRequestParams,
            });
            logger.info('AWS AddAccountQuest response', response);
          }

          if (
            paymentSession.transactions?.length &&
            String(response.statusCode) === '200' &&
            response.questIndicator === 'Y'
          ) {
            for (let transaction of paymentSession.transactions) {
              transaction.questIndicator = response.questIndicator;
              transaction.questFlag = 'true';
              skipSave = false;
            }
          }
        }

        if (
          !skipSave &&
          (paymentSession.status.includes(
            constants.PAYMENT_STATUS.AUTHORISED
          ) ||
            paymentSession.status.includes(constants.PAYMENT_STATUS.AUTHORIZED))
        ) {
          paymentSession.transactions[0].questFlag = 'true';

          // Persist payment entity via migratedTables-aware repository (injected under `payment`)
          await payment.customerPaymentsRepository.updateOne(
            paymentDetails,
            req
          );
        }
      }
    }
  } catch (error) {
    logger.debug('CHECK_QUEST_INDICATOR_ERROR', error);
    throw error;
  }
};

export { checkQuestIndicator };
