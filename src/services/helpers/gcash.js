import decodeUserJWT from '@globetel/cxs-core/core/jwt/decodeUserJWT.js';
import logger from '@globetel/cxs-core/core/logger/logger.js';
import { constants, stringUtil } from '../../util/index.js';

const validateBindingId = async (req, gCashPaymentInfo) => {
  const {
    app: { channel },
    headers,
    mongo,
    payment,
  } = req;

  const {
    CHANNELS: { NG1 },
  } = constants;

  let map = null;

  if (
    !(channel && stringUtil.compareLowerCase(channel, NG1)) ||
    !headers?.['user-token'] ||
    headers['user-token'].trim() === '' ||
    !gCashPaymentInfo?.bindingRequestID
  ) {
    return map;
  }

  if (!gCashPaymentInfo.bindingRequestID.trim()) {
    throw {
      type: 'InvalidParameter',
      message: 'Invalid bindingRequestID.',
    };
  }

  const decodedUserToken = decodeUserJWT(headers['user-token']);
  const uuid = decodedUserToken?.userJWT?.uuid;

  // Persist payment entity via migratedTables-aware repository (injected under `payment`)
  const bindingPayment =
    await payment.bindingPaymentsRepository.findByBindAndUUID(
      gCashPaymentInfo.bindingRequestID.trim(),
      uuid,
      req
    );

  logger.debug('BindingPayment', bindingPayment);

  if (bindingPayment) {
    map = {
      bindingId: gCashPaymentInfo.bindingRequestID.trim(),
      uuid,
    };
  } else if (gCashPaymentInfo.bindingRequestID) {
    throw {
      type: 'CustomBadRequestMessageException',
      message: 'The bindingRequestId is unmatched or invalid.',
    };
  }

  if (bindingPayment?.status && bindingPayment.status !== 'Active') {
    logger.debug('BindingPayment status', bindingPayment.status);
    throw {
      type: 'CustomBadRequestMessageException',
      message: 'The bindingRequestId is unmatched or invalid.',
    };
  }

  return map;
};

export { validateBindingId };
