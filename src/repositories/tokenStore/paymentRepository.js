import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { tokenStoreUtil } from '../../util/index.js';

const fetchAccessTokenByChannel = async (
  req,
  tokenStoreClient,
  clientId,
  secretEntity
) => {
  const config = tokenStoreUtil.getRedisParams(clientId, secretEntity);

  try {
    const token = await tokenStoreClient.get(req, config);

    return token || null;
  } catch (err) {
    logger.debug('FETCH_ACCESS_TOKEN_ERROR', err);
    throw err;
  }
};

const updateAccessTokenByChannel = async (
  req,
  tokenStoreClient,
  sessionId,
  clientId,
  secretEntity
) => {
  const config = tokenStoreUtil.getRedisParams(clientId, secretEntity);

  try {
    await tokenStoreClient.set(req, config, sessionId);
  } catch (err) {
    logger.debug('UPDATE_ACCESS_TOKEN_ERROR', err);
    throw err;
  }
};

export { fetchAccessTokenByChannel, updateAccessTokenByChannel };
