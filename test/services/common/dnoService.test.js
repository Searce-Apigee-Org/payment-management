import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import sinon from 'sinon';
import { config } from '../../../convict/config.js';
import {
  dnoGetOffers,
  handleLFDNOUpdatePayment,
  handleLFDNOXenditUpdatePayment,
} from '../../../src/services/common/dnoService.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;
export { lab };

describe('Service :: v1 :: dnoGetOffersService :: dnoGetOffers', () => {
  let mockReq;
  let getStub;

  beforeEach(() => {
    mockReq = {
      secretManager: {
        apiConfigRepository: {
          getDNOConfig: sinon.stub(),
        },
      },
      tenantTokenService: {
        generateTenantToken: sinon.stub(),
      },
      dno: {
        offersRepository: {
          getOffers: sinon.stub(),
        },
      },
    };

    getStub = sinon.stub(config, 'get');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return valid offers filtered and mapped correctly', async () => {
    const ids = ['1001', '1002', '1003'];

    const mockDnoConfig = {
      operatorName: 'GLOBE',
      privateKey: 'mockPrivateKey',
      kid: 'mockKid',
    };

    const mockTenantToken = 'mockTenantToken';

    const mockDnoResponse = {
      offer_by_id: {
        1001: { data: { amounts: { primary: '50' } } },
        1002: { data: { amounts: { primary: null } } },
        1003: { data: { amounts: { primary: '100' } } },
        9999: { data: { amounts: { primary: '300' } } },
      },
    };

    mockReq.secretManager.apiConfigRepository.getDNOConfig
      .withArgs('mockSecret')
      .resolves(mockDnoConfig);

    getStub.withArgs('dno.endpoints.getOffers').returns('/offers');

    mockReq.tenantTokenService.generateTenantToken
      .withArgs({ path: '/offers' }, mockDnoConfig)
      .resolves(mockTenantToken);

    mockReq.dno.offersRepository.getOffers.resolves(mockDnoResponse);

    const result = await dnoGetOffers(
      { ...mockReq, secret: 'mockSecret' },
      ids
    );

    expect(result).to.be.array();
    expect(result).to.equal([
      { id: '1001', amount: 50 },
      { id: '1003', amount: 100 },
    ]);
  });

  it('should return empty array if offer_by_id is missing', async () => {
    mockReq.secretManager.apiConfigRepository.getDNOConfig.resolves({
      operatorName: 'GLOBE',
      privateKey: 'mockPrivateKey',
      kid: 'mockKid',
    });

    getStub.withArgs('dno.endpoints.getOffers').returns('/offers');

    mockReq.tenantTokenService.generateTenantToken.resolves('mockTenantToken');

    mockReq.dno.offersRepository.getOffers.resolves(undefined);

    const result = await dnoGetOffers({ ...mockReq, secret: 'mockSecret' }, [
      '1',
    ]);
    expect(result).to.equal([]);
  });

  it('should throw error if getDNOConfig fails', async () => {
    mockReq.secretManager.apiConfigRepository.getDNOConfig.rejects(
      new Error('Config fetch failed')
    );

    await expect(
      dnoGetOffers({ ...mockReq, secret: 'mockSecret' }, ['1'])
    ).to.reject(Error, 'Config fetch failed');
  });

  it('should handle missing primary amounts gracefully', async () => {
    const ids = ['a', 'b'];

    mockReq.secretManager.apiConfigRepository.getDNOConfig.resolves({
      operatorName: 'GLOBE',
      privateKey: 'mockPrivateKey',
      kid: 'mockKid',
    });

    getStub.withArgs('dno.endpoints.getOffers').returns('/offers');
    mockReq.tenantTokenService.generateTenantToken.resolves('mockTenantToken');

    mockReq.dno.offersRepository.getOffers.resolves({
      offer_by_id: {
        a: { data: { amounts: { primary: null } } },
        b: { data: {} },
      },
    });

    const result = await dnoGetOffers(
      { ...mockReq, secret: 'mockSecret' },
      ids
    );
    expect(result).to.equal([]);
  });
});

describe('Service :: common :: dnoService :: handleLFDNOXenditUpdatePayment', () => {
  let req;

  beforeEach(() => {
    req = {
      dno: {
        paymentsRepository: {
          updatePayment: sinon.stub().resolves(),
        },
      },
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should build notification with checkoutUrl, call DNO updatePayment and return true when GFP Xendit created requires action', async () => {
    const notificationRequest = {
      name: 'XenditPaymentSessionCreated',
      payload: {
        paymentId: 'PAY123',
        status: 'REQUIRES_ACTION',
        actions: [
          {
            url: 'https://checkout.example/123',
          },
        ],
      },
    };

    // tokenChannel = tokenPaymentId.substring(0, 3) => 'gfp' (matches CHANNELS.GFP)
    const tokenPaymentId = 'gfp-abc123';

    const result = await handleLFDNOXenditUpdatePayment(
      req,
      notificationRequest,
      tokenPaymentId
    );

    expect(result).to.equal(true);
    expect(req.dno.paymentsRepository.updatePayment.calledOnce).to.be.true();

    const [notificationArg, reqArg] =
      req.dno.paymentsRepository.updatePayment.firstCall.args;

    expect(reqArg).to.equal(req);
    expect(notificationArg).to.equal({
      name: 'XenditPaymentSessionCreated',
      payload: {
        paymentId: 'PAY123',
        status: 'REQUIRES_ACTION',
        checkoutUrl: 'https://checkout.example/123',
      },
    });
  });
});

describe('Service :: common :: dnoService :: handleLFDNOUpdatePayment', () => {
  let req;

  beforeEach(() => {
    req = {
      dno: {
        paymentsRepository: {
          updatePayment: sinon.stub().resolves(),
        },
      },
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should normalise refundAmount without decimal and call DNO updatePayment', async () => {
    const notificationRequest = {
      payload: {
        refundAmount: '1000', // treated as cents; will be divided by 100
      },
    };

    const tokenPaymentId = 'gfp-xyz'; // channel GFP
    const isDnoInvoked = false;

    await handleLFDNOUpdatePayment(
      req,
      notificationRequest,
      tokenPaymentId,
      isDnoInvoked
    );

    expect(req.dno.paymentsRepository.updatePayment.calledOnce).to.be.true();

    const [updatedNotification, reqArg] =
      req.dno.paymentsRepository.updatePayment.firstCall.args;

    expect(reqArg).to.equal(req);
    expect(updatedNotification).to.equal(notificationRequest);
    expect(updatedNotification.payload.refundAmount).to.equal('10');
  });
});
