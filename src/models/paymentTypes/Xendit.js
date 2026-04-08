import logger from '@globetel/cxs-core/core/logger/logger.js';
import Joi from 'joi';
import { constants, paymentsUtil, validationUtil } from '../../util/index.js';

const XenditRequestSchema = Joi.object({
  type: Joi.string().required(),

  channelCode: Joi.string(),

  productName: Joi.string(),

  paymentMethodId: Joi.string(),

  eWallet: Joi.object({
    cancelUrl: Joi.string(),
    failureUrl: Joi.string(),
    successUrl: Joi.string().required(),
  }).unknown(false),

  directDebit: Joi.object({
    failureUrl: Joi.string().required(),
    successUrl: Joi.string().required(),
  }).unknown(false),

  reusability: Joi.string().required(),

  budgetProtect: Joi.boolean(),
})
  .required()
  .unknown(false);

const validateXenditRequest = (payload) => {
  try {
    const { error, value } = XenditRequestSchema.validate(payload);

    if (error) {
      logger.debug('XenditRequestValidationFailed', error);
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
  } catch (error) {
    logger.debug('validateXenditRequest failed', error);
    throw error;
  }
};

const processXenditRequest = async (payload, settlementInfo, req) => {
  try {
    const { validationService } = req;
    const { requestType } = settlementInfo;
    const settlementInfoRequestType = requestType.toLowerCase();
    const xenditProductName = payload.productName;

    const {
      PAYMENT_REQUEST_TYPES: { BUY_PROMO, BUY_LOAD, CHANGE_SIM },
      PAYMENT_TYPES: { XENDIT },
      PAYMENT_ENTITY_TYPES: { ENTITY_CHANGESIM },
    } = constants;

    const applicableRequestTypes = [BUY_PROMO, BUY_LOAD, CHANGE_SIM].map((t) =>
      t.toLowerCase()
    );

    if (
      !xenditProductName &&
      applicableRequestTypes.includes(settlementInfoRequestType)
    ) {
      logger.error(
        'Missing required parameter ' + XENDIT,
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
        if (xenditProductName.toLowerCase() !== validEntity.toLowerCase()) {
          logger.error('InvalidRequestValidateException', xenditProductName);
          throw {
            type: 'InvalidOutboundRequest',
          };
        }
      },
      [BUY_LOAD.toLowerCase()]: () => {
        validationUtil.validateBuyLoadTransaction(
          settlementInfo,
          xenditProductName
        );
      },
      [CHANGE_SIM.toLowerCase()]: () => {
        if (
          xenditProductName.toLowerCase() !== ENTITY_CHANGESIM.toLowerCase()
        ) {
          logger.error('InvalidRequestValidateException', xenditProductName);
          throw {
            type: 'InvalidOutboundRequest',
          };
        }
      },
    };

    if (validators[settlementInfoRequestType]) {
      if (settlementInfoRequestType === BUY_PROMO.toLowerCase()) {
        await validators[settlementInfoRequestType]();
        return;
      }
      validators[settlementInfoRequestType]();
    }
  } catch (error) {
    logger.debug('validateXenditRequest failed', error);
    throw error;
  }
};

const processXenditRequestForOtherChannels = async (
  payload,
  settlementInfo,
  channel
) => {
  const { requestType } = settlementInfo;
  const settlementInfoRequestType = requestType.toLowerCase();
  const xenditProductName = payload.productName;

  const {
    PAYMENT_REQUEST_TYPES: { BUY_LOAD },
    PAYMENT_TYPES: { XENDIT },
  } = constants;

  if (settlementInfoRequestType === BUY_LOAD.toLowerCase()) {
    if (paymentsUtil.checkValidChannel(channel, XENDIT, 'SAME_AS_GO')) {
      if (!xenditProductName) {
        throw {
          type: 'InsufficientParameters',
        };
      }

      validationUtil.validateBuyLoadTransaction(
        settlementInfo,
        xenditProductName
      );
    }
  }
};

export {
  processXenditRequest,
  processXenditRequestForOtherChannels,
  validateXenditRequest,
};
