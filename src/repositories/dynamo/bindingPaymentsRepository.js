import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { removeBlankProperties } from '@globetel/cxs-core/core/utils/string/index.js';
import { config } from '../../../convict/config.js';

// Dynamo table: cxs-binding-payment-methods-<env>
// Key schema:
//   - Partition key: bindingRequestId
//   - Sort key: statusDateTime
// Attributes: bindingRequestId, statusDateTime, creationDate, paymentMethod,
//             phoneNumber, status, uuid, validity

const buildModel = (payload) => {
  // IMPORTANT: use env fallback ONLY when the config path itself is missing
  // (convict throws). If config exists but value is null/empty, treat as
  // misconfiguration and error.
  let tableName;
  try {
    tableName = config.get('dynamo.tables.bindingPaymentMethods');
  } catch {
    tableName = process.env.CXS_DYNAMO_BINDING_PAYMENT_METHODS_TABLE_NAME;
  }
  if (!tableName) {
    throw new Error(
      'Missing dynamo.tables.bindingPaymentMethods (env: CXS_DYNAMO_BINDING_PAYMENT_METHODS_TABLE_NAME)'
    );
  }

  return {
    TableName: tableName,
    ...payload,
  };
};

const findByBindAndUUID = async (bindingRequestId, uuid, dynamoDbClient) => {
  try {
    logger.info('BINDING_PAYMENT_DYNAMO_FIND_BY_BIND_AND_UUID', {
      bindingRequestId,
      uuid,
    });

    // Query by partition key and filter by uuid
    const command = new QueryCommand(
      removeBlankProperties(
        buildModel({
          KeyConditionExpression: 'bindingRequestId = :bindingRequestId',
          FilterExpression: '#uuid = :uuid',
          ExpressionAttributeNames: {
            '#uuid': 'uuid',
          },
          ExpressionAttributeValues: {
            ':bindingRequestId': bindingRequestId,
            ':uuid': uuid,
          },
        })
      )
    );

    const result = await dynamoDbClient.send(command);
    const record =
      result.Items && result.Items.length > 0 ? result.Items[0] : null;

    logger.info('BINDING_PAYMENT_DYNAMO_FIND_BY_BIND_AND_UUID_SUCCESS', record);

    return record;
  } catch (err) {
    logger.error('BINDING_PAYMENT_DYNAMO_FIND_BY_BIND_AND_UUID_FAILED', err);
    throw {
      type: 'InternalOperationFailed',
      details: err.message,
    };
  }
};

export { findByBindAndUUID };
