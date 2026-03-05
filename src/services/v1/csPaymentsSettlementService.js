import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { config } from '../../../convict/config.js';
import { constants, csPaymentsUtil } from '../../util/index.js';

const updateSettlementDetails = async (req, settlementDetail, index) => {
  const {
    payload: { tokenPaymentId },
    mongo,
  } = req;
  try {
    const keys = {
      filter: { tokenPaymentId },
      update: {
        $set: {
          [`settlementDetails.${index}`]: settlementDetail,
        },
      },
    };

    await mongo.customerPaymentsRepository.update(keys);
  } catch (err) {
    logger.debug('UPDATE_SETTLEMENT_DETAILS_ERROR', err);
    throw err;
  }
};

const markProvisionStatus = async (req, settlementDetail, index, status) => {
  try {
    const { csPaymentsSettlementService } = req;
    settlementDetail.transactions[0].provisionStatus = status;
    await csPaymentsSettlementService.updateSettlementDetails(
      req,
      settlementDetail,
      index
    );
  } catch (err) {
    logger.debug('MARK_PROVISION_STATUS_ERROR', err);
    throw err;
  }
};

const callGorApiWithRetry = async (
  req,
  formatTokenPaymentId,
  gorAccessToken,
  accessTokenCredentials
) => {
  const { gor, tokenStore } = req;

  const response = await gor.gorRepository.updatePaymentTokenId(
    req,
    formatTokenPaymentId,
    gorAccessToken
  );

  if (
    response.statusCode === constants.HTTP_STATUS.UNAUTHORIZED ||
    response.status === constants.HTTP_STATUS.UNAUTHORIZED
  ) {
    const tokenResponse = await gor.gorRepository.getAccessToken(
      req,
      accessTokenCredentials
    );

    await tokenStore.csPaymentsRepository.updateAccessToken(
      req,
      JSON.stringify(tokenResponse),
      constants.SECRET_ENTITY.CHANGE_SIM
    );

    const newAccessToken = csPaymentsUtil.formatAccessToken(tokenResponse);

    return gor.gorRepository.updatePaymentTokenId(
      req,
      formatTokenPaymentId,
      newAccessToken
    );
  }

  return response;
};

const processSettlementDetail = async (
  req,
  settlementDetail,
  index,
  formatTokenPaymentId,
  gorAccessToken,
  accessTokenCredentials
) => {
  const { csPaymentsSettlementService } = req;
  const { maxRetryAttempts: maxRetry } = config.get('gor');

  if (
    settlementDetail.requestType !== constants.PAYMENT_REQUEST_TYPES.CHANGE_SIM
  ) {
    return false;
  }

  if (
    settlementDetail.transactions[0].provisionStatus === constants.STATUS.FAILED
  ) {
    await csPaymentsSettlementService.markProvisionStatus(
      req,
      settlementDetail,
      index,
      constants.STATUS.FAILED
    );
    return false;
  }

  for (let i = 0; i < maxRetry; i++) {
    logger.info('RETRY_COUNT', i + 1);

    const response = await csPaymentsSettlementService.callGorApiWithRetry(
      req,
      formatTokenPaymentId,
      gorAccessToken,
      accessTokenCredentials
    );

    if (response.statusCode === constants.HTTP_STATUS.NO_CONTENT) {
      await csPaymentsSettlementService.markProvisionStatus(
        req,
        settlementDetail,
        index,
        constants.STATUS.SUCCESS
      );
      return true;
    }
  }

  await csPaymentsSettlementService.markProvisionStatus(
    req,
    settlementDetail,
    index,
    constants.STATUS.FAILED
  );
  return false;
};

const processAllSettlements = async ({
  req,
  settlementDetails,
  formatTokenPaymentId,
  gorAccessToken,
  accessTokenCredentials,
}) => {
  const { csPaymentsSettlementService } = req;
  let settlementDetail = null,
    index;
  try {
    for (index = 0; index < settlementDetails.length; index++) {
      settlementDetail = settlementDetails[index];
      await csPaymentsSettlementService.processSettlementDetail(
        req,
        settlementDetail,
        index,
        formatTokenPaymentId,
        gorAccessToken,
        accessTokenCredentials
      );
    }
  } catch (err) {
    logger.debug('PROCESS_ALL_SETTLEMENTS_ERROR', err);
    await csPaymentsSettlementService.markProvisionStatus(
      req,
      settlementDetail,
      index,
      constants.STATUS.FAILED
    );
    throw { type: 'InternalOperationFailed' };
  }
};

export {
  callGorApiWithRetry,
  markProvisionStatus,
  processAllSettlements,
  processSettlementDetail,
  updateSettlementDetails,
};
