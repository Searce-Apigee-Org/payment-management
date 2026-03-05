import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import { BuyLoadChannelConfigModel } from '../../../src/models/mongo/BuyLoadChannelConfigModel.js';

const lab = Lab.script();
const { describe, it } = lab;
export { lab };

describe('Model :: Mongo :: BuyLoadChannelConfigModel', () => {
  it('should have all expected schema paths', () => {
    const paths = Object.keys(BuyLoadChannelConfigModel.schema.paths);

    const expectedFields = [
      'startTime.hour',
      'startTime.minute',
      'startTime.second',
      'maximumDailyTransactions',
      'endTime.hour',
      'endTime.minute',
      'endTime.second',
      'clientId',
      'maximumDailyAmount',
      'channelCode',
      'createDate',
      'createdById',
      'expiryDate',
      '_id',
      '__v',
    ];

    expectedFields.forEach((field) => {
      const exists = paths.some((p) => p.startsWith(field.split('.')[0]));
      expect(exists).to.be.true();
    });
  });

  it('should enforce required fields', async () => {
    const model = new BuyLoadChannelConfigModel({});
    const validationError = model.validateSync();
    const requiredFields = [
      'startTime',
      'maximumDailyTransactions',
      'endTime',
      'clientId',
      'maximumDailyAmount',
      'channelCode',
      'createdById',
    ];

    requiredFields.forEach((field) => {
      expect(validationError.errors).to.include(field);
    });
  });

  it('should accept valid document with nested TimeSchema', async () => {
    const validDoc = new BuyLoadChannelConfigModel({
      startTime: { hour: 8, minute: 0, second: 0 },
      endTime: { hour: 18, minute: 0, second: 0 },
      maximumDailyTransactions: 100,
      clientId: 'CLIENT123',
      maximumDailyAmount: 50000,
      channelCode: 'NG1',
      createdById: 'admin123',
    });

    const validationError = validDoc.validateSync();
    expect(validationError).to.not.exist();
    expect(validDoc.clientId).to.equal('CLIENT123');
    expect(validDoc.startTime.hour).to.equal(8);
    expect(validDoc.endTime.hour).to.equal(18);
  });

  it('should apply default values when omitted', () => {
    const model = new BuyLoadChannelConfigModel({
      startTime: { hour: 9, minute: 0, second: 0 },
      endTime: { hour: 17, minute: 0, second: 0 },
      maximumDailyTransactions: 10,
      clientId: 'C999',
      maximumDailyAmount: 10000,
      channelCode: 'GO',
      createdById: 'sys',
    });

    expect(model.createDate).to.exist();
    expect(model.expiryDate).to.be.null();
  });
});
