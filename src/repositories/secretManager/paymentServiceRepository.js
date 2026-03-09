import decodeB64 from '@globetel/cxs-core/core/jwt/decodeB64.js';
import logger from '@globetel/cxs-core/core/logger/logger.js';
import { constants, secretUtil } from '../../util/index.js';

const getPaymentServiceCredentials = async (
  secretManagerClient,
  secretEntity,
  clientId
) => {
  {
    const secretName = secretUtil.buildSecretName(secretEntity);

    logger.info(`Secret name is ${secretName}`);

    try {
      const secret = await secretManagerClient.get(secretName);

      if (!secret) {
        throw {
          type: 'InsufficientParameters',
          details: `'${secretName}' in secret manager config not found.`,
        };
      }

      const parsedSecret = JSON.parse(secret);

      if (!parsedSecret[clientId]) {
        throw {
          type: 'CredentialsNotFound',
        };
      }
      return parsedSecret[clientId];
    } catch (error) {
      logger.debug('getPaymentServiceCredentials failed', error);
      throw error;
    }
  }
};

const getInitVoucher = async (
  secretManagerClient,
  secretEntity,
  apiVersion,
  apiNumber
) => {
  {
    const key = `${apiNumber}-${apiVersion}-${secretEntity}`;
    const secretName = secretUtil.buildSecretName(key);

    logger.info(`Secret name is ${secretName}`);

    try {
      const secret = await secretManagerClient.get(secretName);

      if (!secret) {
        throw {
          type: 'ResourceNotFound',
          details: `'${secretName}' in secret manager config not found.`,
        };
      }

      return JSON.parse(decodeB64(secret))?.VOUCHER_AUTH_TOKEN;
    } catch (error) {
      logger.debug('getInitVoucher failed', error);
      throw error;
    }
  }
};

const get = async (secretManagerClient, secretEntity) => {
  const key = secretEntity;
  const secretName = secretUtil.buildSecretName(key);

  logger.info(`Secret name is ${secretName}`);

  try {
    const secret = await secretManagerClient.get(secretName);

    if (!secret) {
      throw {
        type: 'ResourceNotFound',
        details: `'${secretName}' in secret manager config not found.`,
      };
    }

    const decodedSecret = decodeB64(secret);
    return decodedSecret;
  } catch (error) {
    logger.debug('SECRET_MANAGER_GET_FAILED', error);
    throw error;
  }
};

const getGcashProcessingFee = async (secretManagerClient) => {
  const secretEntity = constants.SECRET_ENTITY.PROCESSINGFEE_GCASH;

  const secretName = secretUtil.buildSecretName(secretEntity);

  logger.info(`Secret name is ${secretName}`);

  try {
    const secret = await secretManagerClient.get(secretName);

    if (!secret) {
      throw {
        type: 'InvalidOutboundRequest',
        details: `'${secretName}' in secret manager config not found.`,
      };
    }

    const decodedSecret = decodeB64(secret);
    return decodedSecret;
  } catch (error) {
    logger.debug('SECRET_MANAGER_GET_FAILED', error);
    throw error;
  }
};

const getRefundAuthToken = async (secretManagerClient) => {
  const secretEntity = constants.SECRET_ENTITY.REFUND_AUTH_TOKEN;

  const secretName = secretUtil.buildSecretName(secretEntity);

  logger.info(`Secret name is ${secretName}`);

  try {
    const secret = await secretManagerClient.get(secretName);

    if (!secret) {
      throw {
        type: 'InvalidOutboundRequest',
        details: `'${secretName}' in secret manager config not found.`,
      };
    }

    const decodedSecret = decodeB64(secret);
    return decodedSecret;
  } catch (error) {
    logger.debug('SECRET_MANAGER_REFUND_AUTH_TOKEN', error);
    throw error;
  }
};

const getUpdateVoucherAuthToken = async (
  secretManagerClient,
  apiNumber,
  apiVersion,
  secretEntity
) => {
  const key = `${constants.APIS}-${apiNumber}-${apiVersion}-${secretEntity}`;
  const secretName = secretUtil.buildSecretName(key);

  logger.info(`Secret name is ${secretName}`);

  try {
    const secret = await secretManagerClient.get(secretName);

    if (!secret) {
      throw {
        type: 'InvalidOutboundRequest',
        details: `'${secretName}' in secret manager config not found.`,
      };
    }

    const decodedSecret = decodeB64(secret);
    const voucherAuthToken = JSON.parse(decodedSecret)?.VOUCHER_AUTH_TOKEN;
    return voucherAuthToken;
  } catch (error) {
    logger.debug('SECRET_MANAGER_UPDATE_VOUCHER_AUTH_TOKEN', error);
    throw error;
  }
};

export {
  get,
  getGcashProcessingFee,
  getInitVoucher,
  getPaymentServiceCredentials,
  getRefundAuthToken,
  getUpdateVoucherAuthToken,
};
