import { config } from '../../../convict/config.js';

const getIsMigrated = () => {
  const tableName = config.get('dynamo.tables.customerPayment');
  const migratedTables = config.get('dynamo.migratedTables');

  if (!tableName) return false;

  return Array.isArray(migratedTables) && migratedTables.includes(tableName);
};

const create = async (paymentEntity, req) => {
  const isMigrated = getIsMigrated();

  if (!isMigrated) {
    const dynamoDbClient =
      req.server?.plugins?.dynamoDbPlugin?.dynamoDbClient ?? null;
    if (!dynamoDbClient) {
      throw new Error('Missing dynamoDbClient (dynamoDbPlugin not registered)');
    }

    await req.dynamo.customerPaymentsRepository.put(
      paymentEntity,
      dynamoDbClient
    );
    return paymentEntity;
  }

  return await req.mongo.customerPaymentsRepository.create(paymentEntity);
};

const findOne = async (tokenPaymentId, req) => {
  const { mongo, dynamo } = req;
  const isMigrated = getIsMigrated();

  if (!isMigrated) {
    const dynamoDbClient =
      req.server?.plugins?.dynamoDbPlugin?.dynamoDbClient ?? null;
    if (!dynamoDbClient) {
      throw new Error('Missing dynamoDbClient (dynamoDbPlugin not registered)');
    }

    // Defensive: AWS SDK `GetCommand` returns an object like `{ Item, $metadata }`,
    // but some wrappers/mocks can return `null` on not-found. Avoid destructuring
    // from a null value (TypeError).
    const result = await dynamo.customerPaymentsRepository.findOne(
      tokenPaymentId,
      dynamoDbClient
    );
    return result?.Item ?? null;
  }

  return await mongo.customerPaymentsRepository.findOne(tokenPaymentId);
};

const updateOne = async (paymentDetails, req) => {
  const { mongo, dynamo } = req;
  const isMigrated = getIsMigrated();

  if (!isMigrated) {
    const dynamoDbClient =
      req.server?.plugins?.dynamoDbPlugin?.dynamoDbClient ?? null;
    if (!dynamoDbClient) {
      throw new Error('Missing dynamoDbClient (dynamoDbPlugin not registered)');
    }

    await dynamo.customerPaymentsRepository.updateOne(
      paymentDetails,
      dynamoDbClient
    );
    return;
  }

  // For Mongo, convert the full object to MongoDB update format
  const keys = {
    filter: { tokenPaymentId: paymentDetails.tokenPaymentId },
    update: {
      $set: paymentDetails,
    },
  };

  return await mongo.customerPaymentsRepository.update(keys);
};

const save = async (paymentDetails, req) => {
  const { mongo, dynamo } = req;
  const isMigrated = getIsMigrated();

  if (!isMigrated) {
    const dynamoDbClient =
      req.server?.plugins?.dynamoDbPlugin?.dynamoDbClient ?? null;
    if (!dynamoDbClient) {
      throw new Error('Missing dynamoDbClient (dynamoDbPlugin not registered)');
    }

    await dynamo.customerPaymentsRepository.save(
      paymentDetails,
      dynamoDbClient
    );
    return;
  }

  return await mongo.customerPaymentsRepository.save(paymentDetails);
};

const put = async (paymentEntity, req) => {
  const { mongo, dynamo } = req;
  const isMigrated = getIsMigrated();

  if (isMigrated) {
    const dynamoDbClient =
      req.server?.plugins?.dynamoDbPlugin?.dynamoDbClient ?? null;
    if (!dynamoDbClient) {
      throw new Error('Missing dynamoDbClient (dynamoDbPlugin not registered)');
    }

    await dynamo.customerPaymentsRepository.put(paymentEntity, dynamoDbClient);
    return;
  }

  return await mongo.customerPaymentsRepository.put(paymentEntity);
};

export { create, findOne, put, save, updateOne };
