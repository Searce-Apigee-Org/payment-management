import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import sinon from 'sinon';
import {
  applyOonaPricing,
  applyOonaPricingForV2,
} from '../../../src/services/common/oonaService.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;
export { lab };

describe('Service :: Common :: OonaService :: applyOonaPricing', () => {
  let mockReq, mockPricingData;

  beforeEach(() => {
    mockPricingData = {
      OONA_COMP_TRAVEL: {
        123: { pricing: { net: 100 } },
      },
      OONA_COMP_TRAVEL_POSTPAID: {
        456: { pricing: { net: 150 } },
      },
      OONA_SMART_DELAY: {
        base: { net: 50 },
        additional: { net: 20 },
      },
    };

    mockReq = {
      secretManager: {
        oonaRepository: {
          getPricing: sinon.stub().resolves(mockPricingData),
        },
      },
      secret: 'mockSecret',
      cxsRequest: {
        settlementInformation: [
          {
            metadata: {
              brand: 'GHP',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john@example.com',
              mobileNumber: '639171234567',
              startDate: '2025-11-01',
              endDate: '2025-11-05',
              members: [{ firstName: 'John', lastName: 'Doe' }],
              flights: ['5J123'],
            },
          },
        ],
      },
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should apply OONA_COMP_TRAVEL_POSTPAID pricing for GHP brand', async () => {
    const result = await applyOonaPricing(mockReq, ['oonacomptravel-456']);

    expect(result).to.equal({ oonaCompTravel: 150 });
    expect(
      mockReq.secretManager.oonaRepository.getPricing.calledOnce
    ).to.be.true();
  });

  it('should apply OONA_COMP_TRAVEL pricing for non-GHP brand', async () => {
    mockReq.cxsRequest.settlementInformation[0].metadata.brand = 'Globe';
    const result = await applyOonaPricing(mockReq, ['oonacomptravel-123']);
    expect(result).to.equal({ oonaCompTravel: 100 });
  });

  it('should apply OONA_SMART_DELAY pricing for single member', async () => {
    const result = await applyOonaPricing(mockReq, ['oonasmartdelay']);
    expect(result).to.equal({ oonaSmartDelay: 50 });
  });

  it('should apply OONA_SMART_DELAY pricing for multiple members', async () => {
    mockReq.cxsRequest.settlementInformation[0].metadata.members.push({
      firstName: 'Jane',
      lastName: 'Doe',
    });

    const result = await applyOonaPricing(mockReq, ['oonasmartdelay']);
    expect(result).to.equal({ oonaSmartDelay: 70 }); // 50 + (1 * 20)
  });

  it('should throw CustomBadRequestMessage if invalid Oona SKU is passed', async () => {
    try {
      await applyOonaPricing(mockReq, ['oonainvalidsku']);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('CustomBadRequestMessage');
      expect(err.message).to.include('Invalid Oona SKU');
    }
  });

  it('should throw MissingParameterValidateException if OONA_COMP_TRAVEL pricing missing', async () => {
    mockReq.secretManager.oonaRepository.getPricing.resolves({
      OONA_COMP_TRAVEL: {},
    });

    try {
      await applyOonaPricing(mockReq, ['oonacomptravel-789']);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('MissingParameterValidateException');
      expect(err.message).to.include('Oona pricing for service id not found');
    }
  });

  it('should throw MissingParameterValidateException if Smart Delay pricing missing', async () => {
    mockReq.secretManager.oonaRepository.getPricing.resolves({
      OONA_SMART_DELAY: {},
    });

    try {
      await applyOonaPricing(mockReq, ['oonasmartdelay']);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('MissingParameterValidateException');
      expect(err.message).to.include('Smart Delay not found');
    }
  });

  it('should call both OONA_COMP_TRAVEL and OONA_SMART_DELAY in one request', async () => {
    const result = await applyOonaPricing(mockReq, [
      'oonacomptravel-456',
      'oonasmartdelay',
    ]);

    expect(result).to.equal({
      oonaCompTravel: 150,
      oonaSmartDelay: 50,
    });
  });
});

describe('Service :: Common :: OonaService :: applyOonaPricingForV2', () => {
  let reqMock, mockPricing;

  beforeEach(() => {
    mockPricing = {
      OONA_COMP_TRAVEL: {
        123: { pricing: { net: 100 } },
      },
      OONA_COMP_TRAVEL_POSTPAID: {
        456: { pricing: { net: 150 } },
      },
      OONA_SMART_DELAY: {
        base: { net: 50 },
        additional: { net: 20 },
      },
    };

    reqMock = {
      secretManager: {
        oonaRepository: {
          getPricing: sinon.stub().resolves(JSON.stringify(mockPricing)),
        },
      },
      payload: {
        settlementInfo: {
          breakdown: [
            {
              mobileNumber: '09171234567',
              transactionType: 'O',
              transactions: [
                {
                  oonaSkus: ['OonaCompTravel-456'],
                  transactionProfile: {
                    brand: 'GHP',
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com',
                    mobileNumber: '639171234567',
                    startDate: '2025-11-01',
                    endDate: '2025-11-05',
                    members: [{ firstName: 'John', lastName: 'Doe' }],
                    flights: ['5J123'],
                  },
                },
              ],
            },
          ],
        },
      },
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should apply OONA_COMP_TRAVEL_POSTPAID pricing for GHP brand', async () => {
    const result = await applyOonaPricingForV2(reqMock);
    const totalAmount = result.settlementInfo.breakdown[0].amount;

    expect(totalAmount).to.equal(150);
    expect(
      reqMock.secretManager.oonaRepository.getPricing.calledOnce
    ).to.be.true();
  });

  it('should apply OONA_COMP_TRAVEL pricing for non-GHP brand', async () => {
    delete reqMock.payload.settlementInfo.breakdown[0].transactions[0]
      .transactionProfile.brand;
    reqMock.payload.settlementInfo.breakdown[0].transactions[0].oonaSkus = [
      'OonaCompTravel-123',
    ];
    const result = await applyOonaPricingForV2(reqMock);
    const totalAmount = result.settlementInfo.breakdown[0].amount;

    expect(totalAmount).to.equal(100);
    expect(
      reqMock.secretManager.oonaRepository.getPricing.calledOnce
    ).to.be.true();
  });

  it('should apply OONA_SMART_DELAY pricing for single member', async () => {
    delete reqMock.payload.settlementInfo.breakdown[0].transactions[0]
      .transactionProfile.brand;
    reqMock.payload.settlementInfo.breakdown[0].transactions[0].oonaSkus = [
      'OonaSmartDelay',
    ];
    const result = await applyOonaPricingForV2(reqMock);
    const totalAmount = result.settlementInfo.breakdown[0].amount;

    expect(totalAmount).to.equal(50);
    expect(
      reqMock.secretManager.oonaRepository.getPricing.calledOnce
    ).to.be.true();
  });

  it('should apply OONA_SMART_DELAY pricing for multiple members', async () => {
    delete reqMock.payload.settlementInfo.breakdown[0].transactions[0]
      .transactionProfile.brand;
    reqMock.payload.settlementInfo.breakdown[0].transactions[0].oonaSkus = [
      'OonaSmartDelay',
    ];
    reqMock.payload.settlementInfo.breakdown[0].transactions[0].transactionProfile.members.push(
      {
        firstName: 'Jane',
        lastName: 'Doe',
      }
    );

    console.log(
      'TEST MULTIPLE MEMBERS REQ MOCK',
      JSON.stringify(
        reqMock.payload.settlementInfo.breakdown[0].transactions[0]
          .transactionProfile
      )
    );

    const result = await applyOonaPricingForV2(reqMock);
    console.log('FINAL RESULT', JSON.stringify(result));
    const totalAmount = result.settlementInfo.breakdown[0].amount;

    expect(totalAmount).to.equal(70); // 50 + (1 * 20)
  });

  it('should throw OperationFailed when Oona SKU is not in ALLOWED_OONA_SKUS', async () => {
    reqMock.payload.settlementInfo.breakdown[0].transactions[0].oonaSkus = [
      'OonaInvalidSku',
    ];

    try {
      await applyOonaPricingForV2(reqMock);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err).to.be.an.object();
      expect(err.type).to.equal('OperationFailed');
    }
  });

  it('should throw MissingParameterValidateException if OONA_COMP_TRAVEL pricing missing', async () => {
    reqMock.payload.settlementInfo.breakdown[0].transactions[0].oonaSkus = [
      'OonaCompTravel-789',
    ];

    try {
      await applyOonaPricingForV2(reqMock);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('MissingParameterValidateException');
      expect(err.message).to.include('Oona pricing for service id not found');
    }
  });

  it('should call both OONA_COMP_TRAVEL and OONA_SMART_DELAY in one request', async () => {
    reqMock.payload.settlementInfo.breakdown[0].transactions[0].oonaSkus.push(
      'OonaSmartDelay'
    );
    const result = await applyOonaPricingForV2(reqMock);
    console.log(
      'OONA_COMP_TRAVEL and OONA_SMART_DELAY in one request FINAL RESULT',
      JSON.stringify(result)
    );
    const totalAmount = result.settlementInfo.breakdown[0].amount;

    expect(totalAmount).to.equal(200); // 150 + 50
  });
});
