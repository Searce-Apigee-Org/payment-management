import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { config } from '../../../convict/config.js';
import { buyLoadUtil } from '../../util/index.js';

const {
  httpProtocol: protocol,
  host: host,
  requestTimeout: timeout,
  endpoints: { getVoucher: getVoucherEndpoint, useVoucher: useVoucherEndpoint },
} = config.get('oneApi');

const getVoucherData = async (voucherRequest, voucherToken, http) => {
  const url = `${protocol}://${host}/${getVoucherEndpoint}`;

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

const updateVoucher = async (req, requestBody, accessToken) => {
  const { http } = req;
  try {
    const url = `${protocol}://${host}/${useVoucherEndpoint}`;

    const options = {
      headers: {
        Authorization: accessToken,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      timeout,
    };

    const requestList = buyLoadUtil.populateRequestBody(requestBody);

    if (requestList?.length) {
      for (const voucherRequest of requestList) {
        const body = { voucherRequest };
        await http.put(url, body, options, false, false);
      }
    }
  } catch (error) {
    logger.debug('ONE_API_UPDATE_VOUCHER_ERROR', error);
    throw error;
  }
};

export { getVoucherData, updateVoucher };
