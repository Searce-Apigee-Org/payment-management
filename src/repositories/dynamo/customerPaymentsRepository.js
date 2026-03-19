import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { removeBlankProperties } from '@globetel/cxs-core/core/utils/string/index.js';
import { config } from '../../../convict/config.js';

// Dynamo table: cxs-customer-payments-<env>
// Key schema: tokenPaymentId (String) only

const buildModel = (payload) => {
  const tableName = config.get('dynamo.tables.customerPayment');
  if (!tableName) {
    throw new Error(
      'Missing dynamo.tables.customerPayment (env: CXS_DYNAMO_CUSTOMER_PAYMENTS_TABLE_NAME)'
    );
  }

  return {
    TableName: tableName,
    ...payload,
  };
};

// Avoid leaking full credentials/ARNs in logs
const redact = (value, keepTail = 6) => {
  if (value === undefined || value === null) return null;
  const s = String(value);
  if (!s) return s;
  if (s.length <= keepTail) return s;
  return `***${s.slice(-keepTail)}`;
};

const buildAwsSdkErrorDetails = (err) => {
  // AWS SDK v3 errors often include `$metadata` and may include `name`.
  const metadata = err?.$metadata
    ? {
        httpStatusCode: err.$metadata.httpStatusCode,
        requestId: err.$metadata.requestId,
        extendedRequestId: err.$metadata.extendedRequestId,
        cfId: err.$metadata.cfId,
        attempts: err.$metadata.attempts,
        totalRetryDelay: err.$metadata.totalRetryDelay,
      }
    : null;

  return {
    name: err?.name ?? null,
    message: err?.message ?? null,
    code: err?.code ?? null,
    fault: err?.$fault ?? null,
    metadata,
  };
};

const put = async (paymentEntity, dynamoDbClient) => {
  try {
    logger.info('PUT_CUSTOMER_PAYMENT_DYNAMO', {
      tokenPaymentId: paymentEntity?.tokenPaymentId,
    });

    const command = new PutCommand(
      removeBlankProperties(
        buildModel({
          Item: { ...paymentEntity },
        })
      )
    );

    await dynamoDbClient.send(command);
    logger.info('PUT_CUSTOMER_PAYMENT_DYNAMO_SUCCESS');
    return true;
  } catch (err) {
    logger.error('PUT_CUSTOMER_PAYMENT_DYNAMO_ERROR', {
      tokenPaymentId: paymentEntity?.tokenPaymentId,
      tableName: config.get('dynamo.tables.customerPayment') ?? null,
      dynamoRegionEnv: process.env.DYNAMO_REGION ?? null,
      dynamoAudienceEnv: process.env.DYNAMO_AUDIENCE_VALUE ?? null,
      dynamoRoleArnEnv: redact(process.env.DYNAMO_ROLE_ARN_VALUE),
      error: buildAwsSdkErrorDetails(err),
    });
    throw err;
  }
};

const findOne = async (tokenPaymentId, dynamoDbClient) => {
  try {
    logger.info('FIND_CUSTOMER_PAYMENT_DYNAMO', { tokenPaymentId });

    const command = new GetCommand(
      removeBlankProperties(
        buildModel({
          Key: { tokenPaymentId },
        })
      )
    );

    const data = await dynamoDbClient.send(command);
    return data;
  } catch (err) {
    // NOTE: In staging/prod, debug logs might not be emitted. Log a
    // structured ERROR so we can see the actual Dynamo exception root cause
    // (wrong region/table, AccessDenied, throttling, etc.).
    logger.error('FIND_CUSTOMER_PAYMENT_DYNAMO_ERROR', {
      tokenPaymentId,
      tableName: config.get('dynamo.tables.customerPayment') ?? null,
      dynamoRegionEnv: process.env.DYNAMO_REGION ?? null,
      dynamoAudienceEnv: process.env.DYNAMO_AUDIENCE_VALUE ?? null,
      dynamoRoleArnEnv: redact(process.env.DYNAMO_ROLE_ARN_VALUE),
      error: buildAwsSdkErrorDetails(err),
    });
    throw err;
  }
};

const updateOne = async (paymentDetails, dynamoDbClient) => {
  try {
    logger.info('UPDATE_CUSTOMER_PAYMENT_DYNAMO', {
      tokenPaymentId: paymentDetails?.tokenPaymentId,
    });

    // Use PutCommand with the full object to mimic MongoDB's replaceOne behavior
    const command = new PutCommand(
      removeBlankProperties(
        buildModel({
          Item: { ...paymentDetails },
        })
      )
    );

    await dynamoDbClient.send(command);
    logger.info('UPDATE_CUSTOMER_PAYMENT_DYNAMO_SUCCESS');
    return true;
  } catch (err) {
    logger.error('UPDATE_CUSTOMER_PAYMENT_DYNAMO_ERROR', {
      tokenPaymentId: paymentDetails?.tokenPaymentId,
      tableName: config.get('dynamo.tables.customerPayment') ?? null,
      dynamoRegionEnv: process.env.DYNAMO_REGION ?? null,
      dynamoAudienceEnv: process.env.DYNAMO_AUDIENCE_VALUE ?? null,
      dynamoRoleArnEnv: redact(process.env.DYNAMO_ROLE_ARN_VALUE),
      error: buildAwsSdkErrorDetails(err),
    });
    throw err;
  }
};

const save = async (payment, dynamoDbClient) => {
  try {
    logger.info('SAVE_CUSTOMER_PAYMENT_DYNAMO', {
      tokenPaymentId: payment?.tokenPaymentId,
    });

    const command = new PutCommand(
      removeBlankProperties(
        buildModel({
          Item: { ...payment },
        })
      )
    );

    await dynamoDbClient.send(command);
    logger.info('SAVE_CUSTOMER_PAYMENT_DYNAMO_SUCCESS');
    return { success: true };
  } catch (err) {
    logger.error('SAVE_CUSTOMER_PAYMENT_DYNAMO_ERROR', {
      tokenPaymentId: payment?.tokenPaymentId,
      tableName: config.get('dynamo.tables.customerPayment') ?? null,
      dynamoRegionEnv: process.env.DYNAMO_REGION ?? null,
      dynamoAudienceEnv: process.env.DYNAMO_AUDIENCE_VALUE ?? null,
      dynamoRoleArnEnv: redact(process.env.DYNAMO_ROLE_ARN_VALUE),
      error: buildAwsSdkErrorDetails(err),
    });
    throw err;
  }
};

export { findOne, put, save, updateOne };
