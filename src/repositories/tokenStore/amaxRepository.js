import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { tokenStoreUtil } from '../../util/index.js';

const fetchSession = async (req, secretEntity) => {
  const {
    tokenStoreClient,
    payload: { tokenPaymentId },
  } = req;
  try {
    const config = tokenStoreUtil.getRedisParams(tokenPaymentId, secretEntity);
    const token = await tokenStoreClient.get(req, config);
    return token || null;
  } catch (err) {
    logger.debug('AMAX_FETCH_SESSION_ERROR', err);
    throw err;
  }
};

const updateSession = async (req, sessionId, secretEntity) => {
  const {
    tokenStoreClient,
    payload: { tokenPaymentId },
  } = req;
  const config = tokenStoreUtil.getRedisParams(tokenPaymentId, secretEntity);

  try {
    await tokenStoreClient.set(req, config, sessionId);
  } catch (err) {
    logger.debug('AMAX_UPDATE_SESSION_ERROR', err);
    throw err;
  }
};

export { fetchSession, updateSession };
