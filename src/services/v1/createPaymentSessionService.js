import logger from '@globetel/cxs-core/core/logger/logger.js';
import { config } from '../../../convict/config.js';
import { constants, paymentsUtil, validationUtil } from '../../util/index.js';

const createPaymentSession = async (req) => {
  try {
    logger.debug('CREATE_PAYMENT_SESSION_START', {
      principalId: req?.app?.principalId,
      channel: req?.app?.channel,
      paymentType: req?.payload?.paymentType,
      currency: req?.payload?.currency,
      countryCode: req?.payload?.countryCode,
      requestType: req?.payload?.settlementInformation?.[0]?.requestType,
    });

    const {
      app: { principalId, channel: clientName } = {},
      payload: {
        paymentType,
        currency,
        countryCode,
        paymentInformation,
        settlementInformation,
        budgetProtectProfile = null,
      },
      validationService,
      paymentAuthService,
      payo,
      headers,
      payment,
      paymentLoyaltyService,
      paymentRequestService,
    } = req;
    const {
      PAYMENT_REQUEST_TYPES: { BBPREPAIDPROMO, BBPREPAIDREPAIR },
    } = constants;

    let clientId = principalId;

    const cxsRequest = {
      paymentType,
      currency,
      countryCode,
      paymentInformation,
      settlementInformation,
      budgetProtectProfile,
    };

    req.app.cxsRequest = cxsRequest;
    req.cxsRequest = cxsRequest;

    logger.debug('CREATE_PAYMENT_SESSION_VALIDATE_PAYMENT_INFORMATION_START');
    await validationService.validatePaymentInformation(req);
    logger.debug('CREATE_PAYMENT_SESSION_VALIDATE_PAYMENT_INFORMATION_OK');

    if (
      [BBPREPAIDPROMO, BBPREPAIDREPAIR].includes(
        cxsRequest.settlementInformation[0].requestType
      )
    ) {
      logger.debug('CREATE_PAYMENT_SESSION_OVERRIDE_CLIENT_ID', {
        reason: 'BBPREPAIDPROMO/BBPREPAIDREPAIR',
        originalClientId: clientId,
      });
      clientId = config.get('dno.clientId');
    }

    logger.debug('CREATE_PAYMENT_SESSION_GET_AUTH_TOKEN_START', {
      clientId,
    });
    const accessToken = await paymentAuthService.getAuthorizationToken(
      clientId,
      req
    );
    logger.debug('CREATE_PAYMENT_SESSION_GET_AUTH_TOKEN_OK', {
      hasAccessToken: Boolean(accessToken),
    });

    let response = {};

    validationUtil.validateVoucherInfoRequest(req);

    logger.debug('CREATE_PAYMENT_SESSION_PREPROCESS_PAYMENT_INFO_START');
    const paymentServiceRequest =
      await paymentRequestService.preProcessPaymentInfo(req);
    logger.debug('CREATE_PAYMENT_SESSION_PREPROCESS_PAYMENT_INFO_OK');

    /**
     * To restore the old, working behavior while still ensuring PAYO gets
     * `amountValue`, we keep the legacy JSON string replacement approach
     * but scope it ONLY to the PAYO payload built by
     * `preProcessPaymentInfo`.
     */
    let createPaymentRequest = paymentServiceRequest;

    try {
      const payloadString = JSON.stringify(paymentServiceRequest);

      const normalizedPayloadString = payloadString
        // Top-level & nested `amount` → `amountValue` inside PAYO payload
        .replace(/"amount":/g, '"amountValue":')
        // ECPAY style `amountToPay` → `amountValueToPay`
        .replace(/"amountToPay":/g, '"amountValueToPay":')
        // If any legacy mapping produced `amountValueCurrency`, convert it
        // to the PayO expected `amountCurrency`.
        .replace(/"amountValueCurrency":/g, '"amountCurrency":');

      createPaymentRequest = JSON.parse(normalizedPayloadString);
    } catch (e) {
      // In case of any unexpected serialization issues, fall back to the
      // original request rather than failing the whole operation.
      logger.debug('CREATE_PAYMENT_SESSION_NORMALIZE_AMOUNTS_FALLBACK', e);
      createPaymentRequest = paymentServiceRequest;
    }

    const createPaymentRequestHeaders = {
      Accept: 'application/json',
      'Content-type': 'application/json',
      authorization: `Bearer ${accessToken}`,
    };

    logger.info('PAYO_CREATE_PAYMENT_REQUEST', {
      body: createPaymentRequest,
      headers: createPaymentRequestHeaders,
    });

    const paymentServiceResponse =
      await payo.paymentServiceRepository.createPayment(
        { body: createPaymentRequest, headers: createPaymentRequestHeaders },
        req
      );

    logger.info('PAYO_CREATE_PAYMENT_RESPONSE', {
      status: paymentServiceResponse?.status,
      data: paymentServiceResponse?.data,
    });

    validationUtil.validateBindingId(cxsRequest, paymentServiceResponse);

    validationUtil.validateOutboundResponse(paymentServiceResponse.status);

    response.tokenPaymentId = paymentServiceResponse.data.paymentId;

    logger.debug('CREATE_PAYMENT_SESSION_TOKEN_PAYMENT_ID', {
      tokenPaymentId: response.tokenPaymentId,
    });

    const paymentEntityModel = await paymentsUtil.buildPaymentEntity(
      response.tokenPaymentId,
      cxsRequest,
      headers,
      principalId,
      paymentServiceRequest
    );

    logger.debug('CREATE_PAYMENT_SESSION_PAYMENT_ENTITY_BUILT');

    // Persist payment entity via migratedTables-aware repository (injected under `payment`).
    // For Dynamo specifically we must send a plain object, not a Mongoose/Model instance.
    const paymentEntityRaw =
      typeof paymentEntityModel.toObject === 'function'
        ? paymentEntityModel.toObject()
        : paymentEntityModel;

    // Strip Mongo-specific identifiers/versioning before writing to Dynamo,
    // so the shape stays aligned with the legacy customer-payments table.
    const { id, _id, __v, ...withoutMongoIds } = paymentEntityRaw;

    // Build a minimal, legacy-aligned snapshot for Dynamo that only
    // contains the fields required by legacy CreatePaymentSession.
    const legacySnapshot =
      paymentsUtil.buildLegacyCreatePaymentSnapshot(withoutMongoIds);

    // Ensure Dynamo receives only JSON-serializable primitives/objects.
    // This will convert any Date instances into ISO strings, etc.
    const paymentEntity = JSON.parse(JSON.stringify(legacySnapshot));

    await payment.customerPaymentsRepository.create(paymentEntity, req);

    logger.debug('CREATE_PAYMENT_SESSION_PAYMENT_ENTITY_PERSISTED', {
      tokenPaymentId: response.tokenPaymentId,
    });

    // ==== Loyalty / pointsEarned behavior (legacy-aligned) ====
    // Java logic summary:
    // - Only invoke loyalty when clientName == SuperApp (NG1 here)
    // - Only for requestType BUY_PROMO or BUY_LOAD (first settlement)
    // - For BUY_PROMO: require at least one transaction with non-null serviceId
    // - For BUY_LOAD: no extra filter

    const {
      PAYMENT_REQUEST_TYPES: { BUY_PROMO, BUY_LOAD },
    } = constants;

    // Legacy uses clientName from the authorizer ("SUPERAPP") rather than
    // an internal enum like NG1. Align with that by checking the
    // incoming clientName / channel case-insensitively.
    const headerClientName =
      headers.clientName || headers['client-name'] || clientName;

    const isSuperApp =
      typeof headerClientName === 'string' &&
      headerClientName.toLowerCase() === 'superapp';

    const firstSettlement = cxsRequest.settlementInformation?.[0];
    const requestType = firstSettlement?.requestType;

    const isBuyPromo =
      typeof requestType === 'string' &&
      requestType.toLowerCase() === BUY_PROMO.toLowerCase();
    const isBuyLoad =
      typeof requestType === 'string' &&
      requestType.toLowerCase() === BUY_LOAD.toLowerCase();

    let shouldInvokeLoyalty = false;

    if (isSuperApp && (isBuyPromo || isBuyLoad)) {
      if (isBuyPromo) {
        const txns = Array.isArray(firstSettlement?.transactions)
          ? firstSettlement.transactions
          : [];

        const hasServiceId = txns.some(
          (t) => t && t.serviceId !== null && t.serviceId !== undefined
        );

        shouldInvokeLoyalty = hasServiceId;
      } else {
        // BUY_LOAD path has no extra filter in legacy
        shouldInvokeLoyalty = true;
      }
    }

    if (shouldInvokeLoyalty) {
      logger.debug('CREATE_PAYMENT_SESSION_LOYALTY_INVOKE', {
        clientName,
        requestType,
      });
      // Delegate to paymentLoyaltyService, which is responsible for
      // determining whether to call the downstream loyalty service and
      // for populating response.pointsEarned based on its own rules.
      // We do not expect a return payload here; the service mutates
      // the response object directly (legacy-aligned behavior).
      // IMPORTANT:
      // `paymentEntity` is a legacy snapshot stripped down for Dynamo writes,
      // and intentionally does NOT include transaction-level fields like
      // `serviceId`.
      //
      // `paymentLoyaltyService` re-checks the presence of `serviceId` for
      // BUY_PROMO before invoking the loyalty simulator. If we pass the
      // stripped snapshot, the re-check fails and pointsEarned will never be
      // set even when the original request contains `serviceId`.
      //
      // So we pass the *full* entity model (or its plain-object equivalent)
      // here, while still persisting the legacy snapshot to Dynamo.
      await paymentLoyaltyService.handleLoyaltyPoints(
        req,
        paymentEntityRaw,
        clientName,
        response
      );
      logger.debug('CREATE_PAYMENT_SESSION_LOYALTY_DONE', {
        pointsEarned: response?.pointsEarned,
      });
    } else {
      logger.debug('CREATE_PAYMENT_SESSION_LOYALTY_SKIPPED', {
        clientName,
        requestType,
      });
    }

    return {
      result: response,
      statusCode: 201,
    };
  } catch (error) {
    // Provide a consistent, searchable ERROR log for ops.
    // Avoid logging tokens / secrets; only include safe request context.
    logger.error('CREATE_PAYMENT_SESSION_FAILED', {
      principalId: req?.app?.principalId,
      channel: req?.app?.channel,
      paymentType: req?.payload?.paymentType,
      currency: req?.payload?.currency,
      countryCode: req?.payload?.countryCode,
      requestType: req?.payload?.settlementInformation?.[0]?.requestType,
      // Best-effort correlation IDs (varies by gateway/env)
      requestId:
        req?.info?.id ??
        req?.request?.info?.id ??
        req?.headers?.['x-request-id'] ??
        req?.headers?.['x-correlation-id'] ??
        null,
      messageId:
        req?.payload?.messageId ??
        req?.payload?.message_id ??
        req?.headers?.messageId ??
        req?.headers?.message_id ??
        null,
      error: {
        type: error?.type,
        message: error?.message,
        displayMessage: error?.displayMessage,
        details: error?.details,
        status: error?.status ?? error?.response?.status,
      },
    });

    // Keep the full object in debug logs for developers.
    logger.debug('CREATE_PAYMENT_SESSION_OPERATION_ERROR', error);
    throw error;
  }
};

export { createPaymentSession };
