import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { config } from '../../../convict/config.js';
import { getPaymentSessionService } from '../../../src/services/v1/index.js';
import { constants } from '../../../src/util/index.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Service :: getPaymentSessionService :: getPaymentSession', () => {
  let reqMock;
  let findOneStub;
  let checkQuestIndicatorStub;
  let handleLoyaltyPointsStub;
  let originalEnv;

  beforeEach(() => {
    originalEnv = config.get('nodeEnv');
    reqMock = {
      headers: { deviceid: 'device-123' },
      params: { tokenPaymentId: 'token-123' },
      mongo: {
        customerPaymentsRepository: {
          findOne: Sinon.stub(),
        },
      },
      questIndicatorService: {
        checkQuestIndicator: Sinon.stub(),
      },
      paymentLoyaltyService: {
        handleLoyaltyPoints: Sinon.stub(),
      },
      app: { dataDictionary: {} },
    };

    findOneStub = reqMock.mongo.customerPaymentsRepository.findOne;
    checkQuestIndicatorStub = reqMock.questIndicatorService.checkQuestIndicator;
    handleLoyaltyPointsStub = reqMock.paymentLoyaltyService.handleLoyaltyPoints;
  });

  afterEach(() => {
    Sinon.restore();
    config.nodeEnv = originalEnv;
  });

  it('should throw ResourceNotFound if paymentDetails not found', async () => {
    findOneStub.resolves(null);

    try {
      await getPaymentSessionService.getPaymentSession(reqMock);
    } catch (err) {
      expect(err.type).to.equal('ResourceNotFound');
      expect(err.details).to.equal('Payment Id not found.');
    }
  });

  it('should throw InternalOperationFailed for unexpected errors', async () => {
    findOneStub.rejects(new Error('DB failure'));

    try {
      await getPaymentSessionService.getPaymentSession(reqMock);
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err.type).to.equal('InternalOperationFailed');
    }
  });

  it('should not call questIndicatorService in production', async () => {
    Sinon.stub(config, 'get').withArgs('nodeEnv').returns('production');

    const paymentDetails = {
      tokenPaymentId: 'GLA-123',
      settlementDetails: [
        {
          requestType: constants.PAYMENT_REQUEST_TYPES.PAY_BILLS,
          statusRemarks: 'OK',
        },
      ],
    };
    findOneStub.resolves(paymentDetails);

    await getPaymentSessionService.getPaymentSession(reqMock);

    Sinon.assert.notCalled(checkQuestIndicatorStub);
  });

  it('should call questIndicatorService and handleLoyaltyPoints in non-production for GLA token', async () => {
    Sinon.stub(config, 'get').withArgs('nodeEnv').returns('development');

    const paymentDetails = {
      tokenPaymentId: 'GLA-123',
      settlementDetails: [
        {
          requestType: constants.PAYMENT_REQUEST_TYPES.PAY_BILLS,
          statusRemarks: 'OK',
        },
      ],
      headers: {},
    };
    findOneStub.resolves(paymentDetails);
    handleLoyaltyPointsStub.resolves({ success: true });

    const res = await getPaymentSessionService.getPaymentSession(reqMock);

    Sinon.assert.calledOnce(checkQuestIndicatorStub);
    Sinon.assert.calledOnce(handleLoyaltyPointsStub);
    expect(res).to.equal({ success: true });
  });

  it('should call handleLoyaltyPoints with clientName when available', async () => {
    Sinon.stub(config, 'get').withArgs('nodeEnv').returns('development');

    const paymentDetails = {
      tokenPaymentId: 'GLA-456',
      settlementDetails: [
        {
          requestType: constants.PAYMENT_REQUEST_TYPES.PAY_BILLS,
          statusRemarks: 'OK',
        },
      ],
      headers: { clientName: 'MyClient' },
    };

    findOneStub.resolves(paymentDetails);
    handleLoyaltyPointsStub.resolves({ success: true });

    await getPaymentSessionService.getPaymentSession(reqMock);

    Sinon.assert.calledWith(
      handleLoyaltyPointsStub,
      reqMock,
      paymentDetails,
      'MyClient',
      Sinon.match.object
    );
  });

  it('should throw InternalOperationFailed if handleLoyaltyPoints fails unexpectedly', async () => {
    Sinon.stub(config, 'get').withArgs('nodeEnv').returns('development');

    const paymentDetails = {
      tokenPaymentId: 'GLA-999',
      settlementDetails: [
        {
          requestType: constants.PAYMENT_REQUEST_TYPES.PAY_BILLS,
          statusRemarks: 'OK',
        },
      ],
      headers: { clientName: 'MyClient' },
    };
    findOneStub.resolves(paymentDetails);
    handleLoyaltyPointsStub.rejects(new Error('loyalty error'));

    try {
      await getPaymentSessionService.getPaymentSession(reqMock);
      throw new Error('Expected to fail');
    } catch (err) {
      expect(err.type).to.equal('InternalOperationFailed');
    }
  });
});
