import logger from '@globetel/cxs-core/core/logger/logger.js';
import { tokenStoreUtil } from '../../util/index.js';

const getPaymentServiceToken = async (req, clientId, storeEntity) => {
  const { tokenStoreClient } = req;

  const config = tokenStoreUtil.getRedisParams(clientId, storeEntity);

  try {
    logger.debug('TOKEN_STORE_GET_PAYMENT_SERVICE_TOKEN_START', {
      clientId,
      storeEntity,
    });
    const token = await tokenStoreClient.get(req, config);

    const parsed = JSON.parse(token) || null;
    logger.debug('TOKEN_STORE_GET_PAYMENT_SERVICE_TOKEN_OK', {
      clientId,
      storeEntity,
      hasToken: Boolean(parsed),
    });

    return parsed;
  } catch (error) {
    logger.debug('TOKEN_STORE_GET_PAYMENT_SERVICE_TOKEN_FAILED', {
      clientId,
      storeEntity,
      message: error?.message,
    });
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
    logger.debug('TOKEN_STORE_PUT_PAYMENT_SERVICE_TOKEN_START', {
      clientId,
      storeEntity,
      hasAccessToken: Boolean(accessToken),
    });
    await tokenStoreClient.set(req, config, JSON.stringify(accessToken));

    logger.debug('TOKEN_STORE_PUT_PAYMENT_SERVICE_TOKEN_OK', {
      clientId,
      storeEntity,
    });
  } catch (error) {
    logger.debug('TOKEN_STORE_PUT_PAYMENT_SERVICE_TOKEN_FAILED', {
      clientId,
      storeEntity,
      message: error?.message,
    });
    logger.debug('putPaymentServiceToken failed', error);
    throw error;
  }
};

export { getPaymentServiceToken, putPaymentServiceToken };
