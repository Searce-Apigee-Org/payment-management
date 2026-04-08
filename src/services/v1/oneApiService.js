import { logger } from '@globetel/cxs-core/core/logger/index.js';

const useVoucher = async (req) => {
  const {
    mongo,
    oneApi,
    payload: { tokenPaymentId },
  } = req;
  try {
    const payments =
      await mongo.paymentRepository.findByPaymentId(tokenPaymentId);

    await oneApi.voucherRepository.updateVoucher(req, payments);
  } catch (error) {
    logger.debug('ONE_API_USE_VOUCHER_ERROR', error);
    throw {
      type: 'OutboundOperationFailed',
      details: 'The server encountered an outbound operation error.',
    };
  }
};

export { useVoucher };
