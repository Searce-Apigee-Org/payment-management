import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import esmock from 'esmock';
import sinon from 'sinon';

const lab = Lab.script();
const { describe, it, before, afterEach } = lab;
export { lab };

describe('Service :: common :: enrolledAccountsService :: validateEnrolledAccounts', () => {
  let validateEnrolledAccounts;
  let findAccountMongoStub;
  let findAccountDynamoStub;

  const buildReq = () => ({
    findAccount: sinon.stub(),
    server: {
      plugins: {
        dynamoDbPlugin: {
          dynamoDbClient: 'dummyClient',
        },
      },
    },
  });

  before(async () => {
    findAccountMongoStub = sinon.stub();
    findAccountDynamoStub = sinon.stub();

    ({ validateEnrolledAccounts } = await esmock(
      '../../../src/services/common/enrolledAccountsService.js',
      {
        '../../../convict/config.js': {
          config: {
            get: (key) => {
              if (key === 'dynamo.migratedTables')
                return ['enrolledAccountsTable'];
              if (key === 'dynamo.tables.enrolledAccounts')
                return 'enrolledAccountsTable';
              return undefined;
            },
          },
        },
        '@globetel/cxs-core/core/logger/index.js': {
          logger: { info: sinon.stub(), error: sinon.stub() },
        },
        '@globetel/cxs-core/core/services/accounts/mongo.js': {
          findAccount: findAccountMongoStub,
        },
        '@globetel/cxs-core/core/services/accounts/dynamo.js': {
          findAccount: findAccountDynamoStub,
        },
      }
    ));
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should throw ForbiddenToAccessAccount when no enrolled accounts', async () => {
    findAccountMongoStub.resolves({ accountList: [] });

    try {
      await validateEnrolledAccounts(buildReq(), 'uuid-1', '09171234567');
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('ForbiddenToAccessAccount');
    }
  });

  it('should return accountDetails when target matches mobileNumber', async () => {
    findAccountMongoStub.resolves({
      accountList: [
        {
          segment: 'mobile',
          brand: 'prepaid',
          brandDetail: 'TM',
          mobileNumber: '09171234567',
        },
      ],
    });

    const result = await validateEnrolledAccounts(
      buildReq(),
      'uuid-1',
      '09171234567'
    );
    expect(result).to.equal('mobile-prepaid-TM');
  });

  it('should not match when stored msisdn format differs (strict match)', async () => {
    findAccountMongoStub.resolves({
      accountList: [
        {
          segment: 'mobile',
          brand: 'prepaid',
          brandDetail: 'TM',
          mobileNumber: '9171234567', // stored without leading 0
        },
      ],
    });

    try {
      await validateEnrolledAccounts(buildReq(), 'uuid-1', '09171234567');
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('ForbiddenToAccessAccount');
    }
  });

  it('should return accountDetails when target matches accountNumber', async () => {
    findAccountMongoStub.resolves({
      accountList: [
        {
          segment: 'broadband',
          brand: 'postpaid',
          brandDetail: 'GHP',
          accountNumber: '928866382',
        },
      ],
    });

    const result = await validateEnrolledAccounts(
      buildReq(),
      'uuid-1',
      '928866382'
    );
    expect(result).to.equal('broadband-postpaid-GHP');
  });

  it('should return accountDetails with prepaidWired when GFiber Prepaid landline matches', async () => {
    findAccountMongoStub.resolves({
      accountList: [
        {
          segment: 'broadband',
          brand: 'prepaid',
          brandDetail: 'GFiber Prepaid',
          landlineNumber: '0281234567',
        },
      ],
    });

    const result = await validateEnrolledAccounts(
      buildReq(),
      'uuid-1',
      '0281234567'
    );

    expect(result).to.equal('broadband-prepaid-prepaidWired');
  });

  it('should throw ForbiddenToAccessAccount when target does not match any enrolled account', async () => {
    findAccountMongoStub.resolves({
      accountList: [
        {
          segment: 'mobile',
          brand: 'prepaid',
          brandDetail: 'TM',
          mobileNumber: '09170000000',
        },
      ],
    });

    try {
      await validateEnrolledAccounts(buildReq(), 'uuid-1', '09171234567');
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('ForbiddenToAccessAccount');
    }
  });

  it('should use Dynamo when table is not migrated and still validate enrolled accounts', async () => {
    const mongoStub = sinon.stub();
    const dynamoStub = sinon.stub().resolves({
      Item: {
        user_uuid: 'uuid-1',
        enrollAccounts: JSON.stringify([
          {
            segment: 'mobile',
            brand: 'prepaid',
            brandDetail: 'TM',
            mobileNumber: '09171234567',
          },
        ]),
      },
    });

    const { validateEnrolledAccounts: validateEnrolledAccountsDynamo } =
      await esmock('../../../src/services/common/enrolledAccountsService.js', {
        '../../../convict/config.js': {
          config: {
            get: (key) => {
              if (key === 'dynamo.migratedTables') return []; // not migrated -> use Dynamo
              if (key === 'dynamo.tables.enrolledAccounts')
                return 'enrolledAccountsTable';
              return undefined;
            },
          },
        },
        '@globetel/cxs-core/core/logger/index.js': {
          logger: { info: sinon.stub(), error: sinon.stub() },
        },
        '@globetel/cxs-core/core/services/accounts/mongo.js': {
          findAccount: mongoStub,
        },
        '@globetel/cxs-core/core/services/accounts/dynamo.js': {
          findAccount: dynamoStub,
        },
      });

    const req = buildReq();

    const result = await validateEnrolledAccountsDynamo(
      req,
      'uuid-1',
      '09171234567'
    );

    expect(result).to.equal('mobile-prepaid-TM');
    expect(
      dynamoStub.calledOnceWith({ user_uuid: 'uuid-1' }, 'dummyClient')
    ).to.be.true();
    expect(mongoStub.called).to.be.false();
  });

  it('should throw ForbiddenToAccessAccount when Dynamo returns no enrollAccounts', async () => {
    const mongoStub = sinon.stub();
    const dynamoStub = sinon.stub().resolves({
      Item: {},
    });

    const { validateEnrolledAccounts: validateEnrolledAccountsDynamo } =
      await esmock('../../../src/services/common/enrolledAccountsService.js', {
        '../../../convict/config.js': {
          config: {
            get: (key) => {
              if (key === 'dynamo.migratedTables') return [];
              if (key === 'dynamo.tables.enrolledAccounts')
                return 'enrolledAccountsTable';
              return undefined;
            },
          },
        },
        '@globetel/cxs-core/core/logger/index.js': {
          logger: { info: sinon.stub(), error: sinon.stub() },
        },
        '@globetel/cxs-core/core/services/accounts/mongo.js': {
          findAccount: mongoStub,
        },
        '@globetel/cxs-core/core/services/accounts/dynamo.js': {
          findAccount: dynamoStub,
        },
      });

    const req = buildReq();

    try {
      await validateEnrolledAccountsDynamo(req, 'uuid-1', '09171234567');
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('ForbiddenToAccessAccount');
    }

    expect(
      dynamoStub.calledOnceWith({ user_uuid: 'uuid-1' }, 'dummyClient')
    ).to.be.true();
    expect(mongoStub.called).to.be.false();
  });
});
