import { logger } from '@globetel/cxs-core/core/logger/index.js';
import lodash from 'lodash';
import { constants, esimUtil } from '../../util/index.js';

const esimXenditValidation = (req) => {
  const { payload, headers } = req;
  const { paymentInformation } = payload;

  const paymentType = lodash.get(
    payload,
    'paymentType',
    constants.PAYMENT_TYPES.XENDIT
  );

  if (paymentType !== constants.PAYMENT_TYPES.XENDIT) return true;

  if (esimUtil.isEmptyObject(paymentInformation)) {
    throw { type: 'InsufficientParameters' };
  }

  logger.info('VALIDATE_XENDIT_PARAMETERS ', paymentInformation);

  const forbiddenKeys = constants.FORBIDDEN_KEYS.ESIM_XENDIT;
  esimUtil.checkForbiddenKeys(paymentInformation, forbiddenKeys);
  esimUtil.checkRequiredKeys(paymentInformation, [
    constants.PAYMENT_TYPE_KEYS.REUSABILITY,
  ]);

  const type = lodash.get(
    paymentInformation,
    constants.PAYMENT_TYPE_KEYS.TYPE,
    constants.PAYMENT_MODES.CC_DC
  );

  switch (type) {
    case constants.PAYMENT_MODES.CC_DC:
      esimUtil.checkRequiredKeys(paymentInformation, [
        constants.PAYMENT_TYPE_KEYS.PAYMENT_METHOD_ID,
      ]);
      break;

    case constants.PAYMENT_MODES.DIRECT_DEBIT: {
      // For DIRECT_DEBIT we currently only accept a string user-token header.
      // The upstream logs show the raw header as a string ("Bearer ..."),
      // while our internal generic logs show a parsed user-token object
      // stored separately. To stay aligned with legacy behavior and avoid
      // confusion, treat only the header value as the source of truth here.

      esimUtil.checkRequiredKeys(headers, ['user-token']);

      esimUtil.checkRequiredKeys(paymentInformation, [
        constants.PAYMENT_TYPE_KEYS.DIRECT_DEBIT,
        constants.PAYMENT_TYPE_KEYS.CHANNEL_CODE,
      ]);
      esimUtil.validateChannel(paymentInformation.channelCode, [
        constants.PAYMENT_BANKS.BPI,
        constants.PAYMENT_BANKS.UBP,
        constants.PAYMENT_BANKS.RCBC,
      ]);
      break;
    }

    case constants.PAYMENT_MODES.EWALLET:
      esimUtil.checkRequiredKeys(paymentInformation, [
        constants.PAYMENT_TYPE_KEYS.EWALLET,
        constants.PAYMENT_TYPE_KEYS.CHANNEL_CODE,
      ]);
      esimUtil.validateChannel(paymentInformation.channelCode, [
        constants.PAYMENT_TYPES.PAYMAYA,
        constants.PAYMENT_TYPES.SHOPEEPAY,
        constants.PAYMENT_TYPES.GRABPAY,
      ]);

      if (paymentInformation.channelCode === constants.PAYMENT_TYPES.PAYMAYA) {
        esimUtil.checkRequiredKeys(paymentInformation.eWallet, [
          constants.PAYMENT_TYPE_KEYS.FAILURE_URL,
          constants.PAYMENT_TYPE_KEYS.CANCEL_URL,
        ]);
      }
      if (paymentInformation.channelCode === constants.PAYMENT_TYPES.GRABPAY) {
        esimUtil.checkRequiredKeys(paymentInformation.eWallet, [
          constants.PAYMENT_TYPE_KEYS.FAILURE_URL,
        ]);
      }
      break;

    default:
      throw { type: 'InvalidParameter' };
  }

  return true;
};

export { esimXenditValidation };
