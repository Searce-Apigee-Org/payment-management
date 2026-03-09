import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import {
  BuyLoadTransactionModel,
  BuyLoadTransactionSchema,
} from '../../../src/models/mongo/BuyLoadTransactionsModel.js';

const lab = Lab.script();
const { describe, it } = lab;
export { lab };

describe('Model :: Mongo :: BuyLoadTransactionModel', () => {
  it('should have all expected schema paths', () => {
    const paths = Object.keys(BuyLoadTransactionSchema.paths);

    const expectedFields = [
      'transactionId',
      'amount',
      'channelCode',
      'createDate',
      'keyword',
      'mobileNumber',
      'status',
      'tokenPaymentId',
      'wallet',
      'createdById',
      '_id',
      '__v',
    ];

    expectedFields.forEach((field) => {
      expect(paths).to.include(field);
    });
  });

  it('should enforce required fields', async () => {
    const model = new BuyLoadTransactionModel({});
    const validationError = model.validateSync();
    const requiredFields = [
      'transactionId',
      'mobileNumber',
      'status',
      'createdById',
    ];

    requiredFields.forEach((field) => {
      expect(validationError.errors).to.include(field);
    });
  });

  it('should accept valid document with all required fields', async () => {
    const validDoc = new BuyLoadTransactionModel({
      transactionId: 'TXN001',
      amount: 100,
      channelCode: 'NG1',
      keyword: 'LOAD50',
      mobileNumber: '09171234567',
      status: 'SUCCESS',
      tokenPaymentId: 'PAY123',
      wallet: 'main',
      createdById: 'admin001',
    });

    const validationError = validDoc.validateSync();
    expect(validationError).to.not.exist();
    expect(validDoc.transactionId).to.equal('TXN001');
    expect(validDoc.status).to.equal('SUCCESS');
    expect(validDoc.mobileNumber).to.equal('09171234567');
  });

  it('should apply default createDate automatically', () => {
    const model = new BuyLoadTransactionModel({
      transactionId: 'TXN999',
      mobileNumber: '09170001111',
      status: 'PENDING',
      createdById: 'system',
    });

    expect(model.createDate).to.exist();
    expect(model.createDate).to.be.instanceof(Date);
  });

  it('should allow optional decimal and string fields', () => {
    const model = new BuyLoadTransactionModel({
      transactionId: 'TXN777',
      amount: 250.75,
      mobileNumber: '09175554444',
      status: 'SUCCESS',
      createdById: 'system',
    });

    expect(model.amount).to.exist();
    expect(model.wallet).to.not.exist();
  });
});
