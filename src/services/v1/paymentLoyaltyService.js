import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { config } from '../../../convict/config.js';
import { constants, objectUtil } from '../../util/index.js';

const handleLoyaltyPoints = async (
  req,
  paymentDetails,
  clientName,
  response
) => {
  const { headers, cxs, http, invokeLambda, serviceHelpers } = req;

  let data;

  const {
    migratedLambdas,
    loyaltyPointsSimulator: { name: loyaltyPointsSimulatorLambda },
  } = config.get('lambda');

  const isMigratedLambda = migratedLambdas.includes(
    loyaltyPointsSimulatorLambda
  );

  const decodeInvokePayload = (payload) => {
    if (!payload) return null;

    // AWS SDK v3 may return Uint8Array, Buffer, string, or already-parsed object.
    if (typeof payload === 'string') {
      try {
        return JSON.parse(payload);
      } catch {
        return payload;
      }
    }

    if (Buffer.isBuffer(payload)) {
      const s = payload.toString('utf8');
      try {
        return JSON.parse(s);
      } catch {
        return s;
      }
    }

    if (payload instanceof Uint8Array) {
      const s = Buffer.from(payload).toString('utf8');
      try {
        return JSON.parse(s);
      } catch {
        return s;
      }
    }

    // Some wrappers/loggers stringify buffers into {0:..,1:..} objects.
    if (typeof payload === 'object') {
      const keys = Object.keys(payload);
      const looksLikeByteMap =
        keys.length > 0 && keys.every((k) => /^\d+$/.test(k));

      if (looksLikeByteMap) {
        try {
          const bytes = keys
            .map((k) => Number(k))
            .sort((a, b) => a - b)
            .map((k) => payload[String(k)])
            .filter((b) => typeof b === 'number');
          const s = Buffer.from(bytes).toString('utf8');
          return JSON.parse(s);
        } catch {
          return payload;
        }
      }
    }

    return payload;
  };

  const normalizeLoyaltyLambdaResponse = (parsedPayload) => {
    // The loyalty lambda has historically returned multiple shapes.
    // We normalize these into the same `data` variable consumed below.
    //
    // Known shapes:
    // 1) API Gateway proxy: { statusCode, body: "{...}" }
    // 2) API Gateway proxy but body already parsed: { statusCode, body: {...} | [...] }
    // 3) Direct: { result: { pointsEarned } }
    if (!parsedPayload || typeof parsedPayload !== 'object')
      return parsedPayload;

    if (Object.prototype.hasOwnProperty.call(parsedPayload, 'body')) {
      const body = parsedPayload.body;

      if (typeof body === 'string') {
        try {
          return JSON.parse(body);
        } catch {
          return parsedPayload;
        }
      }

      // If body is already an object/array, use it directly.
      return body;
    }

    return parsedPayload;
  };

  try {
    const headerClientName =
      req.headers.clientName || req.headers['client-name'] || clientName;

    const isSuperAppChannel =
      typeof headerClientName === 'string' &&
      headerClientName.toUpperCase() === 'SUPERAPP';

    const tokenId = paymentDetails.tokenPaymentId || '';

    const isGlaToken = tokenId.startsWith(constants.CHANNEL_NAME.SUPERAPP);
    const isCptToken = tokenId.includes(constants.CHANNEL_NAME.CPT);

    if (isSuperAppChannel || isGlaToken || isCptToken) {
      if (
        paymentDetails.settlementDetails &&
        paymentDetails.settlementDetails.length > 0
      ) {
        for await (let settlement of paymentDetails.settlementDetails) {
          const { BUY_PROMO, BUY_LOAD } = constants.PAYMENT_REQUEST_TYPES;
          const requestType = settlement.requestType?.toUpperCase();

          const invokeLoyalty =
            requestType === BUY_LOAD.toUpperCase() ||
            (requestType === BUY_PROMO.toUpperCase() &&
              settlement.transactions?.some((txn) =>
                objectUtil.hasAttribute(txn, 'serviceId')
              ));

          logger.debug('invokeLoyalty:', invokeLoyalty);

          if (invokeLoyalty) {
            // INFO so we can confirm in prod whether loyalty was attempted.
            logger.info('PAYMENT_LOYALTY_INVOKE', {
              requestType,
              transactionCount: Array.isArray(settlement?.transactions)
                ? settlement.transactions.length
                : 0,
              tokenPaymentId: paymentDetails?.tokenPaymentId,
              principalId: req?.app?.principalId,
              mode: isMigratedLambda ? 'GCP_HTTP' : 'AWS_LAMBDA',
            });
            const loyaltyPointsRequest = {
              authorization: headers.authorization,
              clientName: headers.clientName,
              host: headers.host,
              principalId: req.app.principalId,
              currency: constants.CURRENCY.PHP,
              mobileNumber: settlement.mobileNumber,
              requestType: settlement.requestType,
              transactions: JSON.stringify(settlement.transactions),
            };

            if (isMigratedLambda) {
              data =
                await cxs.loyaltyManagementRepository.loyaltyPointsSimulator(
                  http,
                  loyaltyPointsRequest
                );
              logger.info('GCP LoyaltyPointsSimulator');
            } else {
              // NOTE: the helper is named `loyaltyPointsSimulatorLambda`.
              // The old call site used `loyaltyPointsSimulator` + wrong param
              // name; keep behavior consistent across migrated and
              // non-migrated deployments.
              const invokeRes =
                await serviceHelpers.lambdaService.loyaltyPointsSimulatorLambda(
                  {
                    invokeLambda,
                    payload: loyaltyPointsRequest,
                  }
                );

              // If lambda returns FunctionError, surface it in logs (keep 201 behavior).
              if (invokeRes?.FunctionError) {
                const parsed = decodeInvokePayload(invokeRes?.Payload);
                logger.error('PAYMENT_LOYALTY_LAMBDA_ERROR', {
                  tokenPaymentId: paymentDetails?.tokenPaymentId,
                  functionError: invokeRes.FunctionError,
                  statusCode: invokeRes.StatusCode,
                  payload: parsed,
                });
              }

              // Normalize the lambda invoke response into the same shape as the
              // HTTP repository call, so points extraction below is consistent.
              // Common patterns:
              // - lambda returns { result: { pointsEarned } }
              // - lambda returns API gateway proxy: { statusCode, body: "{...}" }
              // - OR: { statusCode, body: [...] } (body already parsed)
              const parsedPayload = decodeInvokePayload(invokeRes?.Payload);
              data = normalizeLoyaltyLambdaResponse(parsedPayload);
              logger.info('AWS LoyaltyPointsSimulator');
            }

            // Match downstream response shape(s) and be defensive.
            // Keep 0 / empty-array values (legacy expectation).
            let pointsEarned =
              data?.result?.pointsEarned ??
              data?.results?.pointsEarned ??
              data?.data?.pointsEarned ??
              data?.pointsEarned;

            // Some legacy lambda implementations return the points list directly
            // as an array in the `body`.
            if (pointsEarned === undefined && Array.isArray(data)) {
              pointsEarned = data;
            }

            if (pointsEarned !== undefined && pointsEarned !== null) {
              // API contract + swagger currently define pointsEarned as an array.
              // Normalize to an array to avoid response-schema mismatch.
              response.pointsEarned = Array.isArray(pointsEarned)
                ? pointsEarned
                : [pointsEarned];
            }

            logger.info('PAYMENT_LOYALTY_RESULT', {
              tokenPaymentId: paymentDetails?.tokenPaymentId,
              requestType: settlement.requestType,
              pointsEarned,
              hasPointsEarned: Object.prototype.hasOwnProperty.call(
                response,
                'pointsEarned'
              ),
            });
          } else {
            logger.debug('PAYMENT_LOYALTY_SKIPPED', {
              requestType,
            });
          }
        }
      }
    } else {
      logger.debug('PAYMENT_LOYALTY_NOT_ELIGIBLE_CLIENT', {
        clientName,
        tokenPaymentId: paymentDetails?.tokenPaymentId,
      });
    }
  } catch (e) {
    // Keep CreatePaymentSession 201 behavior, but surface errors in prod logs.
    // This helps debug missing pointsEarned.
    logger.error('PAYMENT_LOYALTY_HANDLE_ERROR', {
      tokenPaymentId: paymentDetails?.tokenPaymentId,
      principalId: req?.app?.principalId,
      error: {
        message: e?.message,
        type: e?.type,
        stack: e?.stack,
      },
    });
  }

  logger.debug('handleLoyaltyPoints response', response);

  return response;
};

export { handleLoyaltyPoints };
