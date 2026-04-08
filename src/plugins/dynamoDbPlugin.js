const dynamoDbPlugin = {
  name: 'dynamoDbPlugin',
  version: '1.0.0',
  register: async function (server, options) {
    const { dynamoDb } = options;
    const dynamoDbClient = await dynamoDb.getDynamoClient();

    if (!dynamoDbClient) {
      throw new Error('DynamoDb client is not provided');
    }

    server.expose('dynamoDbClient', dynamoDbClient);
  },
};

export { dynamoDbPlugin };
