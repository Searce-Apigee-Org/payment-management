import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import {
  CustomerPaymentECPayModel,
  CustomerPaymentECPaySchema,
} from '../../../src/models/mongo/CustomerPaymentECPayModel.js';

const lab = Lab.script();
const { describe, it } = lab;
export { lab };

describe('Model :: Mongo :: CustomerPaymentECPayModel', () => {
  it('should have all expected schema paths', () => {
    const paths = Object.keys(CustomerPaymentECPaySchema.paths);

    const expectedFields = [
      'partnerReferenceNumber',
      'accountId',
      'accountNumber',
      'amount',
      'billerName',
      'paymentStatus',
      'processStatus',
      'secretKey',
      'serviceCharge',
      'transactionDateTime',
      'tokenPaymentId',
      'traceNumber',
      'userUuId',
      'validateStatus',
      'createDate',
      'createdById',
      '_id',
      '__v',
    ];

    expectedFields.forEach((field) => {
      expect(paths).to.include(field);
    });
  });

  it('should enforce required fields', async () => {
    const model = new CustomerPaymentECPayModel({});
    const validationError = model.validateSync();
    const requiredFields = [
      'partnerReferenceNumber',
      'accountNumber',
      'amount',
      'billerName',
      'paymentStatus',
      'transactionDateTime',
      'userUuId',
    ];

    requiredFields.forEach((field) => {
      expect(validationError.errors).to.include(field);
    });
  });

  it('should accept a valid document with required fields', async () => {
    const validDoc = new CustomerPaymentECPayModel({
      partnerReferenceNumber: 'REF123',
      accountNumber: 'ACC987654',
      amount: 1500.5,
      billerName: 'MERALCO',
      paymentStatus: 'SUCCESS',
      transactionDateTime: new Date(),
      userUuId: 'USER123',
    });

    const validationError = validDoc.validateSync();
    expect(validationError).to.not.exist();
    expect(validDoc.partnerReferenceNumber).to.equal('REF123');
    expect(validDoc.billerName).to.equal('MERALCO');
    expect(validDoc.amount).to.exist();
  });

  it('should allow optional decimal and string fields', () => {
    const model = new CustomerPaymentECPayModel({
      partnerReferenceNumber: 'REF999',
      accountNumber: 'ACC999',
      amount: 100.25,
      billerName: 'PLDT',
      paymentStatus: 'PENDING',
      transactionDateTime: new Date(),
      userUuId: 'USER999',
      serviceCharge: 10.5,
      secretKey: 's3cr3t',
      processStatus: 'INIT',
    });

    expect(model.secretKey).to.equal('s3cr3t');
    expect(model.serviceCharge).to.exist();
    expect(model.processStatus).to.equal('INIT');
  });

  it('should accept custom createDate and createdById', () => {
    const now = new Date();
    const model = new CustomerPaymentECPayModel({
      partnerReferenceNumber: 'REFCUSTOM',
      accountNumber: 'ACC111',
      amount: 999.99,
      billerName: 'GLOBE',
      paymentStatus: 'DONE',
      transactionDateTime: now,
      userUuId: 'USER111',
      createDate: now,
      createdById: 'system',
    });

    expect(model.createDate).to.equal(now);
    expect(model.createdById).to.equal('system');
  });
});
