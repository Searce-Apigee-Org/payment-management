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
      gPayOWebSessionResponse: { paymentId: 'PAY123' },
    };
  });

  afterEach(() => {
    Sinon.restore();
  });

  describe('createWebPaymentSessionRequest', () => {
    it('should successfully call GPayO API and return result', async () => {
      const result = await createWebPaymentSessionRequest(reqMock);

      expect(result.paymentId).to.equal('PAY123');
      expect(
        reqMock.payoT2.paymentServiceRepository.createWebSessionT2.calledOnce
      ).to.be.true();
    });

    it('should use customerInfo.customerId when uuid is missing', async () => {
      delete reqMock.uuid;
      await createWebPaymentSessionRequest(reqMock);

      const callPayload =
        reqMock.payoT2.paymentServiceRepository.createWebSessionT2.firstCall
          .args[1];

      expect(callPayload.customerInfos.customerId).to.equal('cust-001');
    });

    it('should use explicit accountId for G-type when provided', async () => {
      reqMock.payload.settlementInfo.breakdown[0] = {
        transactionType: 'G',
        amount: 100,
        accountId: 'ACC123',
      };

      await createWebPaymentSessionRequest(reqMock);

      const callPayload =
        reqMock.payoT2.paymentServiceRepository.createWebSessionT2.firstCall
          .args[1];

      expect(callPayload.settlementInfos.breakdown[0].accountId).to.equal(
        'ACC123'
      );
    });

    it('should fallback to landlineNumber for G-type', async () => {
      reqMock.payload.settlementInfo.breakdown[0] = {
        transactionType: 'G',
        amount: 100,
        accountId: null,
        landlineNumber: '021234567',
      };

      await createWebPaymentSessionRequest(reqMock);

      const callPayload =
        reqMock.payoT2.paymentServiceRepository.createWebSessionT2.firstCall
          .args[1];

      expect(callPayload.settlementInfos.breakdown[0].accountId).to.equal(
        '021234567'
      );
    });

    it('should fallback when G-type accountId is empty string', async () => {
      reqMock.payload.settlementInfo.breakdown[0] = {
        transactionType: 'G',
        amount: 100,
        accountId: '', // empty string should fallback
        mobileNumber: '639888888888',
      };

      await createWebPaymentSessionRequest(reqMock);

      const callPayload =
        reqMock.payoT2.paymentServiceRepository.createWebSessionT2.firstCall
          .args[1];

      expect(callPayload.settlementInfos.breakdown[0].accountId).to.equal(
        '639888888888'
      );
    });

    it('should set accountId to undefined for G-type when no accountId, mobileNumber, or landline provided', async () => {
      reqMock.payload.settlementInfo.breakdown[0] = {
        transactionType: 'G',
        amount: 100,
      };

      await createWebPaymentSessionRequest(reqMock);

      const callPayload =
        reqMock.payoT2.paymentServiceRepository.createWebSessionT2.firstCall
          .args[1];

      expect(
        callPayload.settlementInfos.breakdown[0].accountId
      ).to.be.undefined();
    });

    it('should include emailAddress in payload when provided', async () => {
      reqMock.payload.settlementInfo.breakdown[0].emailAddress =
        'test@email.com';

      await createWebPaymentSessionRequest(reqMock);

      const callPayload =
        reqMock.payoT2.paymentServiceRepository.createWebSessionT2.firstCall
          .args[1];

      expect(callPayload.settlementInfos.breakdown[0].emailAddress).to.equal(
        'test@email.com'
      );
    });

    it('should throw undefined if API returns empty response', async () => {
      reqMock.payoT2.paymentServiceRepository.createWebSessionT2.resolves({});

      let thrown;
      try {
        await createWebPaymentSessionRequest(reqMock);
      } catch (err) {
        thrown = err;
      }

      expect(thrown).to.be.undefined();
    });

    it('should rethrow error when API call rejects', async () => {
      const mockError = new Error('network fail');

      reqMock.payoT2.paymentServiceRepository.createWebSessionT2.rejects(
        mockError
      );

      let thrown;
      try {
        await createWebPaymentSessionRequest(reqMock);
      } catch (err) {
        thrown = err;
      }

      expect(thrown).to.equal(mockError);
    });
  });

  describe('insertWebPaymentSessionToDB', () => {
    it('should return structured object with default payment type', async () => {
      const result = await insertWebPaymentSessionToDB(paramsMock);

      expect(result.tokenPaymentId).to.equal('PAY123');
      expect(result.channelId).to.equal('principal-123');
      expect(result.paymentType).to.equal(
        mockConstants.WEBPAYMENT_CONSTANTS.DEFAULT_PAYMENT_TYPE
      );
      expect(result.userToken).to.equal('user-token-456');
      expect(result.createDate).to.equal('2025-10-18T19:24:55.000+08:00');

      const sDetail = result.settlementDetails[0];
      expect(sDetail.requestType).to.equal('BuyLoad');
      expect(sDetail.transactions[0].provisionStatus).to.equal(
        mockConstants.WEBPAYMENT_CONSTANTS.DEFAULT_PROVISION_STATUS
      );
    });

    it('should not include userToken if header missing', async () => {
      delete paramsMock.headers['user-token'];
      const result = await insertWebPaymentSessionToDB(paramsMock);
      expect(result.userToken).to.not.exist();
    });

    it('should set entityIds status when createOrderExternal exists', async () => {
      paramsMock.payload.settlementInfo.breakdown[0].createOrderExternal = [
        { entityIds: [{ id: 'e1' }, { id: 'e2' }] },
      ];

      const result = await insertWebPaymentSessionToDB(paramsMock);

      const entityIds =
        result.settlementDetails[0].createOrderExternal[0].entityIds;

      expect(entityIds[0].status).to.equal(
        mockConstants.WEBPAYMENT_CONSTANTS.DEFAULT_ENTITY_STATUS
      );
      expect(entityIds[1].status).to.equal(
        mockConstants.WEBPAYMENT_CONSTANTS.DEFAULT_ENTITY_STATUS
      );
    });

    it('should set BB prepaid paymentType when promo exists', async () => {
      paramsMock.payload.settlementInfo.breakdown.push({
        amount: 10,
        transactionType: 'N',
        requestType:
          mockConstants.WEBPAYMENT_CONSTANTS.BBPREPAIDPROMO_REQ_TYPE_VAL,
      });

      const result = await insertWebPaymentSessionToDB(paramsMock);

      expect(result.paymentType).to.equal(
        mockConstants.WEBPAYMENT_CONSTANTS.BBPREPAIDPROMO_DEFAULT_PAYMENT_TYPE
      );
    });

    it('should build metadata for O-type transaction', async () => {
      paramsMock.payload.settlementInfo.breakdown = [
        {
          transactionType: 'O',
          requestType: 'Other',
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

      const result = await insertWebPaymentSessionToDB(paramsMock);

      expect(result.settlementDetails[0].metadata.brand).to.equal('XYZ');
    });

    it('should set budgetProtectProfile for S-type', async () => {
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
                chargeAmount: 500,
                chargeRate: 0.05,
                chargeType: 'Monthly',
              },
            },
          ],
        },
      ];

      const result = await insertWebPaymentSessionToDB(paramsMock);

      expect(result.budgetProtectProfile.middleName).to.equal(' ');
      expect(result.budgetProtectProfile.gender).to.equal('Not Provided');
    });

    it('should omit transactions if only transactionProfile exists', async () => {
      paramsMock.payload.settlementInfo.breakdown = [
        {
          transactionType: 'P',
          requestType: 'Other',
          amount: 30,
          transactions: [{ transactionProfile: { firstName: 'OnlyProfile' } }],
        },
      ];

      const result = await insertWebPaymentSessionToDB(paramsMock);

      expect(result.settlementDetails[0].transactions).to.not.exist();
    });

    it('should map accountId, mobileNumber and emailAddress to settlementDetails', async () => {
      paramsMock.payload.settlementInfo.breakdown = [
        {
          transactionType: 'N',
          requestType: 'Other',
          amount: 10,
          accountId: 'ACC1',
          mobileNumber: '639111111111',
          emailAddress: 'abc@test.com',
        },
      ];

      const result = await insertWebPaymentSessionToDB(paramsMock);

      const sDetail = result.settlementDetails[0];

      expect(sDetail.accountNumber).to.equal('ACC1');
      expect(sDetail.mobileNumber).to.equal('639111111111');
      expect(sDetail.emailAddress).to.equal('abc@test.com');
    });

    it('should not include accountNumber, mobileNumber, or emailAddress when not provided', async () => {
      paramsMock.payload.settlementInfo.breakdown = [
        {
          transactionType: 'N',
          requestType: 'Other',
          amount: 20,
        },
      ];

      const result = await insertWebPaymentSessionToDB(paramsMock);

      const sDetail = result.settlementDetails[0];

      expect(sDetail.accountNumber).to.not.exist();
      expect(sDetail.mobileNumber).to.not.exist();
      expect(sDetail.emailAddress).to.not.exist();
    });

    it('should include only mobileNumber when accountId and emailAddress are not provided', async () => {
      paramsMock.payload.settlementInfo.breakdown = [
        {
          transactionType: 'N',
          requestType: 'Other',
          amount: 20,
          mobileNumber: '639222222222',
        },
      ];

      const result = await insertWebPaymentSessionToDB(paramsMock);
      const sDetail = result.settlementDetails[0];

      expect(sDetail.mobileNumber).to.equal('639222222222');
      expect(sDetail.accountNumber).to.not.exist();
      expect(sDetail.emailAddress).to.not.exist();
    });

    it('should include only emailAddress when accountId and mobileNumber are not provided', async () => {
      paramsMock.payload.settlementInfo.breakdown = [
        {
          transactionType: 'N',
          requestType: 'Other',
          amount: 20,
          emailAddress: 'only@email.com',
        },
      ];

      const result = await insertWebPaymentSessionToDB(paramsMock);
      const sDetail = result.settlementDetails[0];

      expect(sDetail.emailAddress).to.equal('only@email.com');
      expect(sDetail.accountNumber).to.not.exist();
      expect(sDetail.mobileNumber).to.not.exist();
    });
  });

  it('should include only accountNumber when mobileNumber and emailAddress are not provided', async () => {
    paramsMock.payload.settlementInfo.breakdown = [
      {
        transactionType: 'N',
        requestType: 'Other',
        amount: 20,
        accountId: 'ACC_ONLY',
      },
    ];

    const result = await insertWebPaymentSessionToDB(paramsMock);
    const sDetail = result.settlementDetails[0];

    expect(sDetail.accountNumber).to.equal('ACC_ONLY');
    expect(sDetail.mobileNumber).to.not.exist();
    expect(sDetail.emailAddress).to.not.exist();
  });
});
