import logger from '@globetel/cxs-core/core/logger/logger.js';
import { config } from '../../../convict/config.js';

const getVoucherData = async (voucherRequest, voucherToken, http) => {
  const {
    host,
    httpProtocol,
    accessToken,
    endpoints: { getVoucher: getVoucherEndpoint },
  } = config.get('oneApi');

  const url = `${httpProtocol}://${host}/${getVoucherEndpoint}`;

  const options = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: voucherToken,
    },
  };

  try {
    const response = await http.get(url, voucherRequest, options, false, false);
    return response;
  } catch (err) {
    logger.debug('GET_VOUCHER_DATA_FAILED', err);
    throw { type: 'InternalOperationFailed' };
  }
};

export { getVoucherData };
