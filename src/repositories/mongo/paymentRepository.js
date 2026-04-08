import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { mongo } from '../../models/index.js';

const findByPaymentId = async (tokenPaymentId) => {
  try {
    const payments = await mongo.CustomerPaymentModel.findOne({
      tokenPaymentId,
    });

    if (!payments) {
      throw { type: 'ResourceNotFound', details: 'Payment not found.' };
    }
    return payments;
  } catch (error) {
    logger.debug('MONGO_PAYMENT_FIND_BY_PAYMENT_ID_ERROR', error);
    throw error;
  }
};

const savePayment = async (payment, userUuid) => {
  try {
    const payments = new mongo.CustomerPaymentModel({
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

export { findByPaymentId, savePayment };
