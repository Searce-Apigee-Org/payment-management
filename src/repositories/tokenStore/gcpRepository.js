import { logger } from '@globetel/cxs-core/core/logger/index.js';
import * as constants from '../../util/constants.js';
import { tokenStoreUtil } from '../../util/index.js';

const getGcpToken = async (req, tokenStoreClient, clientId) => {
  const config = tokenStoreUtil.getRedisParams(
    clientId,
    constants.SECRET_ENTITY.GCP
  );

  try {
    const token = await tokenStoreClient.get(req, config);

    return token?.accessToken;
  } catch (err) {
    logger.debug('GET_GCP_TOKEN_ERROR', err);
    if (err.type) {
      throw err;
    }

    throw { type: 'OperationFailed' };
  }
};

const updateGcpToken = async (req, tokenStoreClient, clientId, newGcpToken) => {
  const config = tokenStoreUtil.getRedisParams(
    clientId,
    constants.SECRET_ENTITY.GCP
  );

  try {
    await tokenStoreClient.set(req, config, newGcpToken);
  } catch (err) {
    logger.debug('UPDATE_GCP_TOKEN_ERROR', err);
    if (err.type) {
      throw err;
    }

    throw { type: 'OperationFailed' };
  }
};

export { getGcpToken, updateGcpToken };
