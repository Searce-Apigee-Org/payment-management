import { logger } from '@globetel/cxs-core/core/logger/index.js';
import msisdnFormatter from '@globetel/cxs-core/core/utils/string/msisdnFormatter.js';
import { config } from '../../../convict/config.js';
import { constants, paymentsUtil, validationUtil } from '../../util/index.js';

const validateServiceIdPrice = async (
  settlementInformation,
  req,
  paymentRequestType
) => {
  try {
    const { gcs } = req;
    const { transactions, mobileNumber } = settlementInformation;

    // Single source of truth: repository will build the legacy key based on
    // Authorization JWT client_id + requestType.
    // paymentRequestType here is like BUY_PROMO/BUY_VOUCHER.
    const legacyRequestType = String(paymentRequestType || '')
      .toLowerCase()
      .replace('buy_', 'buy');

    // BuyVoucher legacy catalogs do not consistently include a `param` dimension.
    // Some channels send voucherCategory/serviceNumber instead of serviceId/param.
    // We normalize those fields here for backward compatibility.
    const ignoreParamMatch = legacyRequestType === 'buyvoucher';

    for (const transaction of transactions) {
      // Legacy: only do catalog lookup when keyword is null/undefined.
      // Empty string is considered "present" and should skip lookup.
      if (transaction.keyword === null || transaction.keyword === undefined) {
        const buyPromoStorageResult =
          await gcs.buyPromoServiceRepository.getResult(req, legacyRequestType);

        const formattedPrice = paymentsUtil.formatAmount(transaction.amount);

        const normalizedServiceId =
          transaction.serviceId ?? transaction.voucherCategory ?? '';

        const normalizedParam = transaction.param ?? '';

        const match = buyPromoStorageResult.find(
          (p) =>
            (p.serviceID ?? '') === normalizedServiceId &&
            // Legacy: do not trim param; compare as-is (but normalize null->'')
            (ignoreParamMatch || (p.param ?? '') === normalizedParam) &&
            (p.price ?? '') === formattedPrice
        );

        if (!match) {
          throw {
            type: 'CustomBadRequestError',
            details: 'ServiceId and amount are not allowed.',
          };
        }

        // Legacy: mm containing "1" requires a subscriber eligibility validation.
        // LocationValidatorLambda is retired, so we apply a configurable policy.
        const requiresEligibility = String(match.mm || '').includes('1');
        if (requiresEligibility) {
          const policy = config.get('promoEligibility.policy');

          if (policy === 'FAIL_CLOSED') {
            throw {
              type: 'CustomBadRequestError',
              details: 'The subscriber is not eligible to use the promo',
            };
          }

          // PERMISSIVE: allow but emit log for monitoring.
          logger.warn('PROMO_ELIGIBILITY_SKIPPED_MM1', {
            serviceId: transaction.serviceId,
            mobileNumber,
            mm: match.mm,
          });
        }
      }
    }
  } catch (err) {
    throw err;
  }
};

const validateSettlementAmountVoucher = async (settlementInformation, req) => {
  const {
    app: {
      additionalParams: { paymentType = null, UUID_USER = null },
    },
    secretManager,
    secret,
    oneApi,
    http,
  } = req;

  if (!paymentType || !UUID_USER) {
    throw {
      type: 'InvalidParameter',
    };
  }

  const totalTransAmount = validationUtil.validateSettlementAmount(
    settlementInformation
  );

  let account;
  let isMobileNumber = false;

  const {
    accountNumber = null,
    mobileNumber = null,
    voucher,
  } = settlementInformation;

  if (accountNumber) {
    account = accountNumber;
  }

  if (mobileNumber) {
    isMobileNumber = true;
    account = msisdnFormatter(mobileNumber, '09');
  }

  const initVoucher =
    await secretManager.paymentServiceRepository.getInitVoucher(
      secret,
      constants.SECRET_ENTITY.VOUCHER,
      constants.API_VERSIONS.V1,
      constants.API_NUMBERS.CREATE_PAYMENT_SESSION
    );

  if (!initVoucher.VOUCHER_AUTH_TOKEN) {
    throw {
      type: 'InternalOperationFailed',
      details: 'Voucher init config missing VOUCHER_AUTH_TOKEN.',
    };
  }

  let voucherRequest = {
    voucherCode: voucher.code,
    voucherCategory: voucher.category,
  };

  if (isMobileNumber) {
    voucherRequest = { ...voucherRequest, mobileNumber: account };
  } else {
    voucherRequest = { ...voucherRequest, account };
  }

  const voucherResponse = await oneApi.voucherRepository.getVoucherData(
    voucherRequest,
    initVoucher.VOUCHER_AUTH_TOKEN,
    http
  );

  const { voucher: voucherData } = voucherResponse;

  if (voucherData?.message) {
    throw {
      type: 'InvalidOutboundRequest',
      details: 'The voucher is invalid.',
    };
  }

  const requestType = settlementInformation.requestType.toLowerCase();

  req.app.cxsRequest.settlementInformation.forEach((settlement) => {
    settlement.voucher ??= {};
    settlement.voucher.type = voucher?.type ?? null;
    settlement.voucher.amount = voucher?.discount_amount ?? null;
  });

  const voucherProducts = Array.isArray(voucherData.product)
    ? voucherData.product
    : [voucherData.product];

  if (!voucherProducts.includes(requestType)) {
    throw {
      type: 'InvalidOutboundRequest',
      details: 'The voucher is invalid',
    };
  }

  const voucherDiscount = paymentsUtil.calculateVoucherAmount(
    voucherData,
    totalTransAmount,
    settlementInformation.amount,
    requestType,
    settlementInformation
  );

  const maxDiscount = Number(
    initVoucher['VOUCHER_DISCOUNT_PERCENTAGE_MAX_LIMIT']
  );

  if (!Number.isFinite(maxDiscount)) {
    throw {
      type: 'InternalOperationFailed',
      details:
        'Voucher init config missing/invalid VOUCHER_DISCOUNT_PERCENTAGE_MAX_LIMIT.',
    };
  }

  paymentsUtil.checkMaxVoucherAllowed(
    maxDiscount,
    totalTransAmount,
    voucherDiscount
  );
};

export { validateServiceIdPrice, validateSettlementAmountVoucher };
