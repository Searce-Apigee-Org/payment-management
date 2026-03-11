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
      headers: {
        authorization:
          'Bearer eyJhbGciOiJIUzI1NiJ9.eyJjbGllbnRfaWQiOiJDTElFTlQxMjMifQ.sig',
      },
    };
    const fileSuffix = 'buypromo';

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

    // Should use legacy key based on Authorization JWT client_id
    const callArgs = gcsClientStub.downloadFile.getCall(0).args[0];
    expect(callArgs.fileName).to.equal('CLIENT123_BuyPromo.csv');

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

  it('should parse BuyVoucher-style sheet with headers (voucher_category, price, id)', async () => {
    const req = {
      server: { plugins: { gcsPlugin: { gcsClient: gcsClientStub } } },
      app: { principalId: 'testUser' },
      headers: {
        authorization:
          'Bearer eyJhbGciOiJIUzI1NiJ9.eyJjbGllbnRfaWQiOiJDTElFTlQxMjMifQ.sig',
      },
    };

    const fileSuffix = 'buyvoucher';

    gcsClientStub.downloadFile.resolves(Buffer.from('fake-data'));

    const mockParsedSheet = [
      {
        data: [
          ['some', 'junk'],
          ['voucher_category', 'price', 'id'],
          ['SA3MSWIPE', '10', ''],
          ['SA6MSWIPE', '11', 'X1'],
        ],
      },
    ];
    xlsxParseStub.returns(mockParsedSheet);

    const result = await getResult(req, fileSuffix);

    const callArgs = gcsClientStub.downloadFile.getCall(0).args[0];
    expect(callArgs.fileName).to.equal('CLIENT123_BuyVoucher.csv');

    expect(result).to.equal([
      { serviceID: 'SA3MSWIPE', param: '', price: '10', id: '', mm: '' },
      { serviceID: 'SA6MSWIPE', param: '', price: '11', id: 'X1', mm: '' },
    ]);
  });

  it('should parse BuyVoucher-style sheet without headers (3 columns)', async () => {
    const req = {
      server: { plugins: { gcsPlugin: { gcsClient: gcsClientStub } } },
      app: { principalId: 'testUser' },
      headers: {
        authorization:
          'Bearer eyJhbGciOiJIUzI1NiJ9.eyJjbGllbnRfaWQiOiJDTElFTlQxMjMifQ.sig',
      },
    };

    const fileSuffix = 'buyvoucher';

    gcsClientStub.downloadFile.resolves(Buffer.from('fake-data'));

    const mockParsedSheet = [
      {
        data: [
          // 5 junk header rows (legacy) then 3-col data rows
          ['h1'],
          ['h2'],
          ['h3'],
          ['h4'],
          ['h5'],
          ['SA3MSWIPE', '10', ''],
          ['SA6MSWIPE', '11', 'X1'],
        ],
      },
    ];
    xlsxParseStub.returns(mockParsedSheet);

    const result = await getResult(req, fileSuffix);

    expect(result).to.equal([
      { serviceID: 'SA3MSWIPE', param: '', price: '10', id: '', mm: '' },
      { serviceID: 'SA6MSWIPE', param: '', price: '11', id: 'X1', mm: '' },
    ]);
  });

  it('should parse BuyPromo-style sheet with headers using service_id variant', async () => {
    const req = {
      server: { plugins: { gcsPlugin: { gcsClient: gcsClientStub } } },
      app: { principalId: 'testUser' },
      headers: {
        authorization:
          'Bearer eyJhbGciOiJIUzI1NiJ9.eyJjbGllbnRfaWQiOiJDTElFTlQxMjMifQ.sig',
      },
    };

    const fileSuffix = 'buypromo';
    gcsClientStub.downloadFile.resolves(Buffer.from('fake-data'));

    xlsxParseStub.returns([
      {
        data: [
          ['service_id', 'param', 'price', 'id', 'mm'],
          ['SVC001', 'p1', '100', 'ID001', 'MM001'],
        ],
      },
    ]);

    const result = await getResult(req, fileSuffix);

    expect(result).to.equal([
      {
        serviceID: 'SVC001',
        param: 'p1',
        price: '100',
        id: 'ID001',
        mm: 'MM001',
      },
    ]);
  });

  it('should parse BuyPromo-style sheet with headers using serviceid variant', async () => {
    const req = {
      server: { plugins: { gcsPlugin: { gcsClient: gcsClientStub } } },
      app: { principalId: 'testUser' },
      headers: {
        authorization:
          'Bearer eyJhbGciOiJIUzI1NiJ9.eyJjbGllbnRfaWQiOiJDTElFTlQxMjMifQ.sig',
      },
    };

    const fileSuffix = 'buypromo';
    gcsClientStub.downloadFile.resolves(Buffer.from('fake-data'));

    xlsxParseStub.returns([
      {
        data: [
          ['serviceid', 'param', 'price', 'id', 'mm'],
          ['SVC002', '', '200', 'ID002', ''],
        ],
      },
    ]);

    const result = await getResult(req, fileSuffix);

    expect(result).to.equal([
      {
        serviceID: 'SVC002',
        param: '',
        price: '200',
        id: 'ID002',
        mm: '',
      },
    ]);
  });

  it('should parse BuyVoucher-style sheet with header vouchercategory (no underscore)', async () => {
    const req = {
      server: { plugins: { gcsPlugin: { gcsClient: gcsClientStub } } },
      app: { principalId: 'testUser' },
      headers: {
        authorization:
          'Bearer eyJhbGciOiJIUzI1NiJ9.eyJjbGllbnRfaWQiOiJDTElFTlQxMjMifQ.sig',
      },
    };

    const fileSuffix = 'buyvoucher';
    gcsClientStub.downloadFile.resolves(Buffer.from('fake-data'));

    xlsxParseStub.returns([
      {
        data: [
          ['vouchercategory', 'price', 'id'],
          ['SA3MSWIPE', '849', ''],
        ],
      },
    ]);

    const result = await getResult(req, fileSuffix);

    expect(result).to.equal([
      { serviceID: 'SA3MSWIPE', param: '', price: '849', id: '', mm: '' },
    ]);
  });

  it('should throw error when GCS download fails', async () => {
    const req = {
      server: { plugins: { gcsPlugin: { gcsClient: gcsClientStub } } },
      app: { principalId: 'user' },
    };
    gcsClientStub.downloadFile.rejects(new Error('GCS download failed'));

    try {
      await getResult(req, 'buypromo');
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err).to.be.instanceOf(Error);
      expect(err.message).to.equal('GCS download failed');
    }
  });

  it('should return empty array when workbook has no rows', async () => {
    const req = {
      server: { plugins: { gcsPlugin: { gcsClient: gcsClientStub } } },
      app: { principalId: 'testUser' },
    };

    gcsClientStub.downloadFile.resolves(Buffer.from('fake-data'));
    xlsxParseStub.returns([{ data: null }]);

    const result = await getResult(req, 'buypromo');
    expect(result).to.equal([]);
  });
});
