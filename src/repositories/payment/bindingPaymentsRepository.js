import { config } from '../../../convict/config.js';

const safeGet = (path, fallback = null) => {
  try {
    return config.get(path);
  } catch {
    return fallback;
  }
};

const getBindingPaymentMethodsTableName = () =>
  safeGet('dynamo.tables.bindingPaymentMethods') ||
  process.env.CXS_DYNAMO_BINDING_PAYMENT_METHODS_TABLE_NAME ||
  null;

const getMigratedTables = () => safeGet('dynamo.migratedTables', []) ?? [];

const getIsMigrated = () => {
  const tableName = getBindingPaymentMethodsTableName();
  const migratedTables = getMigratedTables();

  if (!tableName) return false;

  return Array.isArray(migratedTables) && migratedTables.includes(tableName);
};
const findByBindAndUUID = async (bindingRequestId, uuid, req) => {
  const { mongo, dynamo } = req;
  const isMigrated = getIsMigrated();

  if (!isMigrated) {
    const dynamoDbClient =
      req.server?.plugins?.dynamoDbPlugin?.dynamoDbClient ?? null;
    if (!dynamoDbClient) {
      throw new Error('Missing dynamoDbClient (dynamoDbPlugin not registered)');
    }

    const result = await dynamo.bindingPaymentsRepository.findByBindAndUUID(
      bindingRequestId,
      uuid,
      dynamoDbClient
    );

    // Backward compatible handling:
    // - some implementations return `{ Item: ... }`
    // - current dynamo repository returns the record directly (or null)
    if (!result) return null;
    if (typeof result === 'object' && 'Item' in result) {
      return result.Item ?? null;
    }
    return result;
  }

  return await mongo.bindingPaymentsRepository.findByBindAndUUID(
    bindingRequestId,
    uuid
  );
};

export { findByBindAndUUID };
