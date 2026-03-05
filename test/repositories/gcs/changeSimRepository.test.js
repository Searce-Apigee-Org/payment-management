import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import xlsx from 'node-xlsx';
import sinon from 'sinon';
import { getResult } from '../../../src/repositories/gcs/changeSimRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Repository :: GCS :: ChangeSim Repository :: getResult', () => {
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

  it('should return parsed ChangeSim values from GCS Excel file', async () => {
    const req = {
      server: { plugins: { gcsPlugin: { gcsClient: gcsClientStub } } },
      app: { principalId: 'testPrincipal' },
    };
    const fileSuffix = '-changesim.xlsx';

    const fakeExcelBuffer = Buffer.from('fake-binary-data');
    gcsClientStub.downloadFile.resolves(fakeExcelBuffer);

    const mockParsedWorkbook = [
      {
        data: [
          ['header1'],
          ['header2'],
          ['ID001', '100', 'Y'],
          ['ID002', '200', 'N'],
        ],
      },
    ];

    xlsxParseStub.returns(mockParsedWorkbook);

    const result = await getResult(req, fileSuffix);

    expect(gcsClientStub.downloadFile.calledOnce).to.be.true();
    expect(xlsxParseStub.calledOnce).to.be.true();
    expect(result).to.be.an.array();
    expect(result).to.have.length(2);
    expect(result[0]).to.equal({
      id: 'ID001',
      price: '100',
      flag: 'Y',
    });
    expect(result[1]).to.equal({
      id: 'ID002',
      price: '200',
      flag: 'N',
    });
  });

  it('should throw error when GCS download fails', async () => {
    const req = {
      server: { plugins: { gcsPlugin: { gcsClient: gcsClientStub } } },
      app: { principalId: 'errUser' },
    };
    gcsClientStub.downloadFile.rejects(new Error('Failed to download file'));

    try {
      await getResult(req, '-changesim.xlsx');
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err).to.be.instanceOf(Error);
      expect(err.message).to.equal('Failed to download file');
    }
  });
});
