import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { getDetailsByMSISDN } from '../../../src/repositories/hip/interimRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;
export { lab };

let soap;

beforeEach(() => {
  soap = {
    send: Sinon.stub(),
  };
});

afterEach(() => {
  Sinon.restore();
});

describe('Repository :: HIP :: interimRepository :: getDetailsByMSISDN', () => {
  const mockRequest = {
    MSISDN: '09171234567',
  };

  it('should throw OperationFailed when request fails', async () => {
    soap.send.rejects(new Error('SOAP failure'));

    try {
      await getDetailsByMSISDN(mockRequest, { soap });
      throw new Error('Expected to throw but succeeded');
    } catch (err) {
      expect(err).to.be.an.object();
      expect(err.type).to.equal('OperationFailed');
    }
  });

  it('should return GetDetailsByMsisdnResult when request succeeds', async () => {
    const mockResult = { accountNo: '1234', status: 'Active' };

    const mockSoapResponse = {
      'ns2:GetDetailsByMsisdnResponse': {
        GetDetailsByMsisdnResult: mockResult,
      },
    };

    const stub = soap.send.resolves(mockSoapResponse);

    const response = await getDetailsByMSISDN(mockRequest, { soap });

    expect(stub.calledOnce).to.be.true();
    expect(response).to.equal(mockResult);
  });
});
