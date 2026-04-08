import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { buyLoadUtil, constants } from '../../util/index.js';

const buildRefundRequest = async (req, transactionEntity) => {
  const {
    mongo,
    payload: { tokenPaymentId },
  } = req;
  try {
    let refundAmountRes = String(transactionEntity.amount);
    if (tokenPaymentId.includes(constants.CHANNEL_NAME.SUPERAPP)) {
      const paymentEntity =
        await mongo.paymentRepository.findByPaymentId(tokenPaymentId);

      refundAmountRes = paymentEntity.settlementDetails[0].amount;

      if (paymentEntity.budgetProtectProfile !== null) {
        const chargedAmount = paymentEntity.budgetProtectProfile.chargeAmount;
        const totalAmount = parseFloat(refundAmountRes) + chargedAmount;
        refundAmountRes = totalAmount.toString();
      }
    }

    return { refundAmount: refundAmountRes };
  } catch (err) {
    logger.debug('REFUND_SERVICE_BUILD_REFUND_REQUEST_ERROR', err);
    throw err;
  }
};

const updatePaymentWithRefundStatus = async (
  req,
  refundResponse,
  transactionEntity,
  refundRequest
) => {
  const {
    payload: { tokenPaymentId },
    mongo,
  } = req;
  try {
    const paymentEntity =
      await mongo.paymentRepository.findByPaymentId(tokenPaymentId);
    const isSuccess = refundResponse.statusCode === 202;
    const isXendit =
      paymentEntity.paymentType === constants.PAYMENT_TYPES.XENDIT;

    if (isSuccess && !isXendit) {
      return;
    }

    const refundStatus = isSuccess
      ? constants.STATUS.PENDING
      : constants.STATUS.REFUND_FAILED;

    const requestAmountStr =
      typeof refundRequest === 'string'
        ? refundRequest
        : refundRequest?.refundAmount;

    const refundAmount =
      isSuccess && isXendit
        ? Number(requestAmountStr)
        : !isSuccess
          ? requestAmountStr
          : null;

    buyLoadUtil.updateSettlementDetailsWithRefund(
      req,
      paymentEntity,
      refundAmount,
      refundStatus,
      transactionEntity.amount
    );

    paymentEntity.lastUpdatedDate = buyLoadUtil.getCurrentTimestamp();

    const userUuid = buyLoadUtil.extractUserUuid(paymentEntity.userToken);

    await mongo.paymentRepository.savePayment(paymentEntity, userUuid);
  } catch (err) {
    logger.debug('REFUND_SERVICE_UPDATE_PAYMENT_WITH_REFUND_STATUS_ERROR', err);
    throw err;
  }
};

const handleRefundProcess = async (req, transactionEntity) => {
  const { cxs, secretManager, secretManagerClient } = req;
  try {
    const refundRequest = await buildRefundRequest(req, transactionEntity);

    logger.info('REFUND_REQUEST', refundRequest);

    const authToken =
      await secretManager.paymentServiceRepository.getRefundAuthToken(
        secretManagerClient
      );

    const refundResponse = await cxs.paymentManagementRepository.executeRefund(
      req,
      refundRequest,
      authToken
    );

    await updatePaymentWithRefundStatus(
      req,
      refundResponse,
      transactionEntity,
      refundRequest
    );
  } catch (err) {
    logger.debug('REFUND_SERVICE_HANDLE_REFUND_PROCESS_ERROR', err);
    throw err;
  }
};

export { handleRefundProcess, updatePaymentWithRefundStatus };
