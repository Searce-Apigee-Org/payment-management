import decodeB64 from '@globetel/cxs-core/core/jwt/decodeB64.js';
import logger from '@globetel/cxs-core/core/logger/logger.js';
import { constants, secretUtil } from '../../util/index.js';

const getApiConfig = async (
  secretManagerClient,
  apiNumber,
  apiVersion,
  secretEntity
) => {
  try {
    const key = `apis-${apiNumber}-${apiVersion}-${secretEntity}`;
    logger.info('GET_SECRET_REQUEST', key);

    const secretName = secretUtil.buildSecretName(key);
    logger.info('secretName', secretName);

    const secret = await secretManagerClient.get(secretName);

    if (!secret || secret.trim().length === 0) {
      throw {
        type: 'ResourceNotFound',
        details: `'${secretName}' in the secret manager  not found.`,
      };
    }

    const decodeSecret = decodeB64(secret);

    const parsedSecret = JSON.parse(decodeSecret) || null;

    return parsedSecret;
  } catch (error) {
    logger.debug('SECRET_MANAGER_ERROR', error);
    throw error;
  }
};

const getDNOConfig = async (secretManagerClient) => {
  const secretKey = constants.SECRET_ENTITY.DNO_CONFIG;

  const secretName = secretUtil.buildSecretName(secretKey);
  logger.info(`Secret name is ${secretName}`);

  try {
    const secret = await secretManagerClient.get(secretName);

    if (!secret) {
      throw {
        type: 'ResourceNotFound',
        details: `'${secretName}' in secret manager config not found.`,
      };
    }

    const decodeSecret = decodeB64(secret);
    const parsedSecret = JSON.parse(decodeSecret);

    return parsedSecret;
  } catch (error) {
    logger.debug('GET_DNO_CONFIG_ERROR', error);
    if (error?.type) throw error;
    throw {
      type: 'OperationFailed',
    };
  }
};

export { getApiConfig, getDNOConfig };
