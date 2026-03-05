import { logger } from '@globetel/cxs-core/core/logger/index.js';
import lodash from 'lodash';
import moment from 'moment';

const updateProvisionStatusAndProductAttributes = async (req) => {
  const {
    provisionStatus,
    productAttributes,
    paymentDetails,
    tokenPaymentId,
    mongo,
  } = req;

  try {
    const transactions = lodash.get(
      paymentDetails,
      'settlementDetails[0].transactions',
      []
    );

    if (transactions.length) {
      transactions[0] = { ...transactions[0], ...provisionStatus };
    } else {
      transactions.push(provisionStatus);
    }

    paymentDetails.settlementDetails[0].transactions = transactions;

    const dataToUpdate = {
      settlementDetails: paymentDetails?.settlementDetails,
      productAttributes: productAttributes,
      lastUpdateDate: moment().utc().format('YYYY-MM-DDTHH:mm:ss.SSS'),
    };

    await mongo.customerPaymentRepository.updateCustomerPaymentInfo(
      {
        tokenPaymentId: tokenPaymentId,
      },
      dataToUpdate
    );
  } catch (error) {
    logger.debug(
      'UPDATE_PROVISION_STATUS_AND_PRODUCT_ATTRIBUTES_DETAILS_FAILED',
      error
    );
    throw error;
  }
};

export { updateProvisionStatusAndProductAttributes };
