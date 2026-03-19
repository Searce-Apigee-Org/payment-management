import { config } from '../../../convict/config.js';

const getIsMigrated = () => {
  const tableName = config.get('dynamo.tables.customerPaymentECPay');
  const migratedTables = config.get('dynamo.migratedTables');

  if (!tableName) return false;
  return Array.isArray(migratedTables) && migratedTables.includes(tableName);
};

// Facade repository that routes to Mongo or Dynamo based on migratedTables.
// Consumers should call these with `req` so we can access the injected repos/clients.

const create = async (entity, userUuid, req) => {
  const isMigrated = getIsMigrated();

  if (!isMigrated) {
    const dynamoDbClient =
      req.server?.plugins?.dynamoDbPlugin?.dynamoDbClient ?? null;
    if (!dynamoDbClient) {
      throw new Error('Missing dynamoDbClient (dynamoDbPlugin not registered)');
    }

    await req.dynamo.ecpayTransactionsRepository.create(entity, dynamoDbClient);
    return entity;
  }

  return await req.mongo.ecpayTransactionRepository.create(entity);
};

const findByPartnerRef = async (entity, req) => {
  const isMigrated = getIsMigrated();

  if (!isMigrated) {
    const dynamoDbClient =
      req.server?.plugins?.dynamoDbPlugin?.dynamoDbClient ?? null;
    if (!dynamoDbClient) {
      throw new Error('Missing dynamoDbClient (dynamoDbPlugin not registered)');
    }

    // Dynamo repository returns the matching record (snake_case fields)
    // which is required by validationService.validateECPayTableRequest.
    // Previous behavior mistakenly returned the input `entity` (the partnerRef)
    // causing downstream validation to compare against undefined fields.
    return await req.dynamo.ecpayTransactionsRepository.findByPartnerRef(
      entity,
      dynamoDbClient
    );
  }

  return await req.mongo.ecpayTransactionRepository.findByPartnerRef(entity);
};

export { create, findByPartnerRef };
