import { config } from '../../../convict/config.js';

const getIsMigrated = () => {
  const tableName = config.get('dynamo.tables.buyLoadChannelConfig');
  const migratedTables = config.get('dynamo.migratedTables');

  if (!tableName) return false;
  return Array.isArray(migratedTables) && migratedTables.includes(tableName);
};

// Facade repository that routes to Mongo or Dynamo based on migratedTables.
// Consumers should call these with `req` so we can access the injected repos/clients.

const findOneById = async (entity, req) => {
  const isMigrated = getIsMigrated();

  if (!isMigrated) {
    const dynamoDbClient =
      req.server?.plugins?.dynamoDbPlugin?.dynamoDbClient ?? null;
    if (!dynamoDbClient) {
      throw new Error('Missing dynamoDbClient (dynamoDbPlugin not registered)');
    }

    await req.dynamo.buyLoadChannelConfigRepository.findOneById(
      entity,
      dynamoDbClient
    );
    return entity;
  }

  return await req.mongo.channelConfigRepository.findOneById(entity);
};

export { findOneById };
