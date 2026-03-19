import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import sinon from 'sinon';
import { config } from '../../../convict/config.js';
import {
  create,
  findByPartnerRef,
} from '../../../src/repositories/dynamo/ecpayTransactionsRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Repository :: Dynamo :: ECPayTransactions Repository :: findByPartnerRef', () => {
  let mockDynamoClient;
  let configGetStub;

  beforeEach(() => {
    mockDynamoClient = {
      send: sinon.stub(),
    };

    configGetStub = sinon.stub(config, 'get');
    configGetStub
      .withArgs('dynamo.tables.customerPaymentECPay')
      .returns('cxs-ecpay-transactions-test');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return Item when record exists', async () => {
    const refId = 'ref-123';
    const mockItem = {
      partner_reference_number: refId,
      amount: 100,
    };
    mockDynamoClient.send.resolves({ Item: mockItem });

    const result = await findByPartnerRef(refId, mockDynamoClient);

    expect(result).to.equal(mockItem);
    expect(mockDynamoClient.send.calledOnce).to.be.true();

    const sentCommand = mockDynamoClient.send.firstCall.args[0];
    expect(sentCommand.input.TableName).to.equal('cxs-ecpay-transactions-test');
    expect(sentCommand.input.Key.partner_reference_number).to.equal(refId);
  });

  it('should return null when Item is missing', async () => {
    mockDynamoClient.send.resolves({});

    const result = await findByPartnerRef('ref-999', mockDynamoClient);

    expect(result).to.be.null();
  });

  it('should log info messages on success', async () => {
    const loggerInfoStub = sinon.stub(logger, 'info');
    const refId = 'ref-124';
    const mockItem = { partner_reference_number: refId };
    mockDynamoClient.send.resolves({ Item: mockItem });

    await findByPartnerRef(refId, mockDynamoClient);

    expect(
      loggerInfoStub.calledWith(
        'ECPAY_TXN_DYNAMO_FIND_BY_PARTNER_REF',
        sinon.match({
          refId,
          tableName: 'cxs-ecpay-transactions-test',
        })
      )
    ).to.be.true();
    expect(
      loggerInfoStub.calledWith(
        'ECPAY_TXN_DYNAMO_FIND_BY_PARTNER_REF_SUCCESS',
        sinon.match({
          refId,
          tableName: 'cxs-ecpay-transactions-test',
          found: true,
          item: sinon.match({ partner_reference_number: refId }),
        })
      )
    ).to.be.true();
  });

  it('should throw InternalOperationFailed when table name is missing from config', async () => {
    configGetStub.withArgs('dynamo.tables.customerPaymentECPay').returns(null);

    try {
      await findByPartnerRef('ref-err', mockDynamoClient);
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err.type).to.equal('InternalOperationFailed');
      expect(err.details).to.equal(
        'Missing dynamo.tables.customerPaymentECPay (env: CXS_DYNAMO_ECPAY_TRANSACTION_TABLE_NAME)'
      );
    }

    expect(mockDynamoClient.send.called).to.be.false();
  });

  it('should throw InternalOperationFailed when DynamoDB send fails', async () => {
    const loggerErrorStub = sinon.stub(logger, 'error');
    mockDynamoClient.send.rejects(new Error('DynamoDB error'));

    try {
      await findByPartnerRef('ref-125', mockDynamoClient);
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err.type).to.equal('InternalOperationFailed');
      expect(err.details).to.equal('DynamoDB error');
    }

    expect(mockDynamoClient.send.calledOnce).to.be.true();
    expect(
      loggerErrorStub.calledWith(
        'ECPAY_TXN_DYNAMO_FIND_BY_PARTNER_REF_FAILED',
        sinon.match.instanceOf(Error)
      )
    ).to.be.true();
  });
});

describe('Repository :: Dynamo :: ECPayTransactions Repository :: create', () => {
  let mockDynamoClient;
  let configGetStub;

  beforeEach(() => {
    mockDynamoClient = {
      send: sinon.stub(),
    };

    configGetStub = sinon.stub(config, 'get');
    configGetStub
      .withArgs('dynamo.tables.customerPaymentECPay')
      .returns('cxs-ecpay-transactions-test');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should create transaction and return transactionDetails', async () => {
    const transactionDetails = {
      partner_reference_number: 'ref-200',
      amount: 500,
    };

    mockDynamoClient.send.resolves({});

    const result = await create(transactionDetails, mockDynamoClient);

    expect(result).to.equal(transactionDetails);
    expect(mockDynamoClient.send.calledOnce).to.be.true();

    const sentCommand = mockDynamoClient.send.firstCall.args[0];
    expect(sentCommand.input.TableName).to.equal('cxs-ecpay-transactions-test');
    expect(sentCommand.input.Item).to.equal(transactionDetails);
  });

  it('should log info messages on success', async () => {
    const loggerInfoStub = sinon.stub(logger, 'info');
    const transactionDetails = {
      partner_reference_number: 'ref-201',
      amount: 501,
    };
    mockDynamoClient.send.resolves({});

    await create(transactionDetails, mockDynamoClient);

    expect(
      loggerInfoStub.calledWith('ECPAY_TXN_DYNAMO_CREATE', {
        partner_reference_number: 'ref-201',
      })
    ).to.be.true();
    expect(
      loggerInfoStub.calledWith(
        'ECPAY_TXN_DYNAMO_CREATE_SUCCESS',
        transactionDetails
      )
    ).to.be.true();
  });

  it('should throw InternalOperationFailed when table name is missing from config', async () => {
    configGetStub.withArgs('dynamo.tables.customerPaymentECPay').returns(null);

    try {
      await create({ partner_reference_number: 'ref-err' }, mockDynamoClient);
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err.type).to.equal('InternalOperationFailed');
      expect(err.details).to.equal(
        'Missing dynamo.tables.customerPaymentECPay (env: CXS_DYNAMO_ECPAY_TRANSACTION_TABLE_NAME)'
      );
    }

    expect(mockDynamoClient.send.called).to.be.false();
  });

  it('should throw InternalOperationFailed when DynamoDB send fails', async () => {
    const loggerErrorStub = sinon.stub(logger, 'error');
    mockDynamoClient.send.rejects(new Error('DynamoDB error'));

    try {
      await create({ partner_reference_number: 'ref-202' }, mockDynamoClient);
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err.type).to.equal('InternalOperationFailed');
      expect(err.details).to.equal('DynamoDB error');
    }

    expect(mockDynamoClient.send.calledOnce).to.be.true();
    expect(
      loggerErrorStub.calledWith(
        'ECPAY_TXN_DYNAMO_CREATE_FAILED',
        sinon.match.instanceOf(Error)
      )
    ).to.be.true();
  });
});
