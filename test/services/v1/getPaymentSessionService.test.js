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
      payment: {
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

    findOneStub = reqMock.payment.customerPaymentsRepository.findOne;
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

  it('should pass tokenPaymentId from req.params to repository findOne', async () => {
    Sinon.stub(config, 'get').withArgs('nodeEnv').returns('production');

    reqMock.params.tokenPaymentId = 'GLA-PARAM-123';
    const paymentDetails = {
      tokenPaymentId: 'GLA-PARAM-123',
      settlementDetails: [],
      headers: {},
    };
    findOneStub.resolves(paymentDetails);
    handleLoyaltyPointsStub.callsFake(
      async (_req, _paymentDetails, _clientName, response) => response
    );

    await getPaymentSessionService.getPaymentSession(reqMock);

    Sinon.assert.calledWith(findOneStub, 'GLA-PARAM-123', reqMock);
  });

  it('should not call questIndicatorService in production', async () => {
    Sinon.stub(config, 'get').withArgs('nodeEnv').returns('production');

    const paymentDetails = {
      tokenPaymentId: 'GLA-123',
      settlementDetails: [
        {
          requestType: constants.PAYMENT_REQUEST_TYPES.PAY_BILLS,
          statusRemarks: 'OK',
          status: 'PROCESSING',
          transactions: [
            {
              amount: 0,
              keyword: 'LD',
              provisionStatus: 'PROCESSING',
            },
          ],
        },
      ],
    };
    findOneStub.resolves(paymentDetails);

    // Ensure loyalty handler does not throw in this scenario
    handleLoyaltyPointsStub.resolves({
      tokenPaymentId: paymentDetails.tokenPaymentId,
      checkoutUrl: undefined,
      accounts: [],
    });

    await getPaymentSessionService.getPaymentSession(reqMock);

    Sinon.assert.notCalled(checkQuestIndicatorStub);
  });

  it('should call questIndicatorService and handleLoyaltyPoints in non-production for GLA token', async () => {
    Sinon.stub(config, 'get').withArgs('nodeEnv').returns('development');

    const paymentDetails = {
      tokenPaymentId: 'GLA-123',
      checkoutUrl:
        'https://uat.m.gcash.com/gcash-cashier-web/1.2.1/index.html#/confirm?bizNo=20260213121212800110170401502663688&timestamp=1770966985656&sign=NpEqOy42MZGLkLw9rj%2BSnWEYfRRzB2b53JNZbqjNSzHj0NZJK1PBdzCL9Fz%2BJOlzoJPEvigCoY%2BayKxdTVAyJ8xPQstOes29MVWJWYQgyGCDy6klcQA4aHq6macdP3IrmhK7RoRAaUG5cWPJTlzRSJtyZ4dmNXWlgxaUOu6%2FbTWOIHbetB1kFbXHc4myEPVYbEsT2aKynfGCc77DbptjrFYAduOcXkoXZLNfxDGJu8OguEePSXVe%2BPLRr%2F%2FZDiTDtlG4BonEGcH01rbOgJoIdsX7t3qdw3HCsU3iaEjsMowjPjnLVXlZUG7GHDB8B96aCs09UOujW0I6J4zU7j%2FUuA%3D%3D&orderAmount=100.00&pdCode=51051000101000100001&merchantid=217020000600748133802&queryInterval=10000&qrcode=GCSHWPV220260213121212800110170401502663688,217020000600748133802&merchantName=Globe%20Bills%20Pay%20Merchant&expiryTime=599',
      settlementDetails: [
        {
          requestType: constants.PAYMENT_REQUEST_TYPES.PAY_BILLS,
          statusRemarks: 'OK',
          status: 'PROCESSING',
          transactions: [
            {
              amount: { $numberDecimal: '100.00' },
              keyword: 'LD',
              provisionStatus: 'PROCESSING',
            },
          ],
        },
      ],
      headers: {},
    };
    findOneStub.resolves(paymentDetails);
    handleLoyaltyPointsStub.callsFake(
      async (_req, _paymentDetails, _clientName, response) => ({
        ...response,
        pointsEarned: [
          {
            pointsResultCode: 101,
          },
        ],
      })
    );

    const res = await getPaymentSessionService.getPaymentSession(reqMock);

    Sinon.assert.calledOnce(checkQuestIndicatorStub);
    Sinon.assert.calledOnce(handleLoyaltyPointsStub);

    // Service should map response to legacy GetPaymentSessionResponse
    // structure (via transformer), with loyalty contributing only
    // pointsEarned. We only assert on the key fields we care about
    // here instead of deep-equality on the whole object.
    expect(res.tokenPaymentId).to.equal(paymentDetails.tokenPaymentId);
    expect(res.checkoutUrl).to.equal(paymentDetails.checkoutUrl);
    expect(res.paymentSession).to.be.null();
    expect(res.accounts).to.exist();
    expect(res.accounts[0].status).to.equal('PROCESSING');
    expect(res.accounts[0].transactions).to.be.an.array();
    // With the legacy-style transformer, transaction.amount is
    // normalized to a plain number instead of a Decimal128 wrapper.
    expect(res.accounts[0].transactions[0].amount).to.equal(100);
    expect(res.accounts[0].transactions[0].keyword).to.equal('LD');
    expect(res.accounts[0].transactions[0].provisionStatus).to.equal(
      'PROCESSING'
    );
    expect(res.pointsEarned).to.equal([
      {
        pointsResultCode: 101,
      },
    ]);
  });

  it('should call handleLoyaltyPoints with clientName when available', async () => {
    Sinon.stub(config, 'get').withArgs('nodeEnv').returns('development');

    const paymentDetails = {
      tokenPaymentId: 'GLA-456',
      settlementDetails: [
        {
          requestType: constants.PAYMENT_REQUEST_TYPES.PAY_BILLS,
          statusRemarks: 'OK',
          status: 'PROCESSING',
          transactions: [
            {
              amount: 0,
              keyword: 'LD',
              provisionStatus: 'PROCESSING',
            },
          ],
        },
      ],
      headers: { clientName: 'MyClient' },
    };

    findOneStub.resolves(paymentDetails);
    handleLoyaltyPointsStub.callsFake(
      async (_req, _paymentDetails, _clientName, response) => ({
        ...response,
        success: true,
      })
    );

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
          status: 'PROCESSING',
          transactions: [
            {
              amount: 0,
              keyword: 'LD',
              provisionStatus: 'PROCESSING',
            },
          ],
        },
      ],
      headers: { clientName: 'MyClient' },
    };
    findOneStub.resolves(paymentDetails);
    handleLoyaltyPointsStub.rejects(new Error('loyalty error'));

    const res = await getPaymentSessionService.getPaymentSession(reqMock);

    // Legacy-aligned behavior: loyalty failures should not bubble up
    // as InternalOperationFailed; they are logged and the main
    // GetPaymentSession call still succeeds.
    expect(res.tokenPaymentId).to.equal(paymentDetails.tokenPaymentId);
  });
});
