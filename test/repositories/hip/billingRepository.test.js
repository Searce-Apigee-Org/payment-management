import Code from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { config } from '../../../convict/config.js';
import { getAccountInfo } from '../../../src/repositories/hip/billingRepository.js';
import { constants } from '../../../src/util/index.js';

const { expect } = Code;
const lab = Lab.script();
export { lab };
const { describe, it, beforeEach, afterEach } = lab;

describe('Service :: common :: hipBillingRepository :: getAccountInfo', () => {
  let mockSoap;
  let configStub;

  beforeEach(() => {
    mockSoap = { send: Sinon.stub() };

    configStub = Sinon.stub(config, 'get').callsFake((key) =>
      key === 'hip'
        ? {
            host: 'hip-billing.example.com',
            httpProtocol: 'https',
            requestTimeout: '4000',
            endpoints: {
              billingEndpoint: 'billing-api',
            },
          }
        : undefined
    );
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should successfully return parsed GetAccountInfoResult from SOAP response', async () => {
    const mockRequest = {
      AccountNumber: '1234567890',
    };

    const mockSoapResponse = {
      'ns2:GetAccountInfoResponse': {
        GetAccountInfoResult: {
          AccountHeader: { Status: '00', AccountNumber: '1234567890' },
        },
      },
    };

    mockSoap.send.resolves(mockSoapResponse);

    const req = { soap: mockSoap };
    const result = await getAccountInfo(req, mockRequest);

    expect(result).to.equal({
      AccountHeader: { Status: '00', AccountNumber: '1234567890' },
    });

    const args = mockSoap.send.firstCall.args[0];
    expect(args.url).to.contain('https://hip-billing.example.com/billing-api');
    expect(args.headers['Content-Type']).to.contain(
      constants.DOWNSTREAMS.GET_ACCOUNT_INFO
    );
    expect(args.xml).to.contain('get-account-info.xml');
  });

  it('should build correct SOAP opts with proper timeout and headers', async () => {
    const mockRequest = { ServiceNumber: '09171234567' };

    mockSoap.send.resolves({
      'ns2:GetAccountInfoResponse': {
        GetAccountInfoResult: { Success: true },
      },
    });

    const req = { soap: mockSoap };
    await getAccountInfo(req, mockRequest);

    const args = mockSoap.send.firstCall.args[0];
    expect(args.timeout).to.equal(4000);
    expect(args.rejectUnauthorized).to.be.false();
    expect(args.headers['Accept-Encoding']).to.exist();
  });

  it('should return { status: "failed", error } when SOAP call throws', async () => {
    const mockError = new Error('SOAP_BILLING_FAILURE');
    mockSoap.send.rejects(mockError);

    const mockRequest = { AccountNumber: '9999999999' };
    const req = { soap: mockSoap };

    const result = await getAccountInfo(req, mockRequest);

    expect(result.status).to.equal('failed');
    expect(result.error).to.shallow.equal(mockError);
  });

  it('should return undefined if SOAP response missing GetAccountInfoResult', async () => {
    const mockRequest = { AccountNumber: '8888888888' };

    mockSoap.send.resolves({
      'ns2:GetAccountInfoResponse': {},
    });

    const req = { soap: mockSoap };
    const result = await getAccountInfo(req, mockRequest);

    expect(result).to.be.undefined();
  });
});
