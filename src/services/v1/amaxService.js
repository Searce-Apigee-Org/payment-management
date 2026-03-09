import { errorList } from '@globetel/cxs-core/core/error/messages/index.js';
import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { msisdnFormatter } from '@globetel/cxs-core/core/utils/string/index.js';
import { buyLoadUtil, constants } from '../../util/index.js';

const login = async (req, credentials) => {
  const { tokenStore, amax } = req;
  try {
    const cachedSession = await tokenStore.amaxRepository.fetchSession(
      req,
      constants.SECRET_ENTITY.AMAX
    );

    if (cachedSession && buyLoadUtil.isSessionValid(cachedSession)) {
      const sid =
        typeof cachedSession === 'string'
          ? cachedSession
          : cachedSession.sessionId;
      if (sid) {
        return sid;
      }
    }

    const res = await amax.buyLoadRepository.login(req, credentials);
    const result = buyLoadUtil.validateAmaxResponse(res);
    const sessionId = result.data.sessionId;

    const value = {
      sessionId,
      lastModifiedDate: new Date().toISOString(),
    };

    await tokenStore.amaxRepository.updateSession(
      req,
      JSON.stringify(value),
      constants.SECRET_ENTITY.AMAX
    );

    return sessionId;
  } catch (err) {
    logger.debug('AMAX_SERVICE_LOGIN_ERROR', err);
    throw errorList.BadRequestError;
  }
};

const topUp = async (req, sessionId, msisdn, amount, product) => {
  const { amax } = req;
  try {
    const res = await amax.buyLoadRepository.topUp(
      req,
      sessionId,
      msisdn,
      amount,
      product
    );
    const result = buyLoadUtil.validateAmaxResponse(res);
    return result.data.transId;
  } catch (err) {
    logger.debug('AMAX_SERVICE_TOP_UP_ERROR', err);
    throw errorList.BadRequestError;
  }
};

const transfer = async (
  req,
  sessionId,
  msisdn,
  wallet,
  amount,
  sourceWallet
) => {
  const { amax } = req;
  try {
    const mobileNum = msisdnFormatter(msisdn);
    const res = await amax.buyLoadRepository.transfer(
      req,
      sessionId,
      sourceWallet,
      mobileNum,
      wallet,
      amount
    );
    const result = buyLoadUtil.validateAmaxResponse(res);
    return result.data.transId;
  } catch (err) {
    logger.debug('AMAX_SERVICE_TRANSFER_ERROR', err);
    throw errorList.BadRequestError;
  }
};

const executeAmaxTransaction = async (
  req,
  tokenPrefix,
  msisdn,
  amount,
  keyword,
  wallet
) => {
  const { secretManager, secretManagerClient, amaxService } = req;
  try {
    const credentials = await secretManager.amaxRepository.getAmaxCredentials(
      secretManagerClient,
      constants.DOWNSTREAM.AMAX,
      constants.SECRET_ENTITY.CREDENTIALS,
      tokenPrefix
    );

    const sessionId = await amaxService.login(req, credentials);

    let transactionId;
    if (keyword !== null) {
      transactionId = await amaxService.topUp(
        req,
        sessionId,
        msisdn,
        amount,
        keyword
      );
    } else {
      const formattedAmount = parseFloat(amount).toFixed(2);
      transactionId = await amaxService.transfer(
        req,
        sessionId,
        msisdn,
        wallet,
        formattedAmount,
        credentials.sourceWallet
      );
    }

    return {
      transactionId,
      isRefund: false,
    };
  } catch (err) {
    logger.debug('AMAX_SERVICE_EXECUTE_AMAX_TRANSACTION_ERROR', err);
    if (err?.status === constants.HTTP_STATUS.INTERNAL_SERVER_ERROR) {
      throw errorList.Default;
    }
    throw err;
  }
};

export { executeAmaxTransaction, login, topUp, transfer };
