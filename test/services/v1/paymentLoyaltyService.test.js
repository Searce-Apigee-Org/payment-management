import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { handleLoyaltyPoints } from '../../../src/services/v1/paymentLoyaltyService.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Service :: handleLoyaltyPoints', () => {
  let reqMock;
  let paymentDetails;
  let responseMock;
  let loyaltyPointsSimulatorStub;

  beforeEach(() => {
    reqMock = {
      app: {
        principalId: '',
      },
      headers: {
        authorization:
          'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRfaWQiOiJjbGllbnQtMTIzIn0.signature',
        clientName: 'MyClient',
        host: 'localhost',
      },
      cxs: {
        loyaltyManagementRepository: {
          loyaltyPointsSimulator: Sinon.stub(),
        },
      },
      http: {},
    };

    responseMock = {};

    paymentDetails = {
      tokenPaymentId: 'GLA-123',
      settlementDetails: [],
    };

    loyaltyPointsSimulatorStub =
      reqMock.cxs.loyaltyManagementRepository.loyaltyPointsSimulator;
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should return response unchanged if clientName and tokenPaymentId do not match GLA or CPT', async () => {
    paymentDetails.tokenPaymentId = 'OTHER-123';
    const res = await handleLoyaltyPoints(
      reqMock,
      paymentDetails,
      null,
      responseMock
    );
    expect(res).to.equal(responseMock);
  });

  it('should skip loyalty if settlementDetails is empty', async () => {
    paymentDetails.tokenPaymentId = 'GLA-123';
    const res = await handleLoyaltyPoints(
      reqMock,
      paymentDetails,
      null,
      responseMock
    );
    expect(res).to.equal(responseMock);
  });

  it('should invoke loyalty for BUY_LOAD requestType', async () => {
    paymentDetails.tokenPaymentId = 'GLA-123';

    paymentDetails.settlementDetails = [
      {
        requestType: 'BUYLOAD',
        mobileNumber: '09171234567',
        transactions: [],
      },
    ];

    loyaltyPointsSimulatorStub.resolves({ results: { pointsEarned: 100 } });

    const res = await handleLoyaltyPoints(
      reqMock,
      paymentDetails,
      null,
      responseMock
    );

    Sinon.assert.calledOnce(loyaltyPointsSimulatorStub);
    expect(res.pointsEarned).to.equal(100);
  });

  it('should invoke loyalty for BUY_PROMO with serviceId transaction', async () => {
    paymentDetails.tokenPaymentId = 'GLA-123';

    paymentDetails.settlementDetails = [
      {
        requestType: 'BUYPROMO',
        mobileNumber: '09171234567',
        transactions: [{ serviceId: 'service-1' }],
      },
    ];

    loyaltyPointsSimulatorStub.resolves({ results: { pointsEarned: 50 } });

    const res = await handleLoyaltyPoints(
      reqMock,
      paymentDetails,
      null,
      responseMock
    );

    Sinon.assert.calledOnce(loyaltyPointsSimulatorStub);
    expect(res.pointsEarned).to.equal(50);
  });
});
