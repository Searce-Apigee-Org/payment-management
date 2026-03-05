import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { getVoucherData } from '../../../src/repositories/oneApi/voucherRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Repository :: OneAPI Repository :: getVoucherData', () => {
  let http;

  beforeEach(() => {
    http = { get: Sinon.stub() };
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should return response from http.get', async () => {
    const mockResponse = { data: { voucher: 'ABC123' } };
    http.get.resolves(mockResponse);

    const voucherRequest = { voucherId: 'V001' };
    const voucherToken = 'Bearer token-xyz';

    const result = await getVoucherData(voucherRequest, voucherToken, http);

    expect(result).to.equal(mockResponse);
    expect(http.get.calledOnce).to.be.true();
  });

  it('should throw OperationFailed when http.get rejects', async () => {
    http.get.rejects(new Error('network error'));

    const voucherRequest = { voucherId: 'V001' };
    const voucherToken = 'Bearer token-xyz';

    try {
      await getVoucherData(voucherRequest, voucherToken, http);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('InternalOperationFailed');
    }
  });
});
