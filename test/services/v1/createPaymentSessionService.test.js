import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import sinon from 'sinon';
import { createPaymentSession } from '../../../src/services/v1/createPaymentSessionService.js';

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
            requestType: 'BuyPromo',
            mobileNumber: '09123456789',
            voucher: { code: 'PROMO100', category: 'LOAD' },
            transactions: [{ amount: 100 }],
          },
        ],
      },
      validationService: { validatePaymentInformation: sinon.stub() },
      paymentAuthService: { getAuthorizationToken: sinon.stub() },
      paymentRequestService: { preProcessPaymentInfo: sinon.stub() },
      payo: { paymentServiceRepository: { createPayment: sinon.stub() } },
      mongo: { customerPaymentsRepository: { create: sinon.stub() } },
      loyaltyService: { handleLoyaltyPoints: sinon.stub() },
    };
  });

  afterEach(() => sinon.restore());

  it('should successfully create a payment session', async () => {
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
    req.mongo.customerPaymentsRepository.create.resolves();
    req.loyaltyService.handleLoyaltyPoints.resolves();

    const result = await createPaymentSession(req);

    expect(result.statusCode).to.equal(201);
    expect(result.result.tokenPaymentId).to.equal('PYO1234567890');
    expect(req.mongo.customerPaymentsRepository.create.calledOnce).to.be.true();
    expect(req.loyaltyService.handleLoyaltyPoints.calledOnce).to.be.true();
  });

  it('should throw error if validatePaymentInformation fails', async () => {
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

  it('should throw error if getAuthorizationToken fails', async () => {
    const mockError = { type: 'OperationFailed' };
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

    req.validationService.validatePaymentInformation.resolves();
    req.paymentAuthService.getAuthorizationToken.resolves('mockAccessToken');
    req.paymentRequestService.preProcessPaymentInfo.resolves({});
    req.payo.paymentServiceRepository.createPayment.resolves(mockResponse);
    req.mongo.customerPaymentsRepository.create.rejects(new Error('DB Error'));

    await expect(createPaymentSession(req)).to.reject(Error, 'DB Error');
  });
});
