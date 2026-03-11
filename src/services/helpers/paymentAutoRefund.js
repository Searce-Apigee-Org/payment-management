import { getError } from '@globetel/cxs-core/core/error/utils/index.js';
import { logger } from '@globetel/cxs-core/core/logger/index.js';
import moment from 'moment';
import { constants } from '../../util/index.js';

const getPaymentMethod = (paymentType, paymentInfo) => {
  const upperPaymentType = paymentType.toUpperCase();

  if (upperPaymentType === constants.PAYMENT_TYPES.GCASH) {
    return paymentType;
  }
  if (upperPaymentType === constants.PAYMENT_TYPES.XENDIT) {
    const upperPaymentInfoType = paymentInfo.type.toUpperCase();
    switch (upperPaymentInfoType) {
      case constants.XENDIT_PAYMENT_METHODS.TYPE_CC_DC:
        return 'Credit/Debit Card';
      case constants.XENDIT_PAYMENT_METHODS.TYPE_DIRECT_DEBIT:
        return `${paymentInfo.channelCode} Card`;
      case constants.XENDIT_PAYMENT_METHODS.TYPE_EWALLET:
        return paymentInfo.channelCode;
      default:
        return '';
    }
  }
  return '';
};

const xmlRequestFormatter = (
  payload,
  OrigPlatformID = 'CXS',
  OrigPlatformNode = 'CXS'
) => {
  let request = `<OrigPlatformID>${OrigPlatformID}</OrigPlatformID><OrigPlatformNode>${OrigPlatformNode}</OrigPlatformNode>`;
  request += '<notification>';
  request += `<userIdentity>${payload.userIdentity}</userIdentity><userIdentityType>1</userIdentityType><notifPatternId>${payload.notifPatternId}</notifPatternId>`;
  if (payload.notifParametersList && payload.notifParametersList.length > 0) {
    for (const param of payload.notifParametersList) {
      request += `<notifParam><name>${param.Name}</name><value>${param.Value}</value></notifParam>`;
    }
  }
  request += '</notification>';
  return request;
};

const emailNotif = async ({ paymentDetails, patternId, raven, soap }) => {
  try {
    const emailAddress = paymentDetails.settlementDetails[0].emailAddress;
    const paymentInfo = JSON.parse(paymentDetails.paymentInformation);
    const notifParams = {
      REFERENCE_NUMBER: paymentDetails.tokenPaymentId,
      DATE_TIME: moment
        .utc(new Date())
        .utcOffset('+08:00')
        .format('MMMM-DD-YYYY hh:mm:ss'),
      AMOUNT: paymentDetails.settlementDetails[0].amount,
      PAYMENT_METHOD: getPaymentMethod(paymentDetails.paymentType, paymentInfo),
    };

    const ravenReq = {
      userIdentity: emailAddress,
      notifPatternId: patternId,
      notifParametersList: mapToRavenNotifParameterList(notifParams),
    };

    const response =
      await raven.pushNotificationRepository.sendPushNotification(
        { soap },
        xmlRequestFormatter(ravenReq)
      );

    logger.info(`RAVEN_RESPONSE`, response);

    let result = { notificationStatus: constants.STATUS.SUCCESS };

    if (
      !response ||
      response.status !== '0' ||
      response.notification?.status !== '0'
    ) {
      result = {
        notificationStatus: constants.STATUS.FAILED,
        notificationError: response ? JSON.stringify(response) : '',
      };
    }
    return result;
  } catch (error) {
    logger.debug('EMAIL_NOTIF_OPERATION_FAILED', error);

    return {
      notificationStatus: constants.STATUS.FAILED,
      notificationError: 'Error',
    };
  }
};

const mapToRavenNotifParameterList = (notifParameter) => {
  const ravenNotifParameter = [];
  Object.entries(notifParameter).forEach(([key, value]) => {
    ravenNotifParameter.push({
      Name: `[${key}]`,
      Value: value,
    });
  });
  return ravenNotifParameter;
};

const callRequestRefundAPI = async ({
  tokenPaymentId,
  refundAmount,
  secretManager,
  secretManagerClient,
  http,
  cxs,
}) => {
  try {
    const authToken =
      await secretManager.paymentServiceRepository.getRefundAuthToken(
        secretManagerClient
      );

    const response = await cxs.paymentManagementRepository.executeRefund(
      { http, payload: { tokenPaymentId } },
      { refundAmount },
      authToken
    );

    if (response?.result?.statusCode === 202) {
      return { refundStatus: constants.PAYMENT_STATUS.SUCCESS };
    }

    return {
      refundStatus: constants.PAYMENT_STATUS.FAILED,
      refundError: JSON.stringify(response),
    };
  } catch (error) {
    logger.debug('CALL_REQUEST_REFUND_API_OPERATION_FAILED', error);

    return {
      refundStatus: constants.PAYMENT_STATUS.FAILED,
      refundError: JSON.stringify(getError(error.type, error)),
    };
  }
};

const updateRefundRequest = async (
  tokenPaymentId,
  paymentDetail,
  requestRefundStatus,
  mongo
) => {
  try {
    const amount = paymentDetail.settlementDetails[0].amount;
    const hasRefundObject = paymentDetail.settlementDetails.some(
      (detail) => detail.refund !== undefined
    );
    if (!hasRefundObject) {
      const status =
        requestRefundStatus.refundStatus === constants.PAYMENT_STATUS.SUCCESS
          ? constants.PAYMENT_STATUS.REFUND_REQUESTED
          : constants.PAYMENT_STATUS.REFUND_FAILED;
      const refundDetails = { amount, status };

      const updateDetails = {
        $set: {
          'settlementDetails.0.status': status,
          'settlementDetails.0.refund': refundDetails,
        },
      };

      await mongo.customerPaymentsRepository.update({
        filter: { tokenPaymentId },
        update: updateDetails,
      });
    }
  } catch (error) {
    logger.debug('UPDATE_REFUND_REQUEST_OPERATION_FAILED', error);

    throw error;
  }
};

export {
  callRequestRefundAPI,
  emailNotif,
  getPaymentMethod,
  updateRefundRequest,
  xmlRequestFormatter,
};
