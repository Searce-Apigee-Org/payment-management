import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import {
  createWebPaymentSessionRequest,
  insertWebPaymentSessionToDB,
} from '../../../src/services/helpers/webPaymentSessionService.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;
export { lab };

const mockConstants = {
  WEBPAYMENT_CONSTANTS: {
    BBPREPAIDPROMO_REQ_TYPE_VAL: 'BBPrepaidPromo',
    BBPREPAIDPROMO_DEFAULT_PAYMENT_TYPE: 'ECPay',
    DEFAULT_PAYMENT_TYPE: 'CARD',
    DEFAULT_PAYMENT_SESSION_VERSION: '1.0.0',
    DEFAULT_SETTLEMENT_STATUS: 'PROCESSING',
    DEFAULT_PROVISION_STATUS: 'PROCESSING',
    DEFAULT_ENTITY_STATUS: 'PROCESSING',
    TIME_OFFSET: '+08:00',
    DATE_FORMAT: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
  },
};

const mockMomentChain = {
  utcOffset: Sinon.stub().returns({
    format: Sinon.stub().returns('2025-10-18T19:24:55.000+08:00'),
  }),
};
const mockMoment = Sinon.stub().returns(mockMomentChain);
mockMoment.utc = Sinon.stub().returns(mockMomentChain);

describe('Service :: paymentSessionHelper', () => {
  let reqMock;
  let paramsMock;

  beforeEach(() => {
    mockMoment.utc.resetHistory();

    reqMock = {
      uuid: 'abc-def',
      gPayOAccessToken: 'mock-access-token',
      http: {},
      headers: { 'user-token': 'user-token-456' },
      payload: {
        customerInfo: { customerId: 'cust-001', customerName: 'Jane Doe' },
        settlementInfo: {
          breakdown: [
            {
              transactionType: 'G',
              requestType: 'BuyLoad',
              amount: 100,
              mobileNumber: '639171234567',
              transactions: [{ amount: 100, keyword: 'LOAD10' }],
            },
          ],
        },
        allowedPaymentMethods: ['CARD'],
        notificationUrls: {
          successUrl: 'https://success.url',
          failureUrl: 'https://fail.url',
        },
      },
      payoT2: {
        paymentServiceRepository: {
          createWebSessionT2: Sinon.stub().resolves({
            result: {
              paymentId: 'PAY123',
              webSessionUrl: 'https://mock.url/session',
              authorization: 'auth-token',
              ttl: 3600,
            },
          }),
        },
      },
    };

    paramsMock = {
      principalId: 'principal-123',
      headers: reqMock.headers,
      payload: reqMock.payload,
      moment: mockMoment,
      constants: mockConstants,
      gPayOWebSessionResponse: {
        paymentId: 'PAY123',
      },
      mongo: {
        customerPaymentsRepository: {
          put: Sinon.stub().resolves({}),
        },
      },
    };
  });

  afterEach(() => {
    Sinon.restore();
  });

  describe('createWebPaymentSessionRequest', () => {
    it('should successfully call GPayO API with correct payload and return result', async () => {
      // Add email to the breakdown
      reqMock.payload.settlementInfo.breakdown[0].emailAddress =
        'test@example.com';
      reqMock.payload.settlementInfo.breakdown[0].accountId = '639171234567';

      const result = await createWebPaymentSessionRequest(reqMock);
      const expectedGPayOPayload = {
        customerInfos: { customerId: reqMock.uuid, customerName: 'Jane Doe' },
        settlementInfos: {
          breakdown: [
            {
              amountValue: 100,
              transactionType: 'G',
              accountId: '639171234567', // G-type uses full mobileNumber as accountId
              emailAddress: 'test@example.com',
            },
          ],
        },
        allowedPaymentMethods: ['CARD'],
        redirectUrls: reqMock.payload.notificationUrls,
      };

      expect(result).to.equal({
        paymentId: 'PAY123',
        webSessionUrl: 'https://mock.url/session',
        authorization: 'auth-token',
        ttl: 3600,
      });
      expect(
        reqMock.payoT2.paymentServiceRepository.createWebSessionT2.calledOnce
      ).to.be.true();
      expect(
        reqMock.payoT2.paymentServiceRepository.createWebSessionT2.firstCall
          .args[1]
      ).to.equal(expectedGPayOPayload);
      expect(
        reqMock.payoT2.paymentServiceRepository.createWebSessionT2.firstCall
          .args[2]
      ).to.equal({ Authorization: 'Bearer mock-access-token' });
    });

    it('should correctly format mobileNumber for non-G transaction types', async () => {
      reqMock.payload.settlementInfo.breakdown[0] = {
        amount: 50,
        transactionType: 'P', // Non-G type
        mobileNumber: '639987654321',
      };
      reqMock.payoT2.paymentServiceRepository.createWebSessionT2.resolves({
        result: {},
      });

      await createWebPaymentSessionRequest(reqMock);

      const callPayload =
        reqMock.payoT2.paymentServiceRepository.createWebSessionT2.firstCall
          .args[1];

      // Assert mobile number is sliced to last 10 digits and converted to Number
      expect(callPayload.settlementInfos.breakdown[0].mobileNumber).to.equal(
        9987654321
      );
    });

    it('should use explicit accountId for non-G transaction types when provided', async () => {
      reqMock.payload.settlementInfo.breakdown[0] = {
        amount: 75,
        transactionType: 'N', // Non-G type
        mobileNumber: '639999999999',
        accountId: 'ACC-12345',
      };
      reqMock.payoT2.paymentServiceRepository.createWebSessionT2.resolves({
        result: {},
      });

      await createWebPaymentSessionRequest(reqMock);

      const callPayload =
        reqMock.payoT2.paymentServiceRepository.createWebSessionT2.firstCall
          .args[1];

      // For non-G types, accountId should be preserved
      expect(callPayload.settlementInfos.breakdown[0].accountId).to.equal(
        'ACC-12345'
      );
    });

    it('should throw the error object if API call fails', async () => {
      const mockError = { code: 400, message: 'GPayO API failed' };

      reqMock.payoT2.paymentServiceRepository.createWebSessionT2.resolves({
        error: mockError,
      });

      let thrownError;
      try {
        await createWebPaymentSessionRequest(reqMock);
      } catch (err) {
        thrownError = err;
      }

      expect(thrownError).to.exist();

      expect(thrownError).to.equal(mockError);
    });

    it('should handle missing notification URLs', async () => {
      delete reqMock.payload.notificationUrls;

      await createWebPaymentSessionRequest(reqMock);

      const callPayload =
        reqMock.payoT2.paymentServiceRepository.createWebSessionT2.firstCall
          .args[1];
      // Should be { successUrl: undefined, failureUrl: undefined }
      expect(callPayload.redirectUrls).to.equal({
        successUrl: undefined,
        failureUrl: undefined,
      });
    });

    it('should handle both notification URLs present', async () => {
      reqMock.payload.notificationUrls = {
        successUrl: 'https://success.url',
        failureUrl: 'https://fail.url',
      };
      await createWebPaymentSessionRequest(reqMock);
      const callPayload =
        reqMock.payoT2.paymentServiceRepository.createWebSessionT2.firstCall
          .args[1];
      expect(callPayload.redirectUrls).to.equal({
        successUrl: 'https://success.url',
        failureUrl: 'https://fail.url',
      });
    });

    it('should handle payment session with createOrderExternal and entityIds', async () => {
      paramsMock.payload.settlementInfo.breakdown[0].createOrderExternal = [
        {
          entityIds: [{ id: 'entity1' }, { id: 'entity2' }],
        },
      ];

      await insertWebPaymentSessionToDB(paramsMock);

      const insertedDoc =
        paramsMock.mongo.customerPaymentsRepository.put.firstCall.args[0];
      const settlementDetail = insertedDoc.settlementDetails[0];

      expect(
        settlementDetail.createOrderExternal[0].entityIds[0].status
      ).to.equal(mockConstants.WEBPAYMENT_CONSTANTS.DEFAULT_ENTITY_STATUS);
      expect(
        settlementDetail.createOrderExternal[0].entityIds[1].status
      ).to.equal(mockConstants.WEBPAYMENT_CONSTANTS.DEFAULT_ENTITY_STATUS);
    });

    it('should handle missing user token in headers', async () => {
      delete paramsMock.headers['user-token'];

      await insertWebPaymentSessionToDB(paramsMock);

      const insertedDoc =
        paramsMock.mongo.customerPaymentsRepository.put.firstCall.args[0];
      expect(insertedDoc.userToken).to.not.exist();
    });

    it('should use landline when accountId is empty string for G-type', async () => {
      reqMock.payload.settlementInfo.breakdown[0] = {
        transactionType: 'G',
        amount: 120,
        accountId: '', // empty string should fall back
        mobileNumber: null,
        landlineNumber: '021234567',
      };

      reqMock.payoT2.paymentServiceRepository.createWebSessionT2.resolves({
        result: {},
      });

      await createWebPaymentSessionRequest(reqMock);

      const callPayload =
        reqMock.payoT2.paymentServiceRepository.createWebSessionT2.firstCall
          .args[1];
      expect(callPayload.settlementInfos.breakdown[0].accountId).to.equal(
        '021234567'
      );
    });

    it('should use mobileNumber when accountId is null for G-type', async () => {
      reqMock.payload.settlementInfo.breakdown[0] = {
        transactionType: 'G',
        amount: 20,
        accountId: null, // explicit null should fall back to mobileNumber
        mobileNumber: '639155500011',
      };

      reqMock.payoT2.paymentServiceRepository.createWebSessionT2.resolves({
        result: {},
      });

      await createWebPaymentSessionRequest(reqMock);

      const callPayload =
        reqMock.payoT2.paymentServiceRepository.createWebSessionT2.firstCall
          .args[1];
      expect(callPayload.settlementInfos.breakdown[0].accountId).to.equal(
        '639155500011'
      );
    });

    it('should handle payment session with createOrderExternal and entityIds', async () => {
      paramsMock.payload.settlementInfo.breakdown[0].createOrderExternal = [
        {
          entityIds: [{ id: 'entity1' }, { id: 'entity2' }],
        },
      ];

      await insertWebPaymentSessionToDB(paramsMock);

      const insertedDoc =
        paramsMock.mongo.customerPaymentsRepository.put.firstCall.args[0];
      const settlementDetail = insertedDoc.settlementDetails[0];

      expect(
        settlementDetail.createOrderExternal[0].entityIds[0].status
      ).to.equal(mockConstants.WEBPAYMENT_CONSTANTS.DEFAULT_ENTITY_STATUS);
      expect(
        settlementDetail.createOrderExternal[0].entityIds[1].status
      ).to.equal(mockConstants.WEBPAYMENT_CONSTANTS.DEFAULT_ENTITY_STATUS);
    });
  });

  describe('insertWebPaymentSessionToDB', () => {
    it('should not add userToken if user-token header is missing', async () => {
      delete paramsMock.headers['user-token'];
      await insertWebPaymentSessionToDB(paramsMock);
      const insertedDoc =
        paramsMock.mongo.customerPaymentsRepository.put.firstCall.args[0];
      expect(insertedDoc.userToken).to.not.exist();
    });

    it('should set status for all entityIds in createOrderExternal', async () => {
      paramsMock.payload.settlementInfo.breakdown = [
        {
          transactionType: 'N',
          amount: 10,
          requestType: 'Other',
          createOrderExternal: [
            {
              entityIds: [{ id: 'e1' }, { id: 'e2' }],
            },
          ],
        },
      ];
      await insertWebPaymentSessionToDB(paramsMock);
      const insertedDoc =
        paramsMock.mongo.customerPaymentsRepository.put.firstCall.args[0];
      const entityIds =
        insertedDoc.settlementDetails[0].createOrderExternal[0].entityIds;
      expect(entityIds[0].status).to.equal(
        mockConstants.WEBPAYMENT_CONSTANTS.DEFAULT_ENTITY_STATUS
      );
      expect(entityIds[1].status).to.equal(
        mockConstants.WEBPAYMENT_CONSTANTS.DEFAULT_ENTITY_STATUS
      );
    });

    it('should throw if mongo.customerPaymentsRepository.put fails', async () => {
      paramsMock.mongo.customerPaymentsRepository.put.rejects(
        new Error('put failed')
      );
      await expect(insertWebPaymentSessionToDB(paramsMock)).to.reject(
        Error,
        'put failed'
      );
    });
    it('should successfully insert data with default payment type and correct structure', async () => {
      await insertWebPaymentSessionToDB(paramsMock);

      expect(
        paramsMock.mongo.customerPaymentsRepository.put.calledOnce
      ).to.be.true();

      const insertedDoc =
        paramsMock.mongo.customerPaymentsRepository.put.firstCall.args[0];

      // Assert core fields
      expect(insertedDoc.tokenPaymentId).to.equal('PAY123');
      expect(insertedDoc.channelId).to.equal('principal-123');
      expect(insertedDoc.userToken).to.equal('user-token-456');
      expect(insertedDoc.paymentType).to.equal(
        mockConstants.WEBPAYMENT_CONSTANTS.DEFAULT_PAYMENT_TYPE
      );

      // Assert date generation using mockMoment
      expect(insertedDoc.createDate).to.equal('2025-10-18T19:24:55.000+08:00');
      expect(mockMoment.utc.calledTwice).to.be.true();

      // Assert settlement details transformation
      const sDetail = insertedDoc.settlementDetails[0];
      expect(sDetail.requestType).to.equal('BuyLoad');
      expect(sDetail.transactions[0].provisionStatus).to.equal(
        mockConstants.WEBPAYMENT_CONSTANTS.DEFAULT_PROVISION_STATUS
      );
    });

    it('should set paymentType to BB_PREPAID if BB prepaid promo is included', async () => {
      // Add a breakdown item that matches the promo request type
      paramsMock.payload.settlementInfo.breakdown.push({
        amount: 10,
        transactionType: 'N',
        requestType:
          mockConstants.WEBPAYMENT_CONSTANTS.BBPREPAIDPROMO_REQ_TYPE_VAL,
      });

      await insertWebPaymentSessionToDB(paramsMock);

      const insertedDoc =
        paramsMock.mongo.customerPaymentsRepository.put.firstCall.args[0];

      expect(insertedDoc.paymentType).to.equal(
        mockConstants.WEBPAYMENT_CONSTANTS.BBPREPAIDPROMO_DEFAULT_PAYMENT_TYPE
      );
    });

    it('should include metadata for O-type transaction', async () => {
      paramsMock.payload.settlementInfo.breakdown = [
        {
          transactionType: 'O',
          requestType: 'OtherPurchase',
          amount: 50,
          transactions: [
            {
              transactionProfile: {
                firstName: 'Test',
                lastName: 'User',
                email: 't@example.com',
                brand: 'XYZ',
              },
            },
          ],
        },
      ];

      await insertWebPaymentSessionToDB(paramsMock);

      const sDetail =
        paramsMock.mongo.customerPaymentsRepository.put.firstCall.args[0]
          .settlementDetails[0];

      expect(sDetail.metadata.firstName).to.equal('Test');
      expect(sDetail.metadata.brand).to.equal('XYZ');
    });

    it('should include provisionStatus for O-type transactions and omit brand when not provided', async () => {
      paramsMock.payload.settlementInfo.breakdown = [
        {
          transactionType: 'O',
          requestType: 'OtherPurchase',
          amount: 60,
          transactions: [
            {
              id: 'tx1',
              transactionProfile: {
                firstName: 'Prov',
                lastName: 'User',
                email: 'prov@example.com',
              },
            },
          ],
        },
      ];

      await insertWebPaymentSessionToDB(paramsMock);

      const sDetail =
        paramsMock.mongo.customerPaymentsRepository.put.firstCall.args[0]
          .settlementDetails[0];

      // transactions should have provisionStatus because transactionType === 'O'
      expect(sDetail.transactions[0].provisionStatus).to.equal(
        mockConstants.WEBPAYMENT_CONSTANTS.DEFAULT_PROVISION_STATUS
      );

      // brand is not present, so metadata.brand should not exist
      expect(sDetail.metadata.brand).to.not.exist();
    });

    it('should set default middleName and gender for S-type when missing', async () => {
      paramsMock.payload.settlementInfo.breakdown = [
        {
          transactionType: 'S',
          amount: 100,
          transactions: [
            {
              transactionProfile: {
                firstName: 'Sam',
                lastName: 'Smit',
                email: 'sam@example.com',
                chargeAmount: 200,
                chargeRate: 0.02,
                chargeType: 'OneTime',
              },
            },
          ],
        },
      ];

      await insertWebPaymentSessionToDB(paramsMock);

      const insertedDoc =
        paramsMock.mongo.customerPaymentsRepository.put.firstCall.args[0];

      expect(insertedDoc.budgetProtectProfile.middleName).to.equal(' ');
      expect(insertedDoc.budgetProtectProfile.gender).to.equal('Not Provided');
    });

    it('should throw OperationFailed if DB put fails', async () => {
      const mockError = new Error('DB write failed');
      paramsMock.mongo.customerPaymentsRepository.put.rejects(mockError);

      await expect(insertWebPaymentSessionToDB(paramsMock)).to.reject(
        Error,
        'DB write failed'
      );
    });

    it('should use customerInfo.customerId when uuid is not provided', async () => {
      delete reqMock.uuid;
      await createWebPaymentSessionRequest(reqMock);

      const callPayload =
        reqMock.payoT2.paymentServiceRepository.createWebSessionT2.firstCall
          .args[1];
      expect(callPayload.customerInfos.customerId).to.equal('cust-001');
    });

    it('should handle when only successUrl is provided', async () => {
      delete reqMock.payload.notificationUrls.failureUrl;
      await createWebPaymentSessionRequest(reqMock);

      const callPayload =
        reqMock.payoT2.paymentServiceRepository.createWebSessionT2.firstCall
          .args[1];
      expect(callPayload.redirectUrls).to.equal({
        successUrl: 'https://success.url',
        failureUrl: undefined,
      });
    });

    it('should handle when only failureUrl is provided', async () => {
      delete reqMock.payload.notificationUrls.successUrl;
      await createWebPaymentSessionRequest(reqMock);

      const callPayload =
        reqMock.payoT2.paymentServiceRepository.createWebSessionT2.firstCall
          .args[1];
      expect(callPayload.redirectUrls).to.equal({
        successUrl: undefined,
        failureUrl: 'https://fail.url',
      });
    });

    it('should handle S-type transaction with budgetProtectProfile', async () => {
      paramsMock.payload.settlementInfo.breakdown = [
        {
          transactionType: 'S',
          amount: 100,
          transactions: [
            {
              transactionProfile: {
                firstName: 'John',
                lastName: 'Smith',
                email: 'john@example.com',
                dateOfBirth: '1990-01-01',
                gender: 'Male',
                chargeAmount: 500,
                chargeRate: 0.05,
                chargeType: 'Monthly',
              },
            },
          ],
        },
      ];

      await insertWebPaymentSessionToDB(paramsMock);

      const insertedDoc =
        paramsMock.mongo.customerPaymentsRepository.put.firstCall.args[0];
      expect(insertedDoc.budgetProtectProfile).to.exist();
      expect(insertedDoc.budgetProtectProfile).to.equal({
        firstName: 'John',
        lastName: 'Smith',
        middleName: ' ',
        email: 'john@example.com',
        dateOfBirth: '1990-01-01',
        gender: 'Male',
        chargeAmount: 500,
        chargeRate: 0.05,
        chargeType: 'Monthly',
      });
    });

    it('should not include transactions when transactions only contain transactionProfile and no tx fields', async () => {
      paramsMock.payload.settlementInfo.breakdown = [
        {
          transactionType: 'P',
          requestType: 'Other',
          amount: 30,
          transactions: [
            {
              transactionProfile: {
                firstName: 'OnlyProfile',
              },
            },
          ],
        },
      ];

      await insertWebPaymentSessionToDB(paramsMock);

      const insertedDoc =
        paramsMock.mongo.customerPaymentsRepository.put.firstCall.args[0];

      const sDetail = insertedDoc.settlementDetails[0];
      expect(sDetail.transactions).to.not.exist();
      expect(sDetail.requestType).to.equal('Other');
      expect(sDetail.amount).to.equal(30);
    });
  });
});
