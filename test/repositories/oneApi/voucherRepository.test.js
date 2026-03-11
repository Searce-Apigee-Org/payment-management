import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { config } from '../../../convict/config.js';
import {
  getVoucherData,
  updateVoucher,
} from '../../../src/repositories/oneApi/voucherRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Repository :: OneAPI Repository :: getVoucherData', () => {
  let http;

  beforeEach(() => {
    http = { get: Sinon.stub() };
    Sinon.stub(logger, 'debug');
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

describe('Repository :: OneApi :: voucherRepository :: updateVoucher', () => {
  const oneApiCfg = config.get('oneApi');
  const expectedUrl = `${oneApiCfg.httpProtocol}://${oneApiCfg.host}/${oneApiCfg.endpoints.useVoucher}`;
  const expectedOptions = {
    headers: {
      Authorization: oneApiCfg.accessToken,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    timeout: oneApiCfg.requestTimeout,
  };

  let req;

  beforeEach(() => {
    req = {
      http: {
        put: Sinon.stub(),
      },
    };

    Sinon.stub(logger, 'debug');
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should not call http.put when request list is empty', async () => {
    await updateVoucher(req, { settlementDetails: [] });

    expect(req.http.put.called).to.be.false();
  });

  it('should not call http.put when request is undefined', async () => {
    await updateVoucher(req, undefined);

    expect(req.http.put.called).to.be.false();
  });

  it('should call http.put for each voucherRequest with correct url/body/options', async () => {
    const paymentEntity = {
      paymentType: 'XENDIT',
      paymentInformation: { type: 'CC_DC' },
      tokenPaymentId: 'CXS-123',
      settlementDetails: [
        {
          voucher: { code: 'V1', category: 'C1' },
          mobileNumber: null,
          transactions: [],
        },
        {
          voucher: { code: 'V2', category: 'C2' },
          mobileNumber: null,
          transactions: [],
        },
        {
          voucher: { code: 'V3', category: 'C3' },
          mobileNumber: null,
          transactions: [],
        },
      ],
    };

    req.http.put.resolves({ status: 'OK' });

    const res = await updateVoucher(req, paymentEntity);

    expect(res).to.be.undefined();

    expect(req.http.put.callCount).to.equal(3);

    for (let i = 0; i < 3; i++) {
      const call = req.http.put.getCall(i);
      expect(call.args[0]).to.equal(expectedUrl);
      expect(
        Object.prototype.hasOwnProperty.call(call.args[1], 'voucherRequest')
      ).to.be.true();
      expect(call.args[2]).to.equal(expectedOptions);
      expect(call.args[3]).to.equal(false);
      expect(call.args[4]).to.equal(false);
    }
  });

  it('should log and rethrow on error from http.put', async () => {
    const paymentEntity = {
      paymentType: 'XENDIT',
      paymentInformation: { type: 'CC_DC' },
      settlementDetails: [
        {
          voucher: { code: 'V', category: 'C' },
          mobileNumber: null,
          transactions: [],
        },
      ],
    };

    const err = new Error('put failed');
    req.http.put.rejects(err);

    try {
      await updateVoucher(req, paymentEntity);
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).to.shallow.equal(err);
      expect(logger.debug.calledOnce).to.be.true();
      expect(logger.debug.firstCall.args[0]).to.equal(
        'ONE_API_UPDATE_VOUCHER_ERROR'
      );
      expect(logger.debug.firstCall.args[1]).to.shallow.equal(err);
    }
  });
});
