import { dataDictionary } from '@globetel/cxs-core/core/index.js';
import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { msisdnFormatter } from '@globetel/cxs-core/core/utils/string/index.js';
import lodash from 'lodash';
import moment from 'moment';
import { config } from '../../../convict/config.js';
import { constants } from '../../util/index.js';

const createEsimPaymentSession = async (req) => {
  try {
    const {
      headers,
      payload,
      pre: { reqClientId, user },
      payment,
      http,
      mongo,
      esimFetchAuthorizationToken,
      secretManager,
      secretManagerClient,
    } = req;

    const { paymentInformation, settlementInformation } = payload;
    let toInsert = {};
    let amountValue = null;
    let requestBody = {};

    dataDictionary.setDataDictionary(req, {
      episode: constants.EPISODES.PAY,
      msisdn: msisdnFormatter(settlementInformation[0].mobileNumber),
      event_detail: {
        request_authorization: {},
        request_parameters: { ...payload },
        response_parameter: {},
      },
    });

    if (headers.deviceid) {
      dataDictionary.setDataDictionary(req, {
        event_detail: { request_authorization: { deviceId: headers.deviceid } },
      });
      toInsert.deviceId = headers.deviceid;
    }

    if (paymentInformation.productValidity) {
      toInsert.productValidity = paymentInformation.productValidity;
      delete paymentInformation.productValidity;
    }

    const paymentType = lodash.get(
      payload,
      'paymentType',
      constants.PAYMENT_TYPES.XENDIT
    );
    const requestType = lodash.get(
      payload,
      'settlementInformation[0].requestType',
      constants.PAYMENT_REQUEST_TYPES.BUYESIM
    );
    const type = lodash.get(
      paymentInformation,
      'type',
      constants.PAYMENT_MODES.CC_DC
    );

    const settlementInfos = settlementInformation.map((data) => {
      amountValue = data.amount;

      delete data.amount;
      delete data.requestType;

      return {
        ...data,
        amountValue,
        transactionType: constants.ESIM_CONSTANTS.TRANSACTION_TYPE,
      };
    });

    let productExtras = {};
    let productName;
    if (
      [
        constants.PAYMENT_REQUEST_TYPES.BUYESIMLOCAL,
        constants.PAYMENT_REQUEST_TYPES.PTOESIM,
        constants.PAYMENT_REQUEST_TYPES.BUYESIM,
      ].includes(requestType)
    ) {
      const productNameData = JSON.parse(
        config.get('serviceConfig.productNameEsim')
      );
      productName = productNameData[reqClientId][requestType];
    }

    if (
      [
        constants.PAYMENT_REQUEST_TYPES.BUYESIMLOCAL,
        constants.PAYMENT_REQUEST_TYPES.PTOESIM,
      ].includes(requestType)
    ) {
      productExtras =
        paymentType === constants.PAYMENT_TYPES.GCASH
          ? { order: { orderTitle: productName } }
          : { productName };
    } else if (requestType === constants.PAYMENT_REQUEST_TYPES.BUYESIM) {
      paymentInformation.productName = productName;
    }

    if (paymentType === constants.PAYMENT_TYPES.GCASH) {
      // GCASH payload
      requestBody = {
        command: {
          name: constants.ESIM_CONSTANTS.GENERIC_COMMAND_NAME,
          payload: {
            gatewayProcessor: constants.ESIM_CONSTANTS.GCASH_GATEWAY_PROCESSOR,
            gcashPaymentInfo: { ...paymentInformation, ...productExtras },
            settlementInfos,
          },
        },
      };
    } else {
      // XENDIT payload
      paymentInformation.type = type;

      if (
        type === constants.PAYMENT_MODES.CC_DC &&
        !paymentInformation.merchantId
      ) {
        const merchantIdData = JSON.parse(
          config.get('serviceConfig.esimMerchantId')
        );
        paymentInformation.merchantId = merchantIdData[reqClientId];
      }

      if (type === constants.PAYMENT_MODES.DIRECT_DEBIT) {
        paymentInformation.customerUuid = user.uuid.replaceAll('-', '');
      }

      Object.assign(paymentInformation, productExtras);

      if (paymentInformation.productId) delete paymentInformation.productId;
      if (
        type === constants.PAYMENT_MODES.CC_DC &&
        paymentInformation.merchantId
      ) {
        paymentInformation.midLabel = paymentInformation.merchantId;
        delete paymentInformation.merchantId;
      }

      requestBody = {
        command: {
          name: constants.ESIM_CONSTANTS.XENDIT_COMMAND_NAME,
          payload: {
            gatewayProcessor: constants.ESIM_CONSTANTS.GATEWAY_PROCESSOR,
            paymentInfo: {
              paymentMethod: paymentType.toLowerCase(),
              ...paymentInformation,
            },
            settlementInfos,
          },
        },
      };
    }

    const authorizationToken =
      await esimFetchAuthorizationToken.getAuthorizationToken(req);

    const header = { Authorization: `Bearer ${authorizationToken}` };

    const validAmounts =
      await secretManager.denominationRepository.getESIMAmountValue(
        secretManagerClient,
        constants.SECRET_ENTITY.ESIM,
        constants.SECRET_ENTITY.PAYMENT_REQUEST_TYPES
      );

    const isAmountValid = validAmounts.some(
      (e) =>
        e.type.toUpperCase() === requestType.toUpperCase() &&
        e.amountValue.toFixed(2) === amountValue.toFixed(2)
    );
    if (!isAmountValid)
      throw {
        type: 'CustomBadRequestError',
        details: 'Unable to invoke request',
      };

    const paymentSessionResponse =
      await payment.paymentRepository.esimPaymentSession(
        http,
        requestBody,
        header
      );
    if (paymentSessionResponse?.status !== 200)
      throw { type: 'OperationFailed' };

    const result = { tokenPaymentId: paymentSessionResponse.data.paymentId };

    const settlementDetails = settlementInformation.map((data) => ({
      ...data,
      amount: amountValue,
      status: constants.ESIM_CONSTANTS.STATUS,
      requestType,
      transactionType: constants.ESIM_CONSTANTS.TRANSACTION_TYPE,
    }));

    const record = {
      ...toInsert,
      tokenPaymentId: result.tokenPaymentId,
      checkoutUrl: ' ',
      createdDate: moment
        .utc(new Date())
        .utcOffset('+08:00')
        .format(constants.ESIM_CONSTANTS.DATE_FORMAT),
      paymentSession: ' ',
      paymentType: paymentType.toUpperCase(),
      paymentInformation: JSON.stringify(paymentInformation),
      settlementDetails,
      ...(headers['user-token'] && { userToken: headers['user-token'] }),
    };

    await mongo.customerPaymentsRepository.put(record);

    dataDictionary.setDataDictionary(req, {
      event_detail: { response_parameters: { result } },
      transaction_status: constants.TRANSACTION_STATUS.SUCCESS,
    });

    return { statusCode: 201, result };
  } catch (err) {
    logger.debug('CREATE_ESIM_PAYMENT_SESSION_OPEARION_FAILED', err);
    throw err;
  }
};

export { createEsimPaymentSession };
