import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { tokenStoreUtil } from '../../util/index.js';

const fetchAccessToken = async (req, secretEntity) => {
  const {
    tokenStoreClient,
    payload: { tokenPaymentId },
  } = req;
  try {
    const config = tokenStoreUtil.getRedisParams(tokenPaymentId, secretEntity);
    const token = await tokenStoreClient.get(req, config);
    return token || null;
  } catch (err) {
    logger.debug('CS_PAYMENTS_FETCH_ACCESS_TOKEN_ERROR', err);
    throw err;
  }
};

const updateAccessToken = async (req, value, secretEntity) => {
  const {
    tokenStoreClient,
    payload: { tokenPaymentId },
  } = req;
  const config = tokenStoreUtil.getRedisParams(tokenPaymentId, secretEntity);
  try {
    await tokenStoreClient.set(req, config, value);
  } catch (err) {
    logger.debug('CS_PAYMENTS_UPDATE_ACCESS_TOKEN_ERROR', err);
    throw err;
  }
};

export { fetchAccessToken, updateAccessToken };
