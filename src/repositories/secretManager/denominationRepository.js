import { decodeB64 } from '@globetel/cxs-core/core/jwt/index.js';
import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { secretUtil } from '../../util/index.js';

const getESIMAmountValue = async (
  secretManagerClient,
  category,
  secretEntity
) => {
  let key = `${category}-${secretEntity}`;
  const secretName = secretUtil.buildSecretName(key);

  try {
    const secret = await secretManagerClient.get(secretName);

    if (!secret) {
      throw {
        type: 'ResourceNotFound',
        details: `'${secretName}' in secret manager config not found.`,
      };
    }

    const decodeSecret = decodeB64(secret);
    return JSON.parse(decodeSecret);
  } catch (err) {
    logger.debug('GET_ESIM_AMOUNT_VALUE_ERROR', err);
    throw err;
  }
};

export { getESIMAmountValue };
