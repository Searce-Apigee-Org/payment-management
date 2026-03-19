import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { removeBlankProperties } from '@globetel/cxs-core/core/utils/string/index.js';
import { config } from '../../../convict/config.js';

// Dynamo table: cxs-buyload-transactions-<env>
// Key schema: transactionId (String) - primary key
// GSI: mobileNumber-createdDate-index
//   - Partition key: mobileNumber
//   - Sort key: createdDate

const buildModel = (payload) => {
  const tableName = config.get('dynamo.tables.buyLoadTransactions');
  if (!tableName) {
    throw new Error(
      'Missing dynamo.tables.buyLoadTransactions (env: CXS_DYNAMO_BUY_LOAD_TRANSACTIONS_TABLE_NAME)'
    );
  }

  return {
    TableName: tableName,
    ...payload,
  };
};

// Accept Date, ISO string, moment-like objects (toDate), or legacy values.
// Returns a Date or null.
const coerceDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value) ? null : value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d) ? null : d;
  }
  if (typeof value?.toDate === 'function') {
    const d = value.toDate();
    return d instanceof Date && !isNaN(d) ? d : null;
  }
  return null;
};

const requireValidDate = (value, fieldName) => {
  const d = coerceDate(value);
  if (!d) {
    throw new Error(`Invalid ${fieldName} (expected Date/ISO string)`);
  }
  return d;
};

const save = async (entity, dynamoDbClient) => {
  try {
    logger.info('SAVE_BUY_LOAD_TRANSACTION_DYNAMO', {
      transactionId: entity?.transactionId,
    });

    const command = new PutCommand(
      removeBlankProperties(
        buildModel({
          Item: { ...entity },
        })
      )
    );

    await dynamoDbClient.send(command);
    logger.info('SAVE_BUY_LOAD_TRANSACTION_DYNAMO_SUCCESS');
    return { success: true };
  } catch (err) {
    logger.debug('SAVE_BUY_LOAD_TRANSACTION_DYNAMO_ERROR', err?.message);
    throw err;
  }
};

const findOne = async (transactionId, dynamoDbClient) => {
  try {
    logger.info('FIND_BUY_LOAD_TRANSACTION_DYNAMO', { transactionId });

    const command = new GetCommand(
      removeBlankProperties(
        buildModel({
          Key: { transactionId },
        })
      )
    );

    const data = await dynamoDbClient.send(command);
    return data;
  } catch (err) {
    logger.debug('FIND_BUY_LOAD_TRANSACTION_DYNAMO_ERROR', err?.message);
    throw err;
  }
};

const findByMobileDateChannel = async (params, dynamoDbClient) => {
  try {
    const {
      channelCode,
      mobileNumber,
      fromDate: fromDateParam,
      toDate: toDateParam,
      // Backward compat: some callers still send formattedDateFrom/To
      formattedDateFrom,
      formattedDateTo,
    } = params;

    const fromDate = requireValidDate(
      fromDateParam ?? formattedDateFrom,
      'fromDate'
    );
    const toDate = requireValidDate(toDateParam ?? formattedDateTo, 'toDate');

    logger.info('FIND_BUY_LOAD_TRANSACTION_BY_MOBILE_DATE_CHANNEL_DYNAMO', {
      mobileNumber,
      channelCode,
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
    });

    // Query using GSI: mobileNumber-createdDate-index
    const command = new QueryCommand(
      removeBlankProperties(
        buildModel({
          IndexName: 'mobileNumber-createdDate-index',
          KeyConditionExpression:
            'mobileNumber = :mobileNumber AND createdDate BETWEEN :fromDate AND :toDate',
          ExpressionAttributeValues: {
            ':mobileNumber': mobileNumber,
            ':fromDate': fromDate.toISOString(),
            ':toDate': toDate.toISOString(),
          },
          ScanIndexForward: true, // Sort ascending by createdDate
        })
      )
    );

    const result = await dynamoDbClient.send(command);
    let data = result.Items || [];

    data = data.filter((item) => item.channelCode === channelCode);

    logger.info(
      'FIND_BUY_LOAD_TRANSACTION_BY_MOBILE_DATE_CHANNEL_DYNAMO_SUCCESS',
      {
        mobileNumber,
        channelCode,
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        count: data.length,
      }
    );

    return data;
  } catch (err) {
    logger.debug(
      'FIND_BUY_LOAD_TRANSACTION_BY_MOBILE_DATE_CHANNEL_DYNAMO_ERROR',
      err?.message
    );
    throw err;
  }
};

const findByMobileDate = async (params, dynamoDbClient) => {
  try {
    const {
      mobileNumber,
      fromDate: fromDateParam,
      toDate: toDateParam,
      formattedDateFrom,
      formattedDateTo,
    } = params;

    const fromDate = requireValidDate(
      fromDateParam ?? formattedDateFrom,
      'fromDate'
    );
    const toDate = requireValidDate(toDateParam ?? formattedDateTo, 'toDate');

    logger.info('FIND_BUY_LOAD_TRANSACTION_BY_MOBILE_DATE_DYNAMO', {
      mobileNumber,
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
    });

    // Query using GSI: mobileNumber-createdDate-index
    const command = new QueryCommand(
      removeBlankProperties(
        buildModel({
          IndexName: 'mobileNumber-createdDate-index',
          KeyConditionExpression:
            'mobileNumber = :mobileNumber AND createdDate BETWEEN :fromDate AND :toDate',
          ExpressionAttributeValues: {
            ':mobileNumber': mobileNumber,
            ':fromDate': fromDate.toISOString(),
            ':toDate': toDate.toISOString(),
          },
          ScanIndexForward: true, // Sort ascending by createdDate
        })
      )
    );

    const result = await dynamoDbClient.send(command);
    const data = result.Items || [];

    logger.info('FIND_BUY_LOAD_TRANSACTION_BY_MOBILE_DATE_DYNAMO_SUCCESS', {
      mobileNumber,
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      count: data.length,
    });

    return data;
  } catch (err) {
    logger.debug(
      'FIND_BUY_LOAD_TRANSACTION_BY_MOBILE_DATE_DYNAMO_ERROR',
      err?.message
    );
    throw err;
  }
};

export { findByMobileDate, findByMobileDateChannel, findOne, save };
