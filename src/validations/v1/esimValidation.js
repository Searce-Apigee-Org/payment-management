import constants from '@globetel/cxs-core/core/constants/index.js';
import Joi from 'joi';

const createEsimPaymentSessionRequestSchema = {
  headers: Joi.object({
    authorization: Joi.string().required().trim(),
    deviceid: Joi.string().required().trim(),
    'user-token': Joi.string().optional().trim(),
  }),
  options: {
    allowUnknown: true,
  },
  payload: Joi.object({
    paymentType: Joi.string()
      .valid('XENDIT', 'GCASH')
      .default('XENDIT')
      .optional()
      .label('PaymentyTypeModel')
      .trim(),
    paymentInformation: Joi.object({
      productValidity: Joi.string()
        .pattern(constants.pattern.ACCOUNT_NUMBER_PATTERN)
        .optional()
        .trim(),
      // XENDIT
      type: Joi.string()
        .valid('CC_DC', 'DIRECT_DEBIT', 'EWALLET')
        .optional()
        .trim()
        .label('PaymentInformationTypeModel'),
      paymentMethodId: Joi.string().optional().trim(),
      productName: Joi.string().optional().trim(),
      productId: Joi.string().optional().trim(),
      reusability: Joi.string().optional().trim(),
      merchantId: Joi.string().optional().trim(),
      channelCode: Joi.string()
        .valid('BPI', 'UBP', 'RCBC', 'PAYMAYA', 'SHOPEEPAY', 'GRABPAY')
        .optional()
        .trim()
        .label('PaymentInformationChannelCodeModel'),
      directDebit: Joi.object({
        successUrl: Joi.string().required().trim(),
        failureUrl: Joi.string().required().trim(),
      })
        .optional()
        .label('PaymentInformationDirectDebitModel'),
      eWallet: Joi.object({
        cancelUrl: Joi.string().optional().trim(),
        failureUrl: Joi.string().optional().trim(),
        successUrl: Joi.string().required().trim(),
      })
        .optional()
        .label('PaymentInformationEWalletModel'),
      // GCASH
      notificationUrls: Joi.array()
        .items(
          Joi.object({
            url: Joi.string().required().trim(),
            type: Joi.string()
              .required()
              .valid('PAY_RETURN', 'CANCEL_RETURN', 'NOTIFICATION')
              .trim()
              .label('PaymentInformationNotificationUrlsTypeModel'),
          }).label('PaymentInformationNotificationUrlObject')
        )
        .min(1)
        .optional()
        .label('PaymentInformationNotificationUrlsModel'),
      envInfo: Joi.object({
        orderTerminalType: Joi.string().required().trim(),
        terminalType: Joi.string().required().trim(),
        merchantTerminalId: Joi.string().optional().trim(),
      })
        .optional()
        .label('PaymentInformationEnvInfoModel'),
      order: Joi.object({
        orderTitle: Joi.string().required().trim(),
      })
        .optional()
        .label('PaymentInformationOrderModel'),
      signAgreementPay: Joi.boolean(),
      subMerchantName: Joi.string().optional().trim(),
      subMerchantId: Joi.string().optional().trim(),
    })
      .required()
      .label('PaymentInformationModel'),
    settlementInformation: Joi.array()
      .items(
        Joi.object({
          mobileNumber: Joi.string()
            .pattern(constants.pattern.MSISDN_REGEX_PATTERN)
            .required()
            .trim(),
          emailAddress: Joi.string().optional().trim(),
          amount: Joi.number().min(1).required(),
          requestType: Joi.string()
            .valid(
              'BuyESIM',
              'BuyESIMLocal',
              'BuyESIMTM',
              'PtoESIM',
              'DeviceTransfer'
            )
            .default('BuyESIM')
            .optional()
            .trim()
            .label('SettlementInformationRequestTypeModel'),
        }).label('CreateEsimPaymentSessionRequestSettlementInformationObject')
      )
      .required()
      .min(1)
      .label('CreateEsimPaymentSessionRequestSettlementInformationModel'),
  })
    .required()
    .label('CreateEsimPaymentSessionRequestPayload'),
};

const createEsimPaymentSessionResponseSchema = Joi.object({
  result: Joi.object({
    tokenPaymentId: Joi.string().required(),
  })
    .required()
    .label('CreateEsimPaymentSessionResultModel'),
});

export {
  createEsimPaymentSessionRequestSchema,
  createEsimPaymentSessionResponseSchema,
};
