import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import esmock from 'esmock';
import Sinon from 'sinon';

const lab = Lab.script();
const { describe, it, before, beforeEach, afterEach } = lab;

export { lab };

let handleLoyaltyPoints;

before(async () => {
  // Mock config.get('lambda') so that loyaltyPointsSimulator is treated as migrated
  const mockedModule = await esmock(
    '../../../src/services/v1/paymentLoyaltyService.js',
    {
      '../../../convict/config.js': {
        config: {
          get: (key) => {
            if (key === 'lambda') {
              return {
                migratedLambdas: ['LOYALTY_POINTS_SIMULATOR'],
                loyaltyPointsSimulator: { name: 'LOYALTY_POINTS_SIMULATOR' },
              };
            }

            throw new Error(`Unexpected config.get key in test: ${key}`);
          },
        },
      },
    }
  );

  ({ handleLoyaltyPoints } = mockedModule);
});

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

    loyaltyPointsSimulatorStub.resolves({ result: { pointsEarned: 100 } });

    const res = await handleLoyaltyPoints(
      reqMock,
      paymentDetails,
      null,
      responseMock
    );

    Sinon.assert.calledOnce(loyaltyPointsSimulatorStub);
    expect(res.pointsEarned).to.equal([100]);
  });

  it('should support AWS lambda response shape: API gateway proxy with body as stringified json', async () => {
    // Re-import with lambda NOT migrated so we hit AWS_LAMBDA path.
    const { handleLoyaltyPoints: awsHandleLoyaltyPoints } = await esmock(
      '../../../src/services/v1/paymentLoyaltyService.js',
      {
        '../../../convict/config.js': {
          config: {
            get: (key) => {
              if (key === 'lambda') {
                return {
                  migratedLambdas: [],
                  loyaltyPointsSimulator: { name: 'LOYALTY_POINTS_SIMULATOR' },
                };
              }

              throw new Error(`Unexpected config.get key in test: ${key}`);
            },
          },
        },
      }
    );

    const invokeLambda = Sinon.stub().resolves({
      StatusCode: 200,
      Payload: Buffer.from(
        JSON.stringify({
          statusCode: 200,
          body: JSON.stringify({ result: { pointsEarned: 123 } }),
        })
      ),
    });

    const req = {
      ...reqMock,
      invokeLambda,
      serviceHelpers: {
        lambdaService: {
          loyaltyPointsSimulatorLambda: ({ invokeLambda }) => invokeLambda(),
        },
      },
    };

    paymentDetails.tokenPaymentId = 'GLA-123';
    paymentDetails.settlementDetails = [
      {
        requestType: 'BUYLOAD',
        mobileNumber: '09171234567',
        transactions: [],
      },
    ];

    const res = await awsHandleLoyaltyPoints(req, paymentDetails, null, {});
    expect(res.pointsEarned).to.equal([123]);
  });

  it('should support AWS lambda response shape: API gateway proxy with body as array', async () => {
    const { handleLoyaltyPoints: awsHandleLoyaltyPoints } = await esmock(
      '../../../src/services/v1/paymentLoyaltyService.js',
      {
        '../../../convict/config.js': {
          config: {
            get: (key) => {
              if (key === 'lambda') {
                return {
                  migratedLambdas: [],
                  loyaltyPointsSimulator: { name: 'LOYALTY_POINTS_SIMULATOR' },
                };
              }

              throw new Error(`Unexpected config.get key in test: ${key}`);
            },
          },
        },
      }
    );

    const invokeLambda = Sinon.stub().resolves({
      StatusCode: 200,
      Payload: Buffer.from(
        JSON.stringify({
          statusCode: 200,
          body: [{ serviceId: '11656', points: 0 }],
        })
      ),
    });

    const req = {
      ...reqMock,
      invokeLambda,
      serviceHelpers: {
        lambdaService: {
          loyaltyPointsSimulatorLambda: ({ invokeLambda }) => invokeLambda(),
        },
      },
    };

    paymentDetails.tokenPaymentId = 'GLA-123';
    paymentDetails.settlementDetails = [
      {
        requestType: 'BUYPROMO',
        mobileNumber: '09171234567',
        transactions: [{ serviceId: '11656' }],
      },
    ];

    const res = await awsHandleLoyaltyPoints(req, paymentDetails, null, {});
    expect(res.pointsEarned).to.equal([{ serviceId: '11656', points: 0 }]);
  });

  it('should include pointsEarned when downstream returns 0', async () => {
    paymentDetails.tokenPaymentId = 'GLA-123';

    paymentDetails.settlementDetails = [
      {
        requestType: 'BUYPROMO',
        mobileNumber: '09171234567',
        transactions: [{ serviceId: 'service-1' }],
      },
    ];

    loyaltyPointsSimulatorStub.resolves({ result: { pointsEarned: 0 } });

    const res = await handleLoyaltyPoints(
      reqMock,
      paymentDetails,
      null,
      responseMock
    );

    Sinon.assert.calledOnce(loyaltyPointsSimulatorStub);
    expect(res.pointsEarned).to.equal([0]);
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

    loyaltyPointsSimulatorStub.resolves({ result: { pointsEarned: 50 } });

    const res = await handleLoyaltyPoints(
      reqMock,
      paymentDetails,
      null,
      responseMock
    );

    Sinon.assert.calledOnce(loyaltyPointsSimulatorStub);
    expect(res.pointsEarned).to.equal([50]);
  });
});
