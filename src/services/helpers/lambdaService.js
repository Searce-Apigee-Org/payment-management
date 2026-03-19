import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { config } from '../../../convict/config.js';
import { constants } from '../../util/index.js';

const {
  region,
  buyLoad: { resource: buyLoadResource, arn: buyLoadArn },
  paymentStatusCallback: { arn: paymentStatusCallbackArn },
  prepaidFiberServiceOrders: {
    arn: prepaidFiberServiceOrdersArn,
    path: prepaidFiberServiceOrdersPath,
  },
  prepaidFiberRepairOrders: {
    arn: prepaidFiberRepairOrdersArn,
    path: prepaidFiberRepairOrdersPath,
  },
  purchasePromo: { arn: purchasePromoArn, path: purchasePromoPath },
  createPromoVouchers: { arn: createPromoVouchersArn },
  ecPayProcessTransaction: { arn: ecPayProcessTransactionArn },
  paymentSendEmail: { arn: paymentSendEmailArn },
  processCSPayment: { arn: processCSPaymentArn },
  addAccountQuest: { arn: addAccountQuestArn },
  createPolicy: { arn: createPolicyArn },
  loyaltyPointsSimulator: { arn: loyaltyPointsSimulatorArn },
} = config.get('lambda');

const buyLoadLambda = async ({ invokeLambda, payload }) => {
  const { mobileNumber, keyword, amount, tokenPaymentId } = payload;

  logger.debug('ABOUT TO INVOKE LAMBDA');
  logger.info('ABOUT TO INVOKE LAMBDA');

  const buyLoadPayload = {
    httpMethod: constants.HTTP_METHOD.POST,
    resource: buyLoadResource,
    pathParameters: {
      customerId: mobileNumber,
    },
    body: JSON.stringify(payload),
  };

  // Temporary debug log to verify the exact payload sent to the AWS buyLoad Lambda
  logger.debug('AWS_BUY_LOAD_INVOKE_PAYLOAD', buyLoadPayload);
  logger.info('AWS_BUY_LOAD_INVOKE_PAYLOAD', buyLoadPayload);

  await invokeLambda(
    buyLoadArn,
    constants.INVOCATION_TYPE.EVENT,
    buyLoadPayload,
    region,
    false
  );

  logger.info('SUCCESS INVOKE');
  logger.debug('SUCCESS INVOKE');
};

const paymentStatusCallbackLambda = async ({ invokeLambda, payload }) => {
  const paymentStatusCallbackPayload = {
    httpMethod: constants.HTTP_METHOD.POST,
    body: JSON.stringify(payload),
  };

  await invokeLambda(
    paymentStatusCallbackArn,
    constants.INVOCATION_TYPE.EVENT,
    paymentStatusCallbackPayload,
    region,
    false
  );
};

const prepaidFiberServiceOrdersLambda = async ({ invokeLambda, payload }) => {
  const prepaidFiberServiceOrdersPayload = {
    httpMethod: constants.HTTP_METHOD.POST,
    path: prepaidFiberServiceOrdersPath,
    body: JSON.stringify(payload),
  };

  await invokeLambda(
    prepaidFiberServiceOrdersArn,
    constants.INVOCATION_TYPE.EVENT,
    prepaidFiberServiceOrdersPayload,
    region,
    false
  );
};

const prepaidFiberRepairOrdersLambda = async ({ invokeLambda, payload }) => {
  const prepaidFiberRepairOrdersPayload = {
    httpMethod: constants.HTTP_METHOD.POST,
    path: prepaidFiberRepairOrdersPath,
    body: JSON.stringify(payload),
  };

  await invokeLambda(
    prepaidFiberRepairOrdersArn,
    constants.INVOCATION_TYPE.EVENT,
    prepaidFiberRepairOrdersPayload,
    region,
    false
  );
};

const purchasePromoLambda = async ({ invokeLambda, payload }) => {
  const purchasePromoPayload = {
    httpMethod: constants.HTTP_METHOD.POST,
    path: purchasePromoPath,
    body: JSON.stringify(payload),
  };

  await invokeLambda(
    purchasePromoArn,
    constants.INVOCATION_TYPE.EVENT,
    purchasePromoPayload,
    region,
    false
  );
};

const createPromoVouchersLambda = async ({ invokeLambda, payload }) => {
  const createPromoVouchersPayload = {
    httpMethod: constants.HTTP_METHOD.POST,
    body: JSON.stringify(payload),
  };

  await invokeLambda(
    createPromoVouchersArn,
    constants.INVOCATION_TYPE.EVENT,
    createPromoVouchersPayload,
    region,
    false
  );
};

const ecPayProcessTransactionLambda = async ({ invokeLambda, payload }) => {
  const ecPayProcessTransactionPayload = {
    httpMethod: constants.HTTP_METHOD.POST,
    body: JSON.stringify(payload),
  };

  await invokeLambda(
    ecPayProcessTransactionArn,
    constants.INVOCATION_TYPE.EVENT,
    ecPayProcessTransactionPayload,
    region,
    false
  );
};

const paymentSendEmailLambda = async ({ invokeLambda, payload }) => {
  const paymentSendEmailPayload = {
    httpMethod: constants.HTTP_METHOD.POST,
    body: JSON.stringify({
      tokenPaymentId: payload.tokenPaymentId,
      ipAddress: payload.ipAddress,
    }),
  };

  await invokeLambda(
    paymentSendEmailArn,
    constants.INVOCATION_TYPE.EVENT,
    paymentSendEmailPayload,
    region,
    false
  );
};

const processCSPaymentLambda = async ({ invokeLambda, payload }) => {
  const processCSPaymentPayload = {
    httpMethod: constants.HTTP_METHOD.POST,
    body: JSON.stringify(payload),
  };

  await invokeLambda(
    processCSPaymentArn,
    constants.INVOCATION_TYPE.EVENT,
    processCSPaymentPayload,
    region,
    false
  );
};

const createPolicyLambda = async ({ invokeLambda, payload }) => {
  const createPolicyPayload = {
    httpMethod: constants.HTTP_METHOD.POST,
    body: JSON.stringify(payload),
  };

  await invokeLambda(
    createPolicyArn,
    constants.INVOCATION_TYPE.EVENT,
    createPolicyPayload,
    region,
    false
  );
};

const addAccountQuestLambda = async ({ invokeLambda, payload }) => {
  await invokeLambda(
    addAccountQuestArn,
    constants.INVOCATION_TYPE.REQUEST_RESPONSE,
    payload,
    region,
    false
  );
};

const loyaltyPointsSimulatorLambda = async ({ invokeLambda, payload }) => {
  // Align with our other lambda invokers: send a wrapper object with a JSON
  // string body. Many legacy lambdas expect `event.body` to be a string.
  const loyaltyPayload = {
    body: JSON.stringify(payload),
  };

  // IMPORTANT: return the invoke result so callers can inspect FunctionError
  // and parse the response payload.
  return await invokeLambda(
    loyaltyPointsSimulatorArn,
    constants.INVOCATION_TYPE.REQUEST_RESPONSE,
    loyaltyPayload,
    region,
    false
  );
};

export {
  addAccountQuestLambda,
  buyLoadLambda,
  createPolicyLambda,
  createPromoVouchersLambda,
  ecPayProcessTransactionLambda,
  loyaltyPointsSimulatorLambda,
  paymentSendEmailLambda,
  paymentStatusCallbackLambda,
  prepaidFiberRepairOrdersLambda,
  prepaidFiberServiceOrdersLambda,
  processCSPaymentLambda,
  purchasePromoLambda,
};
