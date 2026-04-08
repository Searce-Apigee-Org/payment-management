import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { constants, csPaymentsUtil } from '../../util/index.js';

const saveGorAccessToken = async (req, accessTokenObj) => {
  const { tokenStore } = req;
  try {
    if (!accessTokenObj || Object.keys(accessTokenObj).length === 0) {
      throw { type: 'OperationFailed' };
    }

    await tokenStore.csPaymentsRepository.updateAccessToken(
      req,
      JSON.stringify(accessTokenObj),
      constants.SECRET_ENTITY.CHANGE_SIM
    );
  } catch (err) {
    logger.debug('SAVE_GOR_ACCESS_TOKEN_ERROR', err);

    if (err.type) {
      throw err;
    }

    throw { type: 'OperationFailed' };
  }
};

const getOrRefreshAccessToken = async (
  req,
  cachedToken,
  accessTokenCredentials
) => {
  try {
    const { gor } = req;
    const hasValidCache = cachedToken && Object.keys(cachedToken).length > 0;

    if (hasValidCache && !csPaymentsUtil.isTokenExpired(cachedToken)) {
      logger.info('USING_CACHED_TOKEN');
      return csPaymentsUtil.formatAccessToken(cachedToken);
    }

    logger.info('REFRESHING_ACCESS_TOKEN');
    const tokenResponse = await gor.gorRepository.getAccessToken(
      req,
      accessTokenCredentials
    );
    await saveGorAccessToken(req, tokenResponse);
    return csPaymentsUtil.formatAccessToken(tokenResponse);
  } catch (err) {
    logger.debug('GET_OR_REFRESH_ACCESS_TOKEN_ERROR', err);
    throw err;
  }
};

export { getOrRefreshAccessToken, saveGorAccessToken };
