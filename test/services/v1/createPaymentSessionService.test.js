import logger from '@globetel/cxs-core/core/logger/logger.js';
import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import sinon from 'sinon';
import { config } from '../../../convict/config.js';
import { createPaymentSession } from '../../../src/services/v1/createPaymentSessionService.js';
import { constants } from '../../../src/util/index.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;
export { lab };

describe('Service :: v1 :: createPaymentSessionService :: createPaymentSession', () => {
  let req;

  beforeEach(() => {
    req = {
      app: {
        principalId: 'client-001',
        channel: 'NG1',
      },
      headers: {
        Authorization: 'Bearer someAuthToken',
        'user-token':
          'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiIsImtpZCI6ImViYjk2YjU4ZjVkZGYyYzdkMmU0ZmVjOTJiNWQ4MTg2In0.eyJ1dWlkIjoiYTdkNTUyMTYtZjRmMC00NGY5LWE4YWMtZjk3OTgzN2MyMmMzIiwicmVmcmVzaFRva2VuIjoiYXNkc2FkIiwiYWNjZXNzVG9rZW4iOiJzYWQiLCJpc3MiOiJDWFMiLCJtb2JpbGVOdW1iZXJWZXJpZmljYXRpb25EYXRlIjoiMjAyMy0xMS0wMlQxNDozODowMi41NDMrMDg6MDAiLCJyZWdpc3RyYXRpb25Nb2JpbGVOdW1iZXIiOiIwOTI3MDAxMTkxMCIsImlhdCI6MTc2MTcyODU5OCwiZXhwIjoxNzYxODE0OTk4fQ.nDazaAs4DAdIOhBVA_vCXDUNa1_K7vx3bZWx8ZB37s5DyFBX-XccI2jayo1LnOE5syvkbd8X6BV3_JpJ9UOijA',
      },
      payload: {
        paymentType: 'GCASH',
        currency: 'PHP',
        countryCode: 'PH',
        paymentInformation: {
          environmentInformation: {
            orderTerminalType: 'POS',
            terminalType: 'MOBILE',
          },
          notificationUrls: [
            { type: 'NOTIFICATION', url: 'https://callback.url' },
          ],
          order: { orderTitle: 'Promo Load' },
        },
        settlementInformation: [
          {
            amount: 100,
            transactionType: 'G',
            requestType: constants.PAYMENT_REQUEST_TYPES.BBPREPAIDPROMO,
            mobileNumber: '09123456789',
            voucher: { code: 'PROMO100', category: 'LOAD' },
            // Include serviceId to satisfy legacy gating for BUY_PROMO
            transactions: [{ amount: 100, serviceId: 'svc-001' }],
          },
        ],
      },
      validationService: { validatePaymentInformation: sinon.stub() },
      paymentAuthService: { getAuthorizationToken: sinon.stub() },
      paymentRequestService: { preProcessPaymentInfo: sinon.stub() },
      payo: { paymentServiceRepository: { createPayment: sinon.stub() } },
      mongo: { customerPaymentsRepository: { create: sinon.stub() } },
      payment: { customerPaymentsRepository: { create: sinon.stub() } },
      paymentLoyaltyService: { handleLoyaltyPoints: sinon.stub() },
      loyaltyService: { handleLoyaltyPoints: sinon.stub() },
    };
  });

  afterEach(() => sinon.restore());

  it('should successfully create a payment session', async () => {
    sinon
      .stub(config, 'get')
      .withArgs('dnoClientId')
      .returns('mock-dno-client');
    const accessToken = 'mockAccessToken';
    const mockPaymentRequest = { mock: 'request' };
    const mockPaymentResponse = {
      status: 200,
      data: { paymentId: 'PYO1234567890' },
    };

    req.validationService.validatePaymentInformation.resolves();
    req.paymentAuthService.getAuthorizationToken.resolves(accessToken);
    req.paymentRequestService.preProcessPaymentInfo.resolves(
      mockPaymentRequest
    );
    req.payo.paymentServiceRepository.createPayment.resolves(
      mockPaymentResponse
    );
    req.payment.customerPaymentsRepository.create.resolves();
    // Loyalty is scenario-gated; base success case does not assert on it.
    req.paymentLoyaltyService.handleLoyaltyPoints.resolves();

    const result = await createPaymentSession(req);

    // Basic assertions on success and tokenPaymentId
    expect(result.statusCode).to.equal(201);
    expect(result.result.tokenPaymentId).to.equal('PYO1234567890');

    // Ensure downstream call receives the Authorization header.
    expect(
      req.payo.paymentServiceRepository.createPayment.calledOnce
    ).to.be.true();
    const [arg] =
      req.payo.paymentServiceRepository.createPayment.firstCall.args;
    expect(arg.headers.authorization).to.equal(`Bearer ${accessToken}`);
    // Ensure we pass an OBJECT request body (not a JSON string), otherwise Axios
    // GET wrapper would blow up with `target must be an object`.
    expect(arg.body).to.be.an.object();
    expect(
      req.payment.customerPaymentsRepository.create.calledOnce
    ).to.be.true();
    // We don't assert on handleLoyaltyPoints invocation here because
    // the loyalty gating logic is covered by integration behavior and
    // may vary depending on request shape.
  });

  it('should include pointsEarned when channel is superapp + requestType BuyPromo + at least 1 transaction has serviceId', async () => {
    sinon
      .stub(config, 'get')
      .withArgs('dnoClientId')
      .returns('mock-dno-client');

    // satisfy CreatePaymentSession loyalty gating
    req.app.channel = constants.CHANNELS.NG1; // 'superapp'
    req.headers.clientName = constants.CHANNELS.NG1;
    req.payload.settlementInformation[0].requestType =
      constants.PAYMENT_REQUEST_TYPES.BUY_PROMO; // 'BuyPromo'
    req.payload.settlementInformation[0].transactionType = 'N';
    req.payload.settlementInformation[0].transactions = [
      { amount: 100, serviceId: 'svc-001' },
    ];

    const accessToken = 'mockAccessToken';
    req.validationService.validatePaymentInformation.resolves();
    req.paymentAuthService.getAuthorizationToken.resolves(accessToken);
    req.paymentRequestService.preProcessPaymentInfo.resolves({});
    req.payo.paymentServiceRepository.createPayment.resolves({
      status: 200,
      data: { paymentId: 'PYO1234567890' },
    });
    req.payment.customerPaymentsRepository.create.resolves();

    // Loyalty: simulate that downstream produced pointsEarned.
    // The implementation mutates `response` argument.
    req.paymentLoyaltyService.handleLoyaltyPoints.callsFake(
      async (_req, paymentDetails, _clientName, response) => {
        // Ensure we received the *full* entity (transactions keep serviceId)
        expect(
          paymentDetails.settlementDetails[0].transactions[0].serviceId
        ).to.equal('svc-001');
        response.pointsEarned = [10];
        return response;
      }
    );

    const result = await createPaymentSession(req);
    expect(result.statusCode).to.equal(201);
    expect(result.result.pointsEarned).to.equal([10]);
  });

  it('should throw error if validatePaymentInformation fails', async () => {
    sinon
      .stub(config, 'get')
      .withArgs('dnoClientId')
      .returns('mock-dno-client');
    const mockError = { type: 'ValidationError' };
    req.validationService.validatePaymentInformation.rejects(mockError);

    try {
      await createPaymentSession(req);
      throw new Error('Expected rejection');
    } catch (err) {
      expect(err).to.equal(mockError);
      expect(err.type).to.equal('ValidationError');
    }
  });

  it('should log CREATE_PAYMENT_SESSION_FAILED with requestId from req.info.id and messageId from payload.messageId', async () => {
    sinon.stub(logger, 'error');

    // Populate correlation IDs
    req.info = { id: 'REQ-INFO-ID-123' };
    req.payload.messageId = 'MSG-ID-123';

    const mockError = { type: 'ValidationError', message: 'boom' };
    req.validationService.validatePaymentInformation.rejects(mockError);

    await expect(createPaymentSession(req)).to.reject();

    expect(logger.error.calledOnce).to.be.true();
    const [eventName, payload] = logger.error.firstCall.args;
    expect(eventName).to.equal('CREATE_PAYMENT_SESSION_FAILED');
    expect(payload.requestId).to.equal('REQ-INFO-ID-123');
    expect(payload.messageId).to.equal('MSG-ID-123');
    expect(payload.error.type).to.equal('ValidationError');
  });

  it('should log CREATE_PAYMENT_SESSION_FAILED with requestId from headers[x-request-id] and messageId from payload.message_id', async () => {
    sinon.stub(logger, 'error');

    req.headers['x-request-id'] = 'HDR-REQ-ID-999';
    req.payload.message_id = 'MSG_ID_999';

    const mockError = { type: 'OperationFailed', message: 'auth failed' };
    sinon
      .stub(config, 'get')
      .withArgs('dnoClientId')
      .returns('mock-dno-client');

    req.validationService.validatePaymentInformation.resolves();
    req.paymentAuthService.getAuthorizationToken.rejects(mockError);

    await expect(createPaymentSession(req)).to.reject();

    expect(logger.error.calledOnce).to.be.true();
    const [eventName, payload] = logger.error.firstCall.args;
    expect(eventName).to.equal('CREATE_PAYMENT_SESSION_FAILED');
    expect(payload.requestId).to.equal('HDR-REQ-ID-999');
    expect(payload.messageId).to.equal('MSG_ID_999');
    expect(payload.error.type).to.equal('OperationFailed');
  });

  it('should throw error if getAuthorizationToken fails', async () => {
    const mockError = { type: 'OperationFailed' };
    sinon
      .stub(config, 'get')
      .withArgs('dnoClientId')
      .returns('mock-dno-client');
    req.validationService.validatePaymentInformation.resolves();
    req.paymentAuthService.getAuthorizationToken.rejects(mockError);

    try {
      await createPaymentSession(req);
      throw new Error('Expected rejection');
    } catch (err) {
      expect(err).to.equal(mockError);
      expect(err.type).to.equal('OperationFailed');
    }
  });

  it('should throw error if createPayment fails', async () => {
    const mockError = { type: 'InternalOperationFailed' };
    sinon
      .stub(config, 'get')
      .withArgs('dnoClientId')
      .returns('mock-dno-client');
    req.validationService.validatePaymentInformation.resolves();
    req.paymentAuthService.getAuthorizationToken.resolves('mockAccessToken');
    req.paymentRequestService.preProcessPaymentInfo.resolves({ mock: 'req' });
    req.payo.paymentServiceRepository.createPayment.rejects(mockError);

    try {
      await createPaymentSession(req);
      throw new Error('Expected rejection');
    } catch (err) {
      expect(err).to.equal(mockError);
      expect(err.type).to.equal('InternalOperationFailed');
    }
  });

  it('should throw error if mongo create fails', async () => {
    const mockResponse = {
      status: 200,
      data: { paymentId: 'PYO1234567890' },
    };

    sinon
      .stub(config, 'get')
      .withArgs('dnoClientId')
      .returns('mock-dno-client');

    req.validationService.validatePaymentInformation.resolves();
    req.paymentAuthService.getAuthorizationToken.resolves('mockAccessToken');
    req.paymentRequestService.preProcessPaymentInfo.resolves({});
    req.payo.paymentServiceRepository.createPayment.resolves(mockResponse);
    req.payment.customerPaymentsRepository.create.rejects(
      new Error('DB Error')
    );

    await expect(createPaymentSession(req)).to.reject(Error, 'DB Error');
  });
});
