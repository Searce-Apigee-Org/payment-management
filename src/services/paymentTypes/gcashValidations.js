import { logger } from '@globetel/cxs-core/core/logger/index.js';
import lodash from 'lodash';
import { constants, esimUtil } from '../../util/index.js';

const esimGcashValidation = (req) => {
  const { payload } = req;
  const { paymentInformation } = payload;

  const paymentType = lodash.get(
    payload,
    constants.PAYMENT_TYPE_KEYS.PAYMENT_TYPE,
    constants.PAYMENT_TYPES.GCASH
  );

  if (paymentType !== constants.PAYMENT_TYPES.GCASH) return true;

  if (esimUtil.isEmptyObject(paymentInformation)) {
    throw { type: 'InsufficientParameters' };
  }

  logger.info('VALIDATE_GCASH_PARAMETERS ', paymentInformation);

  const forbiddenKeys = constants.FORBIDDEN_KEYS.ESIM_GCASH;
  const requiredKeys = [
    constants.PAYMENT_TYPE_KEYS.NOTIFICATION_URLS,
    constants.PAYMENT_TYPE_KEYS.ENV_INFO,
    constants.PAYMENT_TYPE_KEYS.ORDER,
  ];

  esimUtil.checkForbiddenKeys(paymentInformation, forbiddenKeys);
  esimUtil.checkRequiredKeys(paymentInformation, requiredKeys);

  return true;
};

export { esimGcashValidation };
