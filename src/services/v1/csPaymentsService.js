import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { constants } from '../../util/index.js';

const processCSPayments = async (req) => {
  try {
    const {
      payload,
      secretManager,
      tokenStore,
      mongo,
      csPaymentsSettlementService,
      gorTokenService,
    } = req;
    const { tokenPaymentId, paymentStatus } = payload;

    if (!paymentStatus.includes(constants.PAYMENT_STATUS.AUTHORISED)) {
      logger.info(`payment ${tokenPaymentId} is not AUTHORISED`);
      return { statusCode: constants.HTTP_STATUS.NO_CONTENT };
    }

    const formatTokenPaymentId = `${tokenPaymentId.slice(0, 3)}-${tokenPaymentId.slice(3)}`;
    payload.paymentStatus = constants.PAYMENT_STATUS.AUTHORIZED;

    const [decodedCredentials, cachedToken, paymentSession] = await Promise.all(
      [
        secretManager.csPaymentsRepository.getCSPaymentsCredentials(req),
        tokenStore.csPaymentsRepository.fetchAccessToken(
          req,
          constants.SECRET_ENTITY.CHANGE_SIM
        ),
        mongo.customerPaymentsRepository.findOne(tokenPaymentId),
      ]
    );

    const authorization = decodedCredentials?.headers?.authorization;
    const accessTokenCredentials = { authorization: `Bearer ${authorization}` };
    const paymentSessionDetails = paymentSession;

    const gorAccessToken = await gorTokenService.getOrRefreshAccessToken(
      req,
      cachedToken,
      accessTokenCredentials
    );

    await csPaymentsSettlementService.processAllSettlements({
      req,
      settlementDetails: paymentSessionDetails.settlementDetails,
      formatTokenPaymentId,
      gorAccessToken,
      accessTokenCredentials,
    });

    return { statusCode: constants.HTTP_STATUS.NO_CONTENT };
  } catch (err) {
    logger.debug('API_PROCESS_CS_PAYMENTS_ERROR', err);
    throw err;
  }
};

export { processCSPayments };
