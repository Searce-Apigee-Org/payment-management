import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { constants } from '../../util/index.js';

const useVoucher = async (req) => {
  const {
    mongo,
    oneApi,
    payload: { tokenPaymentId },
    secretManager,
    secretManagerClient,
  } = req;
  try {
    const payments =
      await mongo.paymentRepository.findByPaymentId(tokenPaymentId);

    const accessToken =
      await secretManager.paymentServiceRepository.getUpdateVoucherAuthToken(
        secretManagerClient,
        constants.APIS,
        constants.API_NUMBERS.CREATE_PAYMENT_SESSION,
        constants.API_VERSIONS.V1,
        constants.SECRET_ENTITY.VOUCHER
      );

    await oneApi.voucherRepository.updateVoucher(req, payments, accessToken);
  } catch (error) {
    logger.debug('ONE_API_USE_VOUCHER_ERROR', error);
    throw {
      type: 'OutboundOperationFailed',
      details: 'The server encountered an outbound operation error.',
    };
  }
};

export { useVoucher };
