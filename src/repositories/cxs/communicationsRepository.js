import logger from '@globetel/cxs-core/core/logger/logger.js';
import { config } from '../../../convict/config.js';

const sendPaymentsEmailAsync = async (req, payload) => {
  const { http } = req;

  try {
    const {
      host,
      httpProtocol,
      endpoints: { sendPaymentNotificationEmail: endpoint },
    } = config.get('cxs.communications');

    const url = `${httpProtocol}://${host}/${endpoint}`;

    logger.info('CXS_PCOMMUNCATIONS_SEND_EMAIL_ASYNC_REQUEST', payload);

    const data = await http.post(url, payload, {}, false, false, true);

    logger.debug('CXS_COMMUNCATIONS_SEND_EMAIL_ASYNC_RESPONSE', data);
  } catch (error) {
    logger.error('CXS_COMMUNCATIONS_SEND_EMAIL_ASYNC_FAILED', error);
  }
};

export { sendPaymentsEmailAsync };
