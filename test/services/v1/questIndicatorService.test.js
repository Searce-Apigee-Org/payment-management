import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { questIndicatorService } from '../../../src/services/v1/index.js';
import { constants } from '../../../src/util/index.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Service :: questIndicatorService :: checkQuestIndicator', () => {
  let reqMock;
  let addQuestStub;
  let updateOneStub;

  beforeEach(() => {
    reqMock = {
      pre: {
        user: {
          uuid: 'user-123',
        },
      },
      cxs: {
        productOrderingRepository: {
          addQuest: Sinon.stub(),
        },
      },
      mongo: {
        customerPaymentsRepository: {
          updateOne: Sinon.stub(),
        },
      },
    };

    addQuestStub = reqMock.cxs.productOrderingRepository.addQuest;
    updateOneStub = reqMock.mongo.customerPaymentsRepository.updateOne;
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should throw error if addQuest fails', async () => {
    const paymentDetails = {
      userToken: 'Bearer token123',
      settlementDetails: [
        {
          requestType: constants.PAYMENT_REQUEST_TYPES.PAY_BILLS,
          status: ['AUTHORISED'],
          transactions: [{}],
        },
      ],
    };

    addQuestStub.rejects(new Error('AddQuest failed'));

    try {
      await questIndicatorService.checkQuestIndicator(reqMock, paymentDetails);
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err.message).to.equal('AddQuest failed');
    }
  });

  it('should return early if settlementDetails is missing', async () => {
    const paymentDetails = {};
    const result = await questIndicatorService.checkQuestIndicator(
      reqMock,
      paymentDetails
    );
    expect(result).to.be.undefined();
  });

  it('should return early if requestType is not PAY_BILLS', async () => {
    const paymentDetails = {
      settlementDetails: [{ requestType: 'OTHER' }],
    };
    const result = await questIndicatorService.checkQuestIndicator(
      reqMock,
      paymentDetails
    );
    expect(result).to.be.undefined();
  });

  it('should return early if questFlag is already true', async () => {
    const paymentDetails = {
      settlementDetails: [
        {
          requestType: constants.PAYMENT_REQUEST_TYPES.PAY_BILLS,
          transactions: [{ questFlag: 'true' }],
        },
      ],
    };
    const result = await questIndicatorService.checkQuestIndicator(
      reqMock,
      paymentDetails
    );
    expect(result).to.be.undefined();
  });

  it('should initialize transactions if missing', async () => {
    const paymentDetails = {
      userToken: 'Bearer token123',
      settlementDetails: [
        {
          requestType: constants.PAYMENT_REQUEST_TYPES.PAY_BILLS,
          status: ['AUTHORISED'],
        },
      ],
    };

    addQuestStub.resolves({ statusCode: '200', questIndicator: 'N' });
    updateOneStub.resolves();

    await questIndicatorService.checkQuestIndicator(reqMock, paymentDetails);

    expect(paymentDetails.settlementDetails[0].transactions).to.exist();
    expect(
      paymentDetails.settlementDetails[0].transactions[0].questInd
    ).to.equal('N');
  });

  it('should call addQuest and update transactions when conditions are met', async () => {
    const paymentDetails = {
      userToken: 'Bearer token123',
      settlementDetails: [
        {
          requestType: constants.PAYMENT_REQUEST_TYPES.PAY_BILLS,
          status: ['AUTHORISED'],
          transactions: [{}],
        },
      ],
    };

    addQuestStub.resolves({ statusCode: '200', questIndicator: 'Y' });
    updateOneStub.resolves();

    await questIndicatorService.checkQuestIndicator(reqMock, paymentDetails);

    expect(addQuestStub.calledOnce).to.be.true();
    expect(
      paymentDetails.settlementDetails[0].transactions[0].questInd
    ).to.equal('Y');
    expect(
      paymentDetails.settlementDetails[0].transactions[0].questFlag
    ).to.equal('true');
  });

  it('should handle existing questInd correctly', async () => {
    const paymentDetails = {
      userToken: 'Bearer token123',
      settlementDetails: [
        {
          requestType: constants.PAYMENT_REQUEST_TYPES.PAY_BILLS,
          status: ['AUTHORISED'],
          transactions: [{ questInd: 'Y' }],
        },
        {
          requestType: constants.PAYMENT_REQUEST_TYPES.PAY_BILLS,
          status: ['AUTHORISED'],
          transactions: [{ questInd: 'N' }],
        },
      ],
    };
    addQuestStub.resolves({ statusCode: '200', questIndicator: 'N' });
    updateOneStub.resolves();

    await questIndicatorService.checkQuestIndicator(reqMock, paymentDetails);

    expect(
      paymentDetails.settlementDetails[0].transactions[0].questInd
    ).to.equal('Y');

    expect(
      paymentDetails.settlementDetails[1].transactions[0].questInd
    ).to.equal('N');
  });
});
