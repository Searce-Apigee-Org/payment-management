import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { CustomerPaymentECPayModel } from '../../models/mongo/index.js';

const findByPartnerRef = async (refId) => {
  try {
    const data = await CustomerPaymentECPayModel.findOne({
      partnerReferenceNumber: refId,
    });

    logger.info('ECPAY_TXN_MONGO_FIND_BY_PARTNER_REF', data);

    return data;
  } catch (error) {
    logger.error('ECPAY_TXN_MONGO_FIND_BY_PARTNER_REF_FAILED', error);
    throw {
      type: 'InternalOperationFailed',
      details: error.message,
    };
  }
};

const create = async (transactionDetails) => {
  try {
    const data = await CustomerPaymentECPayModel.create(transactionDetails);
    logger.info('ECPAY_TXN_MONGO_FIND_CREATE', data);

    return data;
  } catch (error) {
    logger.error('ECPAY_TXN_MONGO_CREATE_FAILED', error);
    throw {
      type: 'InternalOperationFailed',
      details: error.message,
    };
  }
};

export { create, findByPartnerRef };
