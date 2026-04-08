import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import { CustomerPaymentModel } from '../../../src/models/mongo/CustomerPaymentModel.js';

const lab = Lab.script();
const { describe, it } = lab;
export { lab };

describe('Model :: Mongo :: CustomerPaymentModel', () => {
  it('should have all expected schema paths', () => {
    const paths = Object.keys(CustomerPaymentModel.schema.paths);

    const expectedFields = [
      'tokenPaymentId',
      'actions',
      'channelId',
      'checkoutUrl',
      'createDate',
      'createPaymentSessionError',
      'deviceId',
      'lastUpdateDate',
      'merchantAccount',
      'paymentInformation',
      'paymentMethods',
      'paymentResult',
      'paymentSession',
      'paymentType',
      'settlementDetails',
      'storedPaymentMethods',
      'userToken',
      'createdById',
      '_id',
      '__v',
    ];

    expectedFields.forEach((field) => {
      expect(paths).to.include(field);
    });
  });

  it('should enforce required field tokenPaymentId', async () => {
    const model = new CustomerPaymentModel({});
    const validationError = model.validateSync();
    expect(validationError.errors).to.include('tokenPaymentId');
  });

  it('should accept a valid document with nested settlementDetails', async () => {
    const validDoc = new CustomerPaymentModel({
      tokenPaymentId: 'PAY123',
      channelId: 'NG1',
      paymentType: 'XENDIT',
      settlementDetails: [
        {
          amount: 100.5,
          appStatus: 'SUCCESS',
          emailAddress: 'user@example.com',
          mobileNumber: '09171234567',
          status: 'PROCESSING',
          transactions: [
            {
              amount: 50.25,
              keyword: 'LOAD50',
              serviceId: 'SRV123',
              transactionId: 'TXN001',
              voucherDetails: {
                contentPartner: 'Globe',
                paidAmount: 50.25,
                serialNumber: 'SER123',
                validFrom: new Date(),
                validTo: new Date(),
                voucherCode: 'VCODE123',
                voucherDescription: 'Promo Voucher',
              },
            },
          ],
          transactionType: 'PROMO',
        },
      ],
      createdById: 'sys',
    });

    const validationError = validDoc.validateSync();
    expect(validationError).to.not.exist();
    expect(validDoc.tokenPaymentId).to.equal('PAY123');
    expect(
      validDoc.settlementDetails[0].transactions[0].voucherDetails.voucherCode
    ).to.equal('VCODE123');
  });

  it('should apply default values when omitted', () => {
    const model = new CustomerPaymentModel({
      tokenPaymentId: 'PAY999',
    });

    expect(model.createDate).to.exist();
    expect(model.checkoutUrl).to.be.null();
    expect(model.deviceId).to.be.null();
    expect(model.paymentInformation).to.be.null();
    expect(model.settlementDetails).to.be.an.array();
  });

  it('should correctly transform document to plain object with id and no internal fields', () => {
    const model = new CustomerPaymentModel({
      tokenPaymentId: 'PAYTRANSFORM',
    });

    const obj = model.toObject();
    expect(obj).to.include(['id', 'tokenPaymentId']);
    expect(obj._id).to.not.exist();
    expect(obj.__v).to.not.exist();
  });
});
