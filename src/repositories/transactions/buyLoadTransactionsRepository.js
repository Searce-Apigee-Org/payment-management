import { config } from '../../../convict/config.js';

const getIsMigrated = () => {
  const tableName = config.get('dynamo.tables.buyLoadTransactions');
  const migratedTables = config.get('dynamo.migratedTables');

  if (!tableName) return false;
  return Array.isArray(migratedTables) && migratedTables.includes(tableName);
};

// Facade repository that routes to Mongo or Dynamo based on migratedTables.
// Consumers should call these with `req` so we can access the injected repos/clients.

const save = async (entity, userUuid, req) => {
  const isMigrated = getIsMigrated();

  if (!isMigrated) {
    const dynamoDbClient =
      req.server?.plugins?.dynamoDbPlugin?.dynamoDbClient ?? null;
    if (!dynamoDbClient) {
      throw new Error('Missing dynamoDbClient (dynamoDbPlugin not registered)');
    }

    await req.dynamo.buyLoadTransactionsRepository.save(
      entity,
      userUuid,
      dynamoDbClient
    );
    return entity;
  }

  return await req.mongo.buyLoadTransactionsRepository.save(entity, userUuid);
};

const findOne = async (entity, req) => {
  const isMigrated = getIsMigrated();

  if (!isMigrated) {
    const dynamoDbClient =
      req.server?.plugins?.dynamoDbPlugin?.dynamoDbClient ?? null;
    if (!dynamoDbClient) {
      throw new Error('Missing dynamoDbClient (dynamoDbPlugin not registered)');
    }

    await req.dynamo.buyLoadTransactionsRepository.findOne(
      entity,
      dynamoDbClient
    );
    return entity;
  }

  return await req.mongo.buyLoadTransactionsRepository.findByTransactionId(
    entity
  );
};

const findByMobileDateChannel = async (entity, req) => {
  const isMigrated = getIsMigrated();

  if (!isMigrated) {
    const dynamoDbClient =
      req.server?.plugins?.dynamoDbPlugin?.dynamoDbClient ?? null;
    if (!dynamoDbClient) {
      throw new Error('Missing dynamoDbClient (dynamoDbPlugin not registered)');
    }

    return await req.dynamo.buyLoadTransactionsRepository.findByMobileDateChannel(
      entity,
      dynamoDbClient
    );
  }

  return await req.mongo.buyLoadTransactionsRepository.findByMobileDateChannel(
    entity
  );
};

const findByMobileDate = async (entity, req) => {
  const isMigrated = getIsMigrated();

  if (!isMigrated) {
    const dynamoDbClient =
      req.server?.plugins?.dynamoDbPlugin?.dynamoDbClient ?? null;
    if (!dynamoDbClient) {
      throw new Error('Missing dynamoDbClient (dynamoDbPlugin not registered)');
    }

    return await req.dynamo.buyLoadTransactionsRepository.findByMobileDate(
      entity,
      dynamoDbClient
    );
  }

  return await req.mongo.buyLoadTransactionsRepository.findByMobileDate(entity);
};

export { findByMobileDate, findByMobileDateChannel, findOne, save };
