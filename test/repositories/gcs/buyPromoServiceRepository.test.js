import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import xlsx from 'node-xlsx';
import sinon from 'sinon';
import { getResult } from '../../../src/repositories/gcs/buyPromoServiceRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Repository :: GCS :: BuyPromo Repository :: getResult', () => {
  let gcsClientStub, xlsxParseStub;

  beforeEach(() => {
    gcsClientStub = {
      downloadFile: sinon.stub(),
    };
    xlsxParseStub = sinon.stub(xlsx, 'parse');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return parsed buy promos from GCS Excel file', async () => {
    const req = {
      server: { plugins: { gcsPlugin: { gcsClient: gcsClientStub } } },
      app: { principalId: 'testUser' },
    };
    const fileSuffix = '-promo.xlsx';

    const fakeExcelBuffer = Buffer.from('fake-data');
    gcsClientStub.downloadFile.resolves(fakeExcelBuffer);

    const mockParsedSheet = [
      {
        data: [
          ['header1'],
          ['header2'],
          ['header3'],
          ['header4'],
          ['header5'],
          ['SVC001', 'param1', '100', 'ID001', 'MM001'],
          ['SVC002', '', '200', 'ID002', 'MM002'],
        ],
      },
    ];

    xlsxParseStub.returns(mockParsedSheet);

    const result = await getResult(req, fileSuffix);

    expect(gcsClientStub.downloadFile.calledOnce).to.be.true();
    expect(xlsxParseStub.calledOnce).to.be.true();
    expect(result).to.be.an.array();
    expect(result).to.have.length(2);
    expect(result[0]).to.equal({
      serviceID: 'SVC001',
      param: 'param1',
      price: '100',
      id: 'ID001',
      mm: 'MM001',
    });
    expect(result[1]).to.equal({
      serviceID: 'SVC002',
      param: '',
      price: '200',
      id: 'ID002',
      mm: 'MM002',
    });
  });

  it('should throw error when GCS download fails', async () => {
    const req = {
      server: { plugins: { gcsPlugin: { gcsClient: gcsClientStub } } },
      app: { principalId: 'user' },
    };
    gcsClientStub.downloadFile.rejects(new Error('GCS download failed'));

    try {
      await getResult(req, '-promo.xlsx');
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err).to.be.instanceOf(Error);
      expect(err.message).to.equal('GCS download failed');
    }
  });
});
