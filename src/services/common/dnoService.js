import logger from '@globetel/cxs-core/core/logger/logger.js';
import Decimal from 'decimal.js';
import { config } from '../../../convict/config.js';
import { constants, stringUtil } from '../../util/index.js';

const dnoGetOffers = async (req, ids) => {
  const { secretManager, secret, tenantTokenService, http, dno } = req;

  const { operatorName, privateKey, kid } =
    await secretManager.apiConfigRepository.getDNOConfig(secret);

  const getOfferEndpoint = config.get('dno.endpoints.getOffers');

  const tenantToken = await tenantTokenService.generateTenantToken(
    { path: getOfferEndpoint },
    { privateKey, kid, operatorName }
  );

  const dnoRequest = {
    ids,
    operator_name: operatorName,
  };

  const data = await dno.offersRepository.getOffers(
    dnoRequest,
    tenantToken,
    req
  );

  const offerById = data?.offer_by_id || {};

  const offers = Object.entries(offerById)
    .filter(([id, offer]) => offer?.data?.amounts?.primary)
    .map(([id, offer]) => ({
      id,
      amount: Number(offer.data.amounts.primary),
    }))
    .filter((offer) => ids.includes(offer.id));

  return offers;
};

const handleLFDNOXenditUpdatePayment = async (
  req,
  notificationRequest,
  tokenPaymentId
) => {
  let dnoInvoked = false;

  try {
    const { dno } = req;
    const {
      CHANNELS: { GFP },
      PAYMENT_NOTIFICATION_NAMES: { XENDIT_CREATED },
      PAYMENT_NOTIFICATION_STATUS: { REQUIRES_ACTION },
    } = constants;

    const tokenChannel = tokenPaymentId.substring(0, 3);

    if (!stringUtil.compareLowerCase(tokenChannel, GFP)) {
      return false;
    }

    const { name, payload } = notificationRequest;

    if (!stringUtil.compareLowerCase(name, XENDIT_CREATED)) {
      return false;
    }

    const { paymentId, status, actions = [] } = payload;

    const notification = {
      name,
      payload: {
        paymentId,
        status,
      },
    };

    if (
      stringUtil.compareLowerCase(status, REQUIRES_ACTION) &&
      actions.length
    ) {
      notification.payload.checkoutUrl = actions[0].url;
    }

    await dno.paymentsRepository.updatePayment(notification, req);
    dnoInvoked = true;

    return dnoInvoked;
  } catch (error) {
    logger.debug('PROCESS_LF_DNO_XENDIT_NOTIFICATION_FAILED', error);
  }
  return dnoInvoked;
};

const handleLFDNOUpdatePayment = async (
  req,
  notificationRequest,
  tokenPaymentId,
  isDnoInvoked
) => {
  const { dno } = req;

  const tokenChannel = tokenPaymentId.substring(0, 3);

  const {
    CHANNELS: { GFP },
  } = constants;

  if (isDnoInvoked || !stringUtil.compareLowerCase(tokenChannel, GFP)) {
    return;
  }

  const { payload } = notificationRequest;

  const { checkoutUrl, accounts, refundAmount } = payload;

  if (!checkoutUrl && !accounts && !refundAmount) {
    return;
  }

  if (refundAmount) {
    const correctedRefundAmount = new Decimal(refundAmount)
      .div(refundAmount.includes('.') ? 1 : 100)
      .toString();

    payload.refundAmount = correctedRefundAmount;
  }

  await dno.paymentsRepository.updatePayment(notificationRequest, req);
};

export {
  dnoGetOffers,
  handleLFDNOUpdatePayment,
  handleLFDNOXenditUpdatePayment,
};
