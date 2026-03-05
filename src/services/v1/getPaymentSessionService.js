import { dataDictionary } from '@globetel/cxs-core/core/index.js';
import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { config } from '../../../convict/config.js';
import { constants, transformers } from '../../util/index.js';

const getPaymentSession = async (req) => {
  try {
    const {
      headers,
      params,
      mongo,
      questIndicatorService,
      paymentLoyaltyService,
    } = req;
    const { tokenPaymentId } = params;

    dataDictionary.setDataDictionary(req, {
      episode: constants.EPISODES.PAY,
      unique_session_identifier: headers.deviceid || '',
      platform: headers.deviceid
        ? constants.PLATFORMS.APP
        : constants.PLATFORMS.WEB,
    });

    const paymentDetails =
      await mongo.customerPaymentsRepository.findOne(tokenPaymentId);

    if (!paymentDetails) {
      throw {
        type: 'ResourceNotFound',
        details: 'Payment Id not found.',
      };
    }

    const env = config.get('nodeEnv');
    if (
      env !== 'production' &&
      paymentDetails.tokenPaymentId.includes(constants.CHANNEL.GLA)
    ) {
      await questIndicatorService.checkQuestIndicator(req, paymentDetails);
    }

    let response =
      transformers.v1Transformers.paymentSessionTransformer.buildPaymentSessionResponse(
        paymentDetails
      );
    let clientName = null;

    if (
      paymentDetails.headers &&
      Object.keys(paymentDetails.headers).length > 0
    ) {
      clientName = paymentDetails.headers.clientName;
    }

    response = await paymentLoyaltyService.handleLoyaltyPoints(
      req,
      paymentDetails,
      clientName,
      response
    );

    dataDictionary.setDataDictionary(req, {
      transaction_status: constants.TRANSACTION_STATUS.SUCCESS,
      event_detail: {
        payment_session_information: paymentDetails,
      },
    });

    return { result: response };
  } catch (error) {
    dataDictionary.setDataDictionary(req, {
      transaction_status: constants.TRANSACTION_STATUS.FAILED,
      event_detail: {
        payment_session_information: '',
      },
    });

    logger.debug('GET_PAYMENT_SESSION_ERROR', error);

    if (error.type) {
      throw error;
    }

    throw {
      type: 'InternalOperationFailed',
    };
  }
};

export { getPaymentSession };
