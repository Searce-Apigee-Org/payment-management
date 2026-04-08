import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { computeSinglifePricing } from '../../../src/services/common/singlifeService.js';
import { constants } from '../../../src/util/index.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('singlifeService :: computeSinglifePricing', () => {
  let reqMock;
  let getPricingStub;
  let mockSecretValue;

  beforeEach(() => {
    reqMock = {
      payload: {
        customerInfo: {
          customerId: 'a3cdef-p3j2j-d30as2-fa2as-o02ams',
          customerName: 'Jane Doe',
        },
        settlementInfo: {
          breakdown: [
            {
              mobileNumber: '09123456789',
              amount: 50,
              transactionType: 'N',
              requestType: 'BuyPromo',
              transactions: [
                {
                  amount: 50,
                  serviceId: '9947',
                  param: '50',
                },
              ],
            },
            {
              mobileNumber: '09171234567',
              emailAddress: 'jane.doe@example.com',
              transactionType: 'S',
              transactions: [
                {
                  transactionProfile: {
                    firstName: 'JANE',
                    middleName: '',
                    lastName: 'DOE',
                    email: 'jane.doe@example.com',
                    dateOfBirth: '1990-08-15',
                  },
                },
              ],
            },
          ],
        },
        allowedPaymentMethods: ['CARD_STRAIGHT'],
        notificationUrls: {
          successUrl: 'https://example.com/success',
          failureUrl: 'https://example.com/failure',
        },
      },
      secretManager: {
        singlifeRepository: {
          getPricing: Sinon.stub(),
        },
      },
      secret: {},
    };

    mockSecretValue = {
      budgetProtectConfig: {
        requestTypeAllowed: ['BuyPromo'],
        rate: 10,
        rateType: constants.WEBPAYMENT_CONSTANTS.PERCENTAGE_RATE_TYPE,
      },
    };

    getPricingStub = reqMock.secretManager.singlifeRepository.getPricing;
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should compute Singlife amount based on percentage when request type is allowed', async () => {
    getPricingStub.resolves(JSON.stringify(mockSecretValue));

    const result = await computeSinglifePricing(reqMock);

    const singlifeTx = result.settlementInfo.breakdown.find(
      (b) => b.transactionType === 'S'
    );

    expect(singlifeTx.amount).to.equal(5);
    expect(singlifeTx.transactions[0].transactionProfile.chargeAmount).to.equal(
      5
    );
    expect(singlifeTx.transactions[0].transactionProfile.chargeRate).to.equal(
      10
    );
    expect(singlifeTx.transactions[0].transactionProfile.chargeType).to.equal(
      constants.WEBPAYMENT_CONSTANTS.PERCENTAGE_RATE_TYPE
    );
  });

  it('should throw OperationFailed if request type is not in requestTypeAllowed', async () => {
    const notAllowedConfig = {
      budgetProtectConfig: {
        requestTypeAllowed: ['BuyLoad'],
        rate: 10,
        rateType: constants.WEBPAYMENT_CONSTANTS.PERCENTAGE_RATE_TYPE,
      },
    };
    getPricingStub.resolves(JSON.stringify(notAllowedConfig));

    try {
      await computeSinglifePricing(reqMock);
      throw new Error('Expected OperationFailed but succeeded');
    } catch (err) {
      expect(err).to.be.an.object();
      expect(err.type).to.equal('OperationFailed');
    }
  });

  it('should not modify Singlife transaction when rateType is FLAT', async () => {
    const flatConfig = {
      budgetProtectConfig: {
        requestTypeAllowed: ['BuyPromo'],
        rate: 10,
        rateType: 'flat',
      },
    };
    getPricingStub.resolves(JSON.stringify(flatConfig));

    const result = await computeSinglifePricing(reqMock);
    const singlifeTx = result.settlementInfo.breakdown.find(
      (b) => b.transactionType === 'S'
    );
    expect(singlifeTx.amount).to.be.undefined();
    expect(
      singlifeTx.transactions[0].transactionProfile.chargeAmount
    ).to.be.undefined();
    expect(
      singlifeTx.transactions[0].transactionProfile.chargeRate
    ).to.be.undefined();
  });

  it('should use default requestTypeAllowed when missing and compute zero when no non-S requestTypes', async () => {
    const configNoRequestTypeAllowed = {
      budgetProtectConfig: {
        rate: 10,
        rateType: constants.WEBPAYMENT_CONSTANTS.PERCENTAGE_RATE_TYPE,
      },
    };
    getPricingStub.resolves(JSON.stringify(configNoRequestTypeAllowed));
    reqMock.payload.settlementInfo.breakdown = [
      {
        mobileNumber: '09171234567',
        transactionType: 'S',
        transactions: [
          {
            transactionProfile: {
              firstName: 'JANE',
              lastName: 'DOE',
              email: 'jane.doe@example.com',
              dateOfBirth: '1990-08-15',
            },
          },
        ],
      },
    ];

    const result = await computeSinglifePricing(reqMock);

    const singlifeTx = result.settlementInfo.breakdown.find(
      (b) => b.transactionType === 'S'
    );
    expect(singlifeTx.amount).to.equal(0);
    expect(singlifeTx.transactions[0].transactionProfile.chargeAmount).to.equal(
      0
    );
    expect(singlifeTx.transactions[0].transactionProfile.chargeRate).to.equal(
      10
    );
  });

  it('should use default rate when missing and set Singlife amount to zero', async () => {
    const configNoRate = {
      budgetProtectConfig: {
        requestTypeAllowed: ['BuyPromo'],
        rateType: constants.WEBPAYMENT_CONSTANTS.PERCENTAGE_RATE_TYPE,
      },
    };
    getPricingStub.resolves(JSON.stringify(configNoRate));

    const result = await computeSinglifePricing(reqMock);

    const singlifeTx = result.settlementInfo.breakdown.find(
      (b) => b.transactionType === 'S'
    );
    expect(singlifeTx.amount).to.equal(0);
    expect(singlifeTx.transactions[0].transactionProfile.chargeAmount).to.equal(
      0
    );
    expect(singlifeTx.transactions[0].transactionProfile.chargeRate).to.equal(
      0
    );
  });

  it('should return same payload when breakdown is empty', async () => {
    reqMock.payload.settlementInfo.breakdown = [];

    getPricingStub.resolves(JSON.stringify(mockSecretValue));

    const result = await computeSinglifePricing(reqMock);
    expect(result).to.equal(reqMock.payload);
  });

  it('should throw when budgetProtectConfig is missing', async () => {
    getPricingStub.resolves('{}');

    try {
      await computeSinglifePricing(reqMock);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err).to.exist();
      expect(err.message).to.exist();
    }
  });

  it('should propagate error when getPricing fails', async () => {
    const notFoundError = new Error('ResourceNotFound');
    getPricingStub.rejects(notFoundError);

    try {
      await computeSinglifePricing(reqMock);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err).to.equal(notFoundError);
      expect(err.message).to.equal('ResourceNotFound');
    }
  });
});
