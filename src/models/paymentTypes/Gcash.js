import logger from '@globetel/cxs-core/core/logger/logger.js';
import Joi from 'joi';
import { constants, validationUtil } from '../../util/index.js';

const GcashRequestSchema = Joi.object({
  notificationUrls: Joi.array()
    .min(1)
    .items(
      Joi.object({
        type: Joi.string()
          .valid('PAY_RETURN', 'CANCEL_RETURN', 'NOTIFICATION')
          .required(),
        url: Joi.string().pattern(/\S/).required(),
      })
        .required()
        .unknown(false)
    )
    .required(),

  signAgreementPay: Joi.boolean(),

  extendedInformation: Joi.string(),

  environmentInformation: Joi.object({
    orderTerminalType: Joi.string().pattern(/\S/).required(),
    terminalType: Joi.string().pattern(/\S/).required(),
    appVersion: Joi.string(),
    osType: Joi.string(),
    clientIp: Joi.string(),
    merchantTerminalId: Joi.string(),
    merchantIp: Joi.string(),
    extendedInfo: Joi.string(),
  })
    .required()
    .unknown(false),

  productCode: Joi.string(),

  subMerchantId: Joi.string(),

  subMerchantName: Joi.string(),

  order: Joi.object({
    merchantTransId: Joi.string(),
    merchantTransType: Joi.string(),
    orderMemo: Joi.string(),
    orderTitle: Joi.string().pattern(/\S/).required(),
    buyer: Joi.object({
      userId: Joi.string(),
      externalUserId: Joi.string(),
      externalUserType: Joi.string(),
    }).unknown(false),
    seller: Joi.object({
      userId: Joi.string(),
      externalUserId: Joi.string(),
      externalUserType: Joi.string(),
    }).unknown(false),
  })
    .required()
    .unknown(false),

  bindingRequestID: Joi.string(),

  budgetProtect: Joi.boolean(),
})
  .required()
  .unknown(false);

const validateGcashRequest = (payload) => {
  try {
    const { error, value } = GcashRequestSchema.validate(payload);

    if (error) {
      logger.debug('GcashRequestValidationFailed', error);

      const keywords = ['must contain at least one', 'is required'];
      const errorType = keywords.some((k) =>
        error.details[0].message.includes(k)
      )
        ? 'InsufficientParameters'
        : 'InvalidParameter';

      throw {
        type: errorType,
      };
    }

    return value;
  } catch (err) {
    logger.debug('GcashRequestValidaiton failed', err);
    throw err;
  }
};

const processGcashRequest = async (payload, settlementInfo, req) => {
  try {
    const { validationService } = req;
    const { requestType } = settlementInfo;
    const settlementInfoRequestType = requestType.toLowerCase();
    const gcashOrderTitle = payload?.order?.orderTitle;

    const {
      PAYMENT_REQUEST_TYPES: {
        BUY_PROMO,
        BUY_LOAD,
        ECPAY,
        BBPREPAIDPROMO,
        BBPREPAIDREPAIR,
        CHANGE_SIM,
      },
      PAYMENT_TYPES: { GCASH },
      PAYMENT_ENTITY_TYPES: {
        ENTITY_ECPAY,
        ENTITY_GFPPROMO,
        ENTITY_GFPREPAIR,
        ENTITY_CHANGESIM,
      },
    } = constants;

    const applicableRequestTypes = [
      BUY_PROMO,
      BUY_LOAD,
      ECPAY,
      BBPREPAIDPROMO,
      BBPREPAIDREPAIR,
    ].map((t) => t.toLowerCase());

    if (
      !gcashOrderTitle &&
      applicableRequestTypes.includes(settlementInfoRequestType)
    ) {
      logger.error(
        'Missing required parameter ' + GCASH,
        settlementInfoRequestType
      );

      throw {
        type: 'InsufficientParameters',
      };
    }

    const validators = {
      [BUY_PROMO.toLowerCase()]: async () => {
        const validEntity =
          await validationService.validateAccountBrand(settlementInfo);
        validationUtil.validatePaymentRequestEntity(
          gcashOrderTitle,
          validEntity
        );
      },
      [BUY_LOAD.toLowerCase()]: () => {
        validationUtil.validateBuyLoadTransaction(
          settlementInfo,
          gcashOrderTitle
        );
      },
      [ECPAY.toLowerCase()]: () => {
        validationUtil.validatePaymentRequestEntity(
          gcashOrderTitle,
          ENTITY_ECPAY
        );
      },
      [BBPREPAIDPROMO.toLowerCase()]: () => {
        validationUtil.validatePaymentRequestEntity(
          gcashOrderTitle,
          ENTITY_GFPPROMO
        );
      },
      [BBPREPAIDREPAIR.toLowerCase()]: () => {
        validationUtil.validatePaymentRequestEntity(
          gcashOrderTitle,
          ENTITY_GFPREPAIR
        );
      },
      [CHANGE_SIM.toLowerCase()]: () => {
        validationUtil.validatePaymentRequestEntity(
          gcashOrderTitle,
          ENTITY_CHANGESIM
        );
      },
    };

    if (validators[settlementInfoRequestType]) {
      validators[settlementInfoRequestType]();
    }
  } catch (error) {
    logger.debug('validateGcashRequest failed', error);
    throw error;
  }
};

export { processGcashRequest, validateGcashRequest };
