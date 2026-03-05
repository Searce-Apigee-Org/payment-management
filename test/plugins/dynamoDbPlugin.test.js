import { expect } from '@hapi/code';
import Hapi from '@hapi/hapi';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { dynamoDbPlugin } from '../../src/plugins/dynamoDbPlugin.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Plugin :: DynamoDBPlugin', () => {
  let server, mockDynamoDb, getDynamoClientStub;

  beforeEach(async () => {
    server = Hapi.server();

    getDynamoClientStub = Sinon.stub();

    mockDynamoDb = {
      getDynamoClient: getDynamoClientStub,
    };
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should throw an error when dynamoDB client is not provided', async () => {
    try {
      await server.register({
        plugin: dynamoDbPlugin,
        options: {},
      });
    } catch (error) {
      expect(error.message).to.equal(
        "Cannot read properties of undefined (reading 'getDynamoClient')"
      );
    }
  });

  it('should throw an error if getDynamoClient returns undefined', async () => {
    getDynamoClientStub.returns(undefined);

    try {
      await server.register({
        plugin: dynamoDbPlugin,
        options: { dynamoDb: mockDynamoDb },
      });
    } catch (error) {
      expect(error.message).to.equal('DynamoDb client is not provided');
    }
  });

  it('should register the plugin and expose dynamoDbClient', async () => {
    const mockDynamoDbClient = { put: () => {}, get: () => {} };
    getDynamoClientStub.returns(mockDynamoDbClient);

    await server.register({
      plugin: dynamoDbPlugin,
      options: { dynamoDb: mockDynamoDb },
    });

    expect(server.plugins.dynamoDbPlugin.dynamoDbClient).to.equal(
      mockDynamoDbClient
    );
  });

  it('should have correct plugin properties', () => {
    expect(dynamoDbPlugin).to.include({
      name: 'dynamoDbPlugin',
      version: '1.0.0',
    });
    expect(dynamoDbPlugin.register).to.be.a.function();
  });
});
