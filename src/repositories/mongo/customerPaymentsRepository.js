import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { mongo } from '@globetel/cxs-core/core/stores/index.js';
import { removeBlankProperties } from '@globetel/cxs-core/core/utils/string/index.js';
import { CustomerPaymentModel } from '../../models/mongo/index.js';

const create = async (paymentEntity) => {
  try {
    const data = await CustomerPaymentModel.create(paymentEntity);

    logger.info('CUSTOMER_PAYMENT_MONGO_FIND_CREATE', data);
    return data;
  } catch (error) {
    logger.error('CUSTOMER_PAYMENT_MONGO_FIND_CREATE_FAILED', error);
    throw {
      type: 'InternalOperationFailed',
      details: error.message,
    };
  }
};

const put = async (keys) => {
  logger.info('PUT_CUSTOMER_PAYMENT_REQUEST', keys);

  try {
    if (!keys.tokenPaymentId) {
      throw new Error('Missing required field: tokenPaymentId');
    }

    if (keys.createDate && !(keys.createDate instanceof Date)) {
      keys.createDate = new Date(keys.createDate);
    }
    if (keys.lastUpdateDate && !(keys.lastUpdateDate instanceof Date)) {
      keys.lastUpdateDate = new Date(keys.lastUpdateDate);
    }

    if (Array.isArray(keys.settlementDetails)) {
      keys.settlementDetails = keys.settlementDetails.map((detail) => {
        if (typeof detail.amount === 'string') {
          detail.amount = mongo.mongoose.Types.Decimal128.fromString(
            detail.amount.trim() === '' ? '0' : detail.amount
          );
        }
        if (typeof detail.provisionedAmount === 'string') {
          detail.provisionedAmount = mongo.mongoose.Types.Decimal128.fromString(
            detail.provisionedAmount.trim() === ''
              ? '0'
              : detail.provisionedAmount
          );
        }

        if (Array.isArray(detail.transactions)) {
          detail.transactions = detail.transactions.map((txn) => {
            if (typeof txn.amount === 'string') {
              txn.amount = mongo.mongoose.Types.Decimal128.fromString(
                txn.amount.trim() === '' ? '0' : txn.amount
              );
            }
            if (
              txn.voucherDetails?.paidAmount &&
              typeof txn.voucherDetails.paidAmount === 'string'
            ) {
              txn.voucherDetails.paidAmount =
                mongo.mongoose.Types.Decimal128.fromString(
                  txn.voucherDetails.paidAmount.trim() === ''
                    ? '0'
                    : txn.voucherDetails.paidAmount
                );
            }
            return txn;
          });
        }

        return detail;
      });
    }

    const updatedDoc = await CustomerPaymentModel.findOneAndUpdate(
      { tokenPaymentId: keys.tokenPaymentId },
      { $set: keys },
      {
        upsert: true,
        new: true,
        strict: true,
      }
    );

    logger.info('PUT_CUSTOMER_PAYMENT_RESPONSE', { success: true });
    return updatedDoc;
  } catch (err) {
    logger.debug('PUT_CUSTOMER_PAYMENT_ERROR', err);
    throw err;
  }
};

const findOne = async (paymentId) => {
  try {
    const data = await CustomerPaymentModel.findOne({
      tokenPaymentId: paymentId,
    });
    return data;
  } catch (error) {
    logger.debug('FIND_CUSTOMER_PAYMENT_ERROR', error);
    throw error;
  }
};

const updateOne = async (paymentDetails) => {
  try {
    await CustomerPaymentModel.replaceOne(
      { tokenPaymentId: paymentDetails.tokenPaymentId },
      paymentDetails,
      { upsert: true }
    );
  } catch (error) {
    logger.debug('UPDATE_CUSTOMER_PAYMENT_ERROR', error);
    throw error;
  }
};

const update = async (keys) => {
  logger.info('UPDATE_CUSTOMER_PAYMENT_REQUEST', keys);
  try {
    await CustomerPaymentModel.updateOne(
      removeBlankProperties(keys.filter),
      removeBlankProperties(keys.update)
    );
    logger.info('UPDATE_CUSTOMER_PAYMENT_RESPONSE', { success: true });
  } catch (err) {
    logger.debug('UPDATE_CUSTOMER_PAYMENT_ERROR', err);
  }
};

const find = async ({ tokenPaymentId }) => {
  logger.info('FIND_CUSTOMER_PAYMENT_REQUEST', { tokenPaymentId });

  try {
    if (!tokenPaymentId) {
      throw new Error('Missing required field: tokenPaymentId');
    }

    const payment = await CustomerPaymentModel.findOne({
      tokenPaymentId,
    }).lean();
    logger.info('FIND_CUSTOMER_PAYMENT_RESPONSE', payment);

    return { Item: payment };
  } catch (err) {
    logger.debug('FIND_CUSTOMER_PAYMENT_ERROR', err);
    throw err;
  }
};

const save = async (payment, userUuid) => {
  try {
    const payments = new CustomerPaymentModel({
      ...payment,
      ...(userUuid !== undefined ? { createdById: userUuid } : {}),
    });

    await payments.save();
    logger.info('SAVE_PAYMENT_RESPONSE', {
      success: true,
    });
    return { success: true };
  } catch (error) {
    logger.debug('MONGO_SAVE_PAYMENT_ERROR', error);
    throw error;
  }
};

export { create, find, findOne, put, save, update, updateOne };
