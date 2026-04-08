import logger from '@globetel/cxs-core/core/logger/logger.js';
import { config } from '../../../convict/config.js';

const processBuyVoucherAsync = async (req, payload) => {
  try {
    const { http } = req;

    const {
      host,
      httpProtocol,
      endpoints: { buyVoucher: endpoint },
    } = config.get('cxs.paymentMethods');

    const url = `${httpProtocol}://${host}/${endpoint}`;

    logger.info('CXS_BUY_VOUCHER_ASYNC_REQUEST', payload);

    const data = await http.post(url, payload, {}, false, false, true);

    logger.debug('CXS_BUY_VOUCHER_PAYMENT_ASYNC_RESPONSE', data);
  } catch (error) {
    logger.error('CXS_BUY_VOUCHER_PAYMENT_ASYNC_FAILED', error);
  }
};

export { processBuyVoucherAsync };
