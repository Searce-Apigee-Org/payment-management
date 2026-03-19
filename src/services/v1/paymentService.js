import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { buyLoadUtil, constants } from '../../util/index.js';

const updateOnBuyLoad = async (req, provisionStatus, transactionId) => {
  const {
    mongo,
    payload: { tokenPaymentId },
    payment,
  } = req;
  try {
    // Persist payment entity via migratedTables-aware repository (injected under `payment`)
    const paymentEntity = await payment.customerPaymentsRepository.findOne(
      tokenPaymentId,
      req
    );

    for (const settlementDetail of paymentEntity.settlementDetails) {
      for (const transaction of settlementDetail.transactions) {
        transaction.provisionStatus = provisionStatus;
        transaction.transactionId = transactionId;
      }
    }

    if (
      provisionStatus === constants.STATUS.SUCCESS &&
      paymentEntity.settlementDetails.length > 0
    ) {
      const firstSettlement = paymentEntity.settlementDetails[0];

      const totalAmount = firstSettlement.transactions
        .filter(
          (transaction) =>
            transaction.amount !== null && transaction.amount !== undefined
        )
        .reduce((sum, transaction) => sum + transaction.amount, 0);

      firstSettlement.provisionedAmount = totalAmount;
    }

    paymentEntity.lastUpdatedDate = buyLoadUtil.getCurrentTimestamp();
    const userUuid = buyLoadUtil.extractUserUuid(paymentEntity.userToken);

    // Persist payment entity via migratedTables-aware repository (injected under `payment`)
    await payment.customerPaymentsRepository.save(
      tokenPaymentId,
      userUuid,
      req
    );
  } catch (error) {
    logger.debug('PAYMENT_SERVICE_UPDATE_ON_BUYLOAD_ERROR', error);
    throw error;
  }
};

export { updateOnBuyLoad };
