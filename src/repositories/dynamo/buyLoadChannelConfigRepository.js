import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { removeBlankProperties } from '@globetel/cxs-core/core/utils/string/index.js';
import { config } from '../../../convict/config.js';

// Dynamo table: cxs-buyload-channel-config-<env>
// Key schema: clientId (String) only

const buildModel = (payload) => {
  const tableName = config.get('dynamo.tables.buyLoadChannelConfig');
  if (!tableName) {
    throw new Error(
      'Missing dynamo.tables.buyLoadChannelConfig (env: CXS_DYNAMO_BUYLOAD_CHANNEL_CONFIG_TABLE_NAME)'
    );
  }

  return {
    TableName: tableName,
    ...payload,
  };
};

const findOneById = async (clientId, dynamoDbClient) => {
  try {
    logger.info('FIND_BUYLOAD_CHANNEL_CONFIG_DYNAMO', { clientId });

    const command = new GetCommand(
      removeBlankProperties(
        buildModel({
          Key: { clientId },
        })
      )
    );

    const data = await dynamoDbClient.send(command);
    return data;
  } catch (err) {
    logger.debug('FIND_BUYLOAD_CHANNEL_CONFIG_DYNAMO_ERROR', err?.message);
    throw err;
  }
};

export { findOneById };
