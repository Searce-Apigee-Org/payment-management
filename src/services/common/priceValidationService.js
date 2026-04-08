import msisdnFormatter from '@globetel/cxs-core/core/utils/string/msisdnFormatter.js';
import { constants, paymentsUtil, validationUtil } from '../../util/index.js';

//TODO - FLOW CHECK (location lambda doesnt exist in legacy)
const validateServiceIdPrice = async (
  settlementInformation,
  req,
  paymentRequestType
) => {
  try {
    const { gcs } = req;
    const { transactions, mobileNumber } = settlementInformation;

    const fileSuffix = paymentRequestType.toUpperCase();

    for (const transaction of transactions) {
      if (!transaction.keyword) {
        const buyPromoStorageResult =
          await gcs.buyPromoServiceRepository.getResult(req, fileSuffix);

        const formattedPrice = paymentsUtil.formatAmount(transaction.amount);

        const match = buyPromoStorageResult.find(
          (p) =>
            (p.serviceID ?? '') === transaction.serviceId &&
            (p.param ?? '') === (transaction.param?.trim() || '') &&
            (p.price ?? '') === formattedPrice
        );

        if (!match) {
          //TODO - match with legacy

          throw {
            type: 'CustomBadRequestError',
            details: 'ServiceId and amount are not allowed.',
          };
        }

        //TODO - unconfirmed flow
        if (!match.mm || match.mm !== '1') {
          throw {
            type: 'CustomBadRequestError',
            details: 'ServiceId and amount are not allowed.',
          };
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
    initVoucher['VOUCHER_AUTH_TOKEN'],
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

  paymentsUtil.checkMaxVoucherAllowed(
    maxDiscount,
    totalTransAmount,
    voucherDiscount
  );
};

export { validateServiceIdPrice, validateSettlementAmountVoucher };
