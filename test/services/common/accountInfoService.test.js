import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import sinon from 'sinon';
import { getInfo } from '../../../src/services/common/accountInfoService.js';
import { constants } from '../../../src/util/index.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;
export { lab };

describe('Service :: v1 :: getAccountInfoService :: getInfo', () => {
  let req;

  beforeEach(() => {
    req = {
      hip: {
        interimRepository: {
          getDetailsByMSISDN: sinon.stub(),
        },
      },
      downstreamDataProvider: sinon.stub(),
      app: {
        cache: {},
      },
    };

    sinon.stub(logger, 'info').returns();
  });

  afterEach(() => sinon.restore());

  it('should call downstreamDataProvider with primaryResourceType', async () => {
    const mockPayload = {
      primaryResourceType: 'MOBILE',
      msisdn: '9270012345',
    };

    const mockResponse = { result: { SubscriberHeader: 'OK' } };

    req.downstreamDataProvider
      .withArgs(
        req,
        constants.DOWNSTREAMS.GET_DETAILS_BY_MSISDN,
        sinon.match.object,
        sinon.match.object
      )
      .resolves(mockResponse);

    const result = await getInfo(req, mockPayload);

    expect(result.statusCode).to.equal(200);
    expect(result.hipResponse).to.equal(mockResponse.result);
    expect(req.downstreamDataProvider.calledOnce).to.be.true();
  });

  it('should call downstreamDataProvider with accountNumber only', async () => {
    const mockPayload = {
      accountNumber: '12345678',
    };

    const mockResponse = { result: { Status: '00', AccountName: 'Test User' } };

    req.downstreamDataProvider
      .withArgs(
        req,
        constants.DOWNSTREAMS.GET_ACCOUNT_INFO,
        sinon.match({
          AccountNumber: '12345678',
        }),
        sinon.match.object
      )
      .resolves(mockResponse);

    const result = await getInfo(req, mockPayload);

    expect(result.statusCode).to.equal(200);
    expect(result.hipResponse).to.equal(mockResponse.result);
    expect(req.downstreamDataProvider.calledOnce).to.be.true();
  });

  it('should correctly format msisdn when provided', async () => {
    const mockPayload = {
      msisdn: '9270012345',
    };

    const mockResponse = { result: { Status: '00' } };
    req.downstreamDataProvider.resolves(mockResponse);

    const result = await getInfo(req, mockPayload);

    expect(req.downstreamDataProvider.calledOnce).to.be.true();

    const callArgs = req.downstreamDataProvider.getCall(0).args[2];
    expect(callArgs.MSISDN).to.equal('639270012345');
    expect(result.statusCode).to.equal(200);
  });

  it('should include serviceNumber if provided', async () => {
    const mockPayload = {
      serviceNumber: 'PLDT12345',
    };

    const mockResponse = { result: { Status: '00' } };
    req.downstreamDataProvider.resolves(mockResponse);

    const result = await getInfo(req, mockPayload);

    const callArgs = req.downstreamDataProvider.getCall(0).args[2];
    expect(callArgs.ServiceNumber).to.equal('PLDT12345');
    expect(result.statusCode).to.equal(200);
  });

  it('should propagate error if downstreamDataProvider fails', async () => {
    const mockPayload = { accountNumber: '123456' };
    req.downstreamDataProvider.rejects(new Error('Downstream failed'));

    await expect(getInfo(req, mockPayload)).to.reject(
      Error,
      'Downstream failed'
    );
  });
});
