import logger from '@globetel/cxs-core/core/logger/logger.js';
import { tokenStoreUtil } from '../../util/index.js';

const getPaymentServiceToken = async (req, clientId, storeEntity) => {
  const { tokenStoreClient } = req;

  const config = tokenStoreUtil.getRedisParams(clientId, storeEntity);

  try {
    const token = await tokenStoreClient.get(req, config);

    return JSON.parse(token) || null;
  } catch (error) {
    logger.debug('getPaymentServiceToken failed', error);
    throw error;
  }
};

const putPaymentServiceToken = async (
  req,
  clientId,
  storeEntity,
  accessToken
) => {
  const { tokenStoreClient } = req;

  const config = tokenStoreUtil.getRedisParams(clientId, storeEntity);

  try {
    await tokenStoreClient.set(req, config, JSON.stringify(accessToken));
  } catch (error) {
    logger.debug('putPaymentServiceToken failed', error);
    throw error;
  }
};

export { getPaymentServiceToken, putPaymentServiceToken };
