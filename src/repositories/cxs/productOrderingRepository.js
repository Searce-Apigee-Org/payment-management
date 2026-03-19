import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { config } from '../../../convict/config.js';

const addQuest = async (params, http) => {
  try {
    const {
      host,
      httpProtocol: protocol,
      endpoints: { addQuest: addQuestEndpoint },
    } = config.get('cxs.productOrdering');

    const url = `${protocol}://${host}/${addQuestEndpoint}`;
    const options = {
      headers: { 'Content-Type': 'application/json' },
    };
    const response = await http.post(url, params, options, false, false, true);
    return response;
  } catch (err) {
    logger.debug('ADD_QUEST_ERROR', err);
    throw { type: 'OperationFailed' };
  }
};

const purchasePromoAsync = async (req, payload) => {
  try {
    const { http } = req;

    const {
      host,
      httpProtocol,
      endpoints: { purchasePromo: endpoint },
    } = config.get('cxs.productOrdering');

    const url = `${httpProtocol}://${host}/${endpoint}`;

    logger.info('CXS_PURCHASE_PROMO_ASYNC_REQUEST', payload);

    const data = await http.post(url, payload, {}, false, false, true);

    logger.debug('CXS_PURCHASE_PROMO_ASYNC_RESPONSE', data);
  } catch (error) {
    logger.error('CXS_PURCHASE_PROMO_ASYNC_FAILED', error);
  }
};

const volumeBoostAsync = async (req, payload) => {
  try {
    const { http } = req;

    const {
      host,
      httpProtocol,
      endpoints: { purchasePromo: endpoint },
    } = config.get('cxs.productOrdering');

    const url = `${httpProtocol}://${host}/${endpoint}`;

    logger.info('CXS_VOLUME_BOOST_ASYNC_REQUEST', payload);

    const data = await http.post(url, payload, {}, false, false, true);

    logger.debug('CXS_VOLUME_BOOST_ASYNC_RESPONSE', data);
  } catch (error) {
    logger.error('CXS_VOLUME_BOOST_ASYNC_FAILED', error);
  }
};

const createPolicyAsync = async (req, payload) => {
  try {
    const { http } = req;

    const {
      host,
      httpProtocol,
      endpoints: { createPolicy: endpoint },
    } = config.get('cxs.productOrdering');

    const url = `${httpProtocol}://${host}/${endpoint}`;

    logger.info('CXS_CREATE_POLICY_ASYNC_REQUEST', payload);

    const data = await http.post(url, payload, {}, false, false, true);

    logger.debug('CXS_VCREATE_POLICY_ASYNC_RESPONSE', data);
  } catch (error) {
    logger.error('CXS_CREATE_POLICY_ASYNC_FAILED', error);
  }
};

const buyRoamingAsync = async (req, payload) => {
  try {
    const { http } = req;

    const {
      host,
      httpProtocol,
      endpoints: { buyRoaming: endpoint },
    } = config.get('cxs.productOrdering');

    const url = `${httpProtocol}://${host}/${endpoint}`;

    logger.info('CXS_BUY_ROAMING_ASYNC_REQUEST', payload);

    const data = await http.post(url, payload, {}, false, false);

    logger.debug('CXS_BUY_ROAMING_ASYNC_RESPONSE', data);
  } catch (error) {
    logger.error('CXS_BUY_ROAMING_ASYNC_FAILED', error);
  }
};

export {
  addQuest,
  buyRoamingAsync,
  createPolicyAsync,
  purchasePromoAsync,
  volumeBoostAsync,
};
