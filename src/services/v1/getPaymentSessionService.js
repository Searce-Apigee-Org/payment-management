import { dataDictionary } from '@globetel/cxs-core/core/index.js';
import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { config } from '../../../convict/config.js';
import { constants, transformers } from '../../util/index.js';

const getPaymentSession = async (req) => {
  try {
    const {
      headers,
      params,
      payment,
      questIndicatorService,
      paymentLoyaltyService,
    } = req;
    const { tokenPaymentId } = params;

    dataDictionary.setDataDictionary(req, {
      eventName: constants.EVENT_NAME.GET_PAYMENT_SESSION_BY_TOKEN_PAYMENT_ID,
      episode: constants.EPISODES.PAY,
      unique_session_identifier: headers.deviceid || '',
      platform: headers.deviceid
        ? constants.PLATFORMS.APP
        : constants.PLATFORMS.WEB,
    });

    // Persist payment entity via migratedTables-aware repository (injected under `payment`)
    const paymentDetails = await payment.customerPaymentsRepository.findOne(
      tokenPaymentId,
      req
    );

    if (!paymentDetails) {
      throw {
        type: 'ResourceNotFound',
        details: 'Payment Id not found.',
      };
    }

    const env = config.get('nodeEnv');
    // Mirror legacy behavior: in non-prod environments always delegate
    // to questIndicatorService, which will internally decide whether
    // the payment qualifies for quest checks based on token, request
    // type, etc.
    if (env !== 'production') {
      await questIndicatorService.checkQuestIndicator(req, paymentDetails);
    }

    // Build the canonical GetPaymentSession response using the
    // transformer, which mirrors the legacy Java
    // GetPaymentSessionResponse contract.
    let response =
      transformers.v1Transformers.paymentSessionTransformer.buildPaymentSessionResponse(
        paymentDetails
      );

    logger.debug('GET_PAYMENT_SESSION_RESPONSE', response);

    let clientName = null;

    if (
      paymentDetails.headers &&
      Object.keys(paymentDetails.headers).length > 0
    ) {
      clientName = paymentDetails.headers.clientName;
    }

    try {
      response = await paymentLoyaltyService.handleLoyaltyPoints(
        req,
        paymentDetails,
        clientName,
        response
      );

      // Legacy behavior: loyalty errors should not fail the overall
      // GetPaymentSession call. Only enrich the response with
      // pointsEarned when available, otherwise silently continue.
      // if (loyaltyResponse && loyaltyResponse.pointsEarned) {
      //   response.pointsEarned = loyaltyResponse.pointsEarned;
      // }
    } catch (e) {
      logger.debug('LOYALTY_POINTS_ERROR', e);
    }

    dataDictionary.setDataDictionary(req, {
      transaction_status: constants.TRANSACTION_STATUS.SUCCESS,
      event_detail: {
        payment_session_information: paymentDetails,
      },
    });

    // For the public GetPaymentSessionByTokenPaymentId endpoint, we
    // must expose only the slim legacy contract: tokenPaymentId,
    // checkoutUrl, accounts[*].status, accounts[*].transactions[*]
    // (transactionId, amount, keyword, provisionStatus), and
    // optional pointsEarned. All other transformer fields remain
    // internal.
    // const outwardResponse = {
    //   tokenPaymentId: response.tokenPaymentId,
    //   checkoutUrl: response.checkoutUrl,
    //   accounts: response.accounts.map((acc) => ({
    //     status: acc.status,
    //     transactions: acc.transactions.map((txn) => ({
    //       transactionId: txn.transactionId ?? ' ',
    //       amount:
    // Normalize both Mongo Decimal128 and Dynamo-style numeric
    // wrappers into a plain number so the outward contract is
    // consistent regardless of underlying store.
    //         typeof txn.amount === 'number'
    //           ? txn.amount
    //           : txn.amount && typeof txn.amount === 'object'
    //             ? Number(
    //                 txn.amount.$numberDecimal ||
    //                   txn.amount.$number_decimal ||
    //                   txn.amount
    //               )
    //             : Number(txn.amount),
    //       keyword: txn.keyword,
    //       provisionStatus: txn.provisionStatus,
    //     })),
    //   })),
    // };

    // if (response.pointsEarned) {
    //   outwardResponse.pointsEarned = response.pointsEarned;
    // }

    // return outwardResponse;

    logger.debug('GET_PAYMENT_SESSION_RESPONSE', response); // Temporary only for debugging

    return response;
  } catch (error) {
    dataDictionary.setDataDictionary(req, {
      transaction_status: constants.TRANSACTION_STATUS.FAILED,
      event_detail: {
        payment_session_information: '',
      },
      error,
    });

    // Log full error context so we can troubleshoot Dynamo/Mongo issues in
    // staging where debug logs might not be emitted.
    logger.error('GET_PAYMENT_SESSION_ERROR', {
      tokenPaymentId: req?.params?.tokenPaymentId ?? null,
      errorType: error?.type ?? null,
      errorName: error?.name ?? null,
      errorMessage: error?.message ?? null,
      errorDetails: error?.details ?? null,
      awsMetadata: error?.$metadata ?? null,
      stack: error?.stack ?? null,
    });

    if (error.type) {
      throw error;
    }

    throw {
      type: 'InternalOperationFailed',
    };
  }
};

export { getPaymentSession };
