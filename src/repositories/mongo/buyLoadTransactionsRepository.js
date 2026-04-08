import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { BuyLoadTransactionModel } from '../../models/mongo/index.js';

const findByMobileDateChannel = async (params) => {
  try {
    const { channelCode, mobileNumber, fromDate, toDate } = params;
    const query = {
      mobileNumber,
      channelCode,
      createDate: { $gte: fromDate, $lt: toDate },
    };

    const data = await BuyLoadTransactionModel.find(query)
      .sort({ createDate: 1 })
      .lean()
      .exec();

    logger.info('BUYLOAD_TXN_MONGO_FIND_BY_MOBILE_DATE_CHANNEL', {
      mobileNumber,
      channelCode,
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      count: data.length,
    });

    return data;
  } catch (error) {
    throw {
      type: 'InternalOperationFailed',
      details: error.message,
    };
  }
};

const findByMobileDate = async (params) => {
  try {
    const { mobileNumber, fromDate, toDate } = params;
    const query = {
      mobileNumber,
      createDate: { $gte: fromDate, $lt: toDate },
    };

    const data = await BuyLoadTransactionModel.find(query)
      .sort({ createDate: 1 })
      .lean()
      .exec();

    logger.info('BUYLOAD_TXN_MONGO_FIND_BY_MOBILE_DATE', {
      mobileNumber,
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      count: data.length,
    });

    return data;
  } catch (error) {
    throw {
      type: 'InternalOperationFailed',
      details: error.message,
    };
  }
};

const findByTransactionId = async (transactionId) => {
  try {
    const buyLoadTransactions = await BuyLoadTransactionModel.findOne({
      transactionId,
    });

    if (!buyLoadTransactions) {
      throw {
        type: 'ResourceNotFound',
        details: 'Buy Load Transaction not found.',
      };
    }
    return buyLoadTransactions;
  } catch (err) {
    logger.debug(
      'MONGO_BUY_LOAD_TRANSACTION_FIND_BY_TRANSACTION_ID_ERROR',
      err
    );
    throw err;
  }
};

const save = async (entity, userUuid) => {
  try {
    await BuyLoadTransactionModel.updateOne(
      { transactionId: entity.transactionId },
      {
        $set: {
          ...entity,
          ...(userUuid !== undefined ? { createdById: userUuid } : {}),
        },
      },
      { upsert: true }
    );
    return { success: true };
  } catch (err) {
    logger.debug('MONGO_BUY_LOAD_TRANSACTION_SAVE_ERROR', err);
    throw err;
  }
};

export { findByMobileDate, findByMobileDateChannel, findByTransactionId, save };
