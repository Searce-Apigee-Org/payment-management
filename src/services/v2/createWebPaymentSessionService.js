import { dataDictionary } from '@globetel/cxs-core/core/index.js';
import { logger } from '@globetel/cxs-core/core/logger/index.js';
import moment from 'moment';
import { constants } from '../../util/index.js';

const createWebPaymentSession = async (req) => {
  try {
    const {
      headers,
      payload,
      pre: { user },
      app: { principalId },
      payoT2,
      http,
      payment, // db call
      serviceHelpers,
      payoT2AuthService,
      oonaService,
      singlifeService,
    } = req;

    dataDictionary.setDataDictionary(req, {
      episode: constants.EPISODES.PAY,
      event_detail: {
        request_authorization: {},
        request_parameters: { ...payload },
        response_parameter: {},
      },
    });

    let uuid;
    if (user) {
      logger.info('User UUID:', user.uuid);
      uuid = user.uuid;
    }

    // Get GpayO accesstoken from ssm.
    // If GPayO accesstoken is expired, fetch creds form ssm, use it to get new accessTOken and update it.
    const gPayOAccessToken =
      await payoT2AuthService.retrieveGPayOAccessToken(req);

    // For Oona Transactions
    if (
      payload?.settlementInfo?.breakdown?.some(
        (item) => item.transactionType === 'O'
      )
    ) {
      await oonaService.applyOonaPricingForV2(req);
    }

    // For Singlife or Budget Protect Transactions
    if (
      payload?.settlementInfo?.breakdown?.some(
        (item) => item.transactionType === 'S'
      )
    ) {
      await singlifeService.computeSinglifePricing(req);
    }

    // Invoke GPayO websession api and get the response.
    const gPayOWebSessionResponse =
      await serviceHelpers.webPaymentSessionService.createWebPaymentSessionRequest(
        {
          uuid,
          payload,
          gPayOAccessToken,
          http,
          payoT2,
        }
      );

    // Prepare data to be added into customer-payments and insert it.
    const toInsert =
      await serviceHelpers.webPaymentSessionService.insertWebPaymentSessionToDB(
        {
          principalId,
          headers,
          payload,
          moment,
          gPayOWebSessionResponse,
        }
      );

    logger.debug('DB_INPUT', toInsert);
    // Persist payment entity via migratedTables-aware repository (injected under `payment`)
    await payment.customerPaymentsRepository.create(toInsert, req);

    // Return the response of GPayO websession api.
    const res = {
      tokenPaymentId: gPayOWebSessionResponse.paymentId,
      webSessionUrl: gPayOWebSessionResponse.webSessionUrl,
      webSessionToken: gPayOWebSessionResponse.authorization,
      ttl: gPayOWebSessionResponse.ttl,
    };

    dataDictionary.setDataDictionary(req, {
      event_detail: { response_parameters: { res } },
      transaction_status: constants.TRANSACTION_STATUS.SUCCESS,
    });

    return res;
  } catch (err) {
    logger.debug('CREATE_WEB_PAYMENT_SESSION_OPERATION_FAILED', err);
    throw err;
  }
};

export { createWebPaymentSession };
