import logger from '@globetel/cxs-core/core/logger/logger.js';
import { config } from '../../../convict/config.js';

const paymentStatusCallbackAsync = async (req, payload) => {
  try {
    const { http } = req;

    const {
      host,
      httpProtocol,
      endpoints: { paymentStatusCallback: endpoint },
    } = config.get('cxs.paymentManagement');

    const url = `${httpProtocol}://${host}/${endpoint}`;

    logger.info('CXS_PAYMENT_STATUS_CALLBACK_ASYNC_REQUEST', payload);

    const data = await http.post(url, payload, {}, false, false, true);

    logger.debug('CXS_PAYMENT_STATUS_CALLBACK_ASYNC_RESPONSE', data);
  } catch (error) {
    logger.error('CXS_PAYMENT_STATUS_CALLBACK_ASYNC_FAILED', error);
  }
};

const processCSPaymentAsync = async (req, payload) => {
  try {
    const { http } = req;

    const {
      host,
      httpProtocol,
      endpoints: { processCSPayment: endpoint },
    } = config.get('cxs.paymentManagement');

    const url = `${httpProtocol}://${host}/${endpoint}`;

    logger.info('CXS_PROCESS_CS_PAYMENT_ASYNC_REQUEST', payload);

    const data = await http.post(url, payload, {}, false, false, true);

    logger.debug('CXS_PROCESS_CS_PAYMENT_ASYNC_RESPONSE', data);
  } catch (error) {
    logger.error('CXS_PROCESS_CS_PAYMENT_ASYNC_FAILED', error);
  }
};

const buyLoadAsync = async (req, payload) => {
  try {
    const { http } = req;

    const mobileNumber = payload.mobileNumber;

    const {
      host,
      httpProtocol,
      endpoints: { buyLoad: rawEndpoint },
    } = config.get('cxs.paymentManagement');

    // Support both :customerId and {customerId} in configuration
    const endpoint = rawEndpoint
      .replace(':customerId', encodeURIComponent(mobileNumber))
      .replace('{customerId}', encodeURIComponent(mobileNumber));

    const url = `${httpProtocol}://${host}/${endpoint}`;

    logger.info('CXS_BUY_LOAD_ASYNC_REQUEST', payload);

    const data = await http.post(url, payload, {}, false, false, true);

    logger.debug('CXS_BUY_LOAD_ASYNC_RESPONSE', data);
  } catch (error) {
    logger.error('CXS_BUY_LOAD_ASYNC_FAILED', error);
  }
};

const executeRefund = async (req, refundRequest, authToken) => {
  const {
    host,
    httpProtocol,
    endpoints: { paymentRefund: requestPaymentRefundEndpoint },
  } = config.get('cxs.paymentManagement');

  const {
    http,
    payload: { tokenPaymentId },
  } = req;

  try {
    const endpoint = requestPaymentRefundEndpoint.replace(
      '{tokenPaymentId}',
      encodeURIComponent(tokenPaymentId)
    );

    const url = `${httpProtocol}://${host}/${endpoint}`;

    const options = {
      headers: {
        authorization: authToken,
      },
    };

    const response = await http.post(url, refundRequest, options, false, false);

    logger.info('CXS_PAYMENT_EXECUTE_REFUND_RESPONSE', response);

    return response;
  } catch (err) {
    logger.debug('CXS_PAYMENT_EXECUTE_REFUND_ERROR', err);
    throw err;
  }
};

export {
  buyLoadAsync,
  executeRefund,
  paymentStatusCallbackAsync,
  processCSPaymentAsync,
};
