import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import {
  BindingPaymentMethodsModel,
  BindingPaymentMethodsSchema,
} from '../../../src/models/mongo/BindingPaymentMethodsModel.js';

const lab = Lab.script();
const { describe, it } = lab;
export { lab };

describe('Model :: Mongo :: BindingPaymentMethodsModel', () => {
  it('should have all expected schema paths', () => {
    const paths = Object.keys(BindingPaymentMethodsSchema.paths);

    const expectedFields = [
      'bindingRequestId',
      'statusDateTime',
      'createDate',
      'paymentMethod',
      'phoneNumber',
      'status',
      'uuid',
      'validity',
      'createdById',
      '_id',
      '__v',
    ];

    expectedFields.forEach((field) => {
      expect(paths).to.include(field);
    });
  });

  it('should enforce bindingRequestId as required', async () => {
    const model = new BindingPaymentMethodsModel({});
    const validationError = model.validateSync();
    expect(validationError.errors).to.include('bindingRequestId');
  });

  it('should accept valid document with all fields', async () => {
    const validDoc = new BindingPaymentMethodsModel({
      bindingRequestId: 'BIND123',
      statusDateTime: new Date(),
      createDate: new Date(),
      paymentMethod: 'GCASH',
      phoneNumber: '09171234567',
      status: 'ACTIVE',
      uuid: 'uuid-1',
      validity: '2025-12-31',
      createdById: 'admin123',
    });

    const validationError = validDoc.validateSync();
    expect(validationError).to.not.exist();
    expect(validDoc.bindingRequestId).to.equal('BIND123');
    expect(validDoc.paymentMethod).to.equal('GCASH');
    expect(validDoc.status).to.equal('ACTIVE');
  });

  it('should store primitive values correctly', () => {
    const model = new BindingPaymentMethodsModel({
      bindingRequestId: 'BIND777',
      status: 'INACTIVE',
      validity: '2026-01-01',
    });

    expect(model.bindingRequestId).to.equal('BIND777');
    expect(model.status).to.equal('INACTIVE');
    expect(model.validity).to.equal('2026-01-01');
  });
});
