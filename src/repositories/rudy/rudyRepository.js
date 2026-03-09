import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { removeBlankProperties } from '@globetel/cxs-core/core/utils/string/index.js';
import { config } from '../../../convict/config.js';
import { constants } from '../../util/index.js';

const {
  webServiceHost: host,
  httpProtocol: protocol,
  endpoints: {
    paymentHistoryServlet: paymentHistoryServletEndpoint,
    receipt: receiptEndpoint,
  },
} = config.get('rudy');

const getReceiptUrl = async (http, payload, authorization) => {
  try {
    const url = `${protocol}://${host}/${receiptEndpoint}`;

    const params = removeBlankProperties({
      method: constants.REPO.RUDY.URL_METHOD,
      ...payload,
    });

    const config = {
      headers: {
        authorization: `Basic ${authorization}`,
      },
    };

    const [{ receiptUrl: response }] = await http.get(
      url,
      params,
      config,
      false,
      false
    );

    if (!response || response === '') {
      throw {
        type: `ResourceNotFound`,
        details: 'Customer receipt not found.',
      };
    }

    return response;
  } catch (err) {
    logger.debug('GET_RECEIPT_URL_ERROR', err);
    throw err;
  }
};

const getReceiptBody = async (http, receiptUrl, authorization) => {
  try {
    const url = `${protocol}://${host}/${receiptEndpoint}`;

    const params = removeBlankProperties({
      method: constants.REPO.RUDY.URL_BODY_METHOD,
      mtposUrl: receiptUrl,
    });

    const config = {
      headers: {
        authorization: `Basic ${authorization}`,
      },
    };

    const response = await http.get(url, params, config, false, false);
    if (!response || response === '') {
      throw {
        type: `ResourceNotFound`,
        details: 'Customer receipt not found.',
      };
    }
    return response;
  } catch (err) {
    logger.debug('GET_RECEIPT_BODY_ERROR', err);
    throw err;
  }
};

const getPayments = async (http, accountNumber, authorization) => {
  const url = `${protocol}://${host}/${paymentHistoryServletEndpoint}`;

  const params = removeBlankProperties({
    method: constants.RUDY_METHOD.GET_PAYMENTS,
    accountId: accountNumber,
  });

  const options = {
    headers: {
      authorization: `Basic ${authorization}`,
    },
  };

  try {
    const payments = await http.get(url, params, options, false, false);
    if (!payments || typeof payments === 'string') {
      throw { type: `ResourceNotFound`, details: 'Payment history not found.' };
    }
    return payments;
  } catch (err) {
    logger.debug('RUDY_GET_PAYMENTS_ERROR', err);
    throw { type: 'OperationFailed' };
  }
};

export { getPayments, getReceiptBody, getReceiptUrl };
