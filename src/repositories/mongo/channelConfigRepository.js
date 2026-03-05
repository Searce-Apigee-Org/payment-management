import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { BuyLoadChannelConfigModel } from '../../models/mongo/index.js';

const findOneById = async (clientId) => {
  try {
    const data = await BuyLoadChannelConfigModel.findOne({
      clientId,
    });

    logger.info('GET_CHANNEL_CONFIG_MONGO_RESPONSE', data);

    return data;
  } catch (err) {
    throw {
      type: 'InternalOperationFailed',
      details: err.message,
    };
  }
};

export { findOneById };
