import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { BindingPaymentMethodsModel } from '../../models/mongo/index.js';

const findByBindAndUUID = async (bindingRequestId, uuid) => {
  try {
    const record = await BindingPaymentMethodsModel.findOne({
      bindingRequestId,
      uuid,
    });

    logger.info('BINDING_PAYMENT_FIND_BY_BIND_AND_UUID', record);

    return record;
  } catch (error) {
    logger.error('BINDING_PAYMENT_FIND_BY_BIND_AND_UUID_FAILED', error);
    throw {
      type: 'InternalOperationFailed',
      details: error.message,
    };
  }
};

export { findByBindAndUUID };
