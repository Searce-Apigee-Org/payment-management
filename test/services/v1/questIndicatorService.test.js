import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import esmock from 'esmock';
import Sinon from 'sinon';
import { constants } from '../../../src/util/index.js';

const lab = Lab.script();
const { describe, it, before, beforeEach, afterEach } = lab;

export { lab };

describe('Service :: questIndicatorService :: checkQuestIndicator', () => {
  const addAccountQuestLambdaName = 'AddAccountQuest';

  const loadCheckQuestIndicator = async ({ migratedLambdas = [] } = {}) => {
    const mod = await esmock(
      '../../../src/services/v1/questIndicatorService.js',
      {
        '@globetel/cxs-core/core/logger/index.js': {
          logger: {
            info: Sinon.stub(),
            debug: Sinon.stub(),
          },
        },
        '../../../convict/config.js': {
          config: {
            get: (key) => {
              expect(key).to.equal('lambda');
              return {
                migratedLambdas,
                addAccountQuest: { name: addAccountQuestLambdaName },
              };
            },
          },
        },
      }
    );

    return mod.checkQuestIndicator;
  };

  let reqMock;
  let addQuestStub;
  let addAccountQuestLambdaStub;
  let updateOneStub;
  let checkQuestIndicator;

  before(async () => {
    checkQuestIndicator = await loadCheckQuestIndicator();
  });

  beforeEach(() => {
    reqMock = {
      pre: {
        user: {
          uuid: 'user-123',
        },
      },
      http: {},
      invokeLambda: Sinon.stub(),
      serviceHelpers: {
        lambda: {
          addAccountQuestLambda: Sinon.stub(),
        },
      },
      cxs: {
        productOrderingRepository: {
          addQuest: Sinon.stub(),
        },
      },
      payment: {
        customerPaymentsRepository: {
          updateOne: Sinon.stub(),
        },
      },
    };

    addQuestStub = reqMock.cxs.productOrderingRepository.addQuest;
    addAccountQuestLambdaStub =
      reqMock.serviceHelpers.lambda.addAccountQuestLambda;
    updateOneStub = reqMock.payment.customerPaymentsRepository.updateOne;
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should throw error if addAccountQuestLambda fails', async () => {
    const paymentDetails = {
      tokenPaymentId: 'GLA-123',
      userToken: 'Bearer token123',
      settlementDetails: [
        {
          requestType: constants.PAYMENT_REQUEST_TYPES.PAY_BILLS,
          status: ['AUTHORISED'],
          transactions: [{}],
        },
      ],
    };

    addAccountQuestLambdaStub.rejects(new Error('AddAccountQuest failed'));

    try {
      await checkQuestIndicator(reqMock, paymentDetails);
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err.message).to.equal('AddAccountQuest failed');
    }
  });

  it('when lambda is migrated: should invoke cxs.productOrderingRepository.addQuest(questRequestParams, http)', async () => {
    const checkQuestIndicatorMigrated = await loadCheckQuestIndicator({
      migratedLambdas: [addAccountQuestLambdaName],
    });

    const paymentDetails = {
      tokenPaymentId: 'GLA-123',
      userToken: 'Bearer token123',
      settlementDetails: [
        {
          requestType: constants.PAYMENT_REQUEST_TYPES.PAY_BILLS,
          status: ['AUTHORISED'],
          mobileNumber: '0917',
          accountNumber: 'ACC1',
          transactions: [{}],
        },
      ],
    };

    reqMock.cxs.productOrderingRepository.addQuest.resolves({
      statusCode: '200',
      questIndicator: 'Y',
    });

    await checkQuestIndicatorMigrated(reqMock, paymentDetails);

    expect(reqMock.cxs.productOrderingRepository.addQuest.calledOnce).to.equal(
      true
    );

    const [questRequestParamsArg, httpArg] =
      reqMock.cxs.productOrderingRepository.addQuest.firstCall.args;

    expect(questRequestParamsArg).to.equal({
      uuid: 'user-123',
      questType: constants.PAYMENT_REQUEST_TYPES.PAY_BILLS,
      msisdn: '0917',
      userToken: 'token123',
      accountNumber: 'ACC1',
    });

    expect(httpArg).to.equal(reqMock.http);

    expect(addAccountQuestLambdaStub.called).to.equal(false);

    expect(updateOneStub.calledOnce).to.equal(true);
    expect(updateOneStub.firstCall.args).to.equal([paymentDetails, reqMock]);
  });

  it('should return early if settlementDetails is missing', async () => {
    const paymentDetails = {
      tokenPaymentId: 'GLA-123',
    };
    const result = await checkQuestIndicator(reqMock, paymentDetails);
    expect(result).to.be.undefined();
  });

  it('should return early if tokenPaymentId is not SUPERAPP (GLA) or CPT', async () => {
    const paymentDetails = {
      tokenPaymentId: 'GLE-123',
      userToken: 'Bearer token123',
      settlementDetails: [
        {
          requestType: constants.PAYMENT_REQUEST_TYPES.PAY_BILLS,
          status: ['AUTHORISED'],
          transactions: [{}],
        },
      ],
    };

    addAccountQuestLambdaStub.resolves({
      statusCode: '200',
      questIndicator: 'Y',
    });

    const result = await checkQuestIndicator(reqMock, paymentDetails);

    expect(result).to.be.undefined();
    expect(addAccountQuestLambdaStub.called).to.equal(false);
    expect(updateOneStub.called).to.equal(false);
  });

  it('should return early if requestType is not PAY_BILLS', async () => {
    const paymentDetails = {
      tokenPaymentId: 'GLA-123',
      settlementDetails: [{ requestType: 'OTHER' }],
    };
    const result = await checkQuestIndicator(reqMock, paymentDetails);
    expect(result).to.be.undefined();
  });

  it('should return early if questFlag is already true', async () => {
    const paymentDetails = {
      tokenPaymentId: 'GLA-123',
      settlementDetails: [
        {
          requestType: constants.PAYMENT_REQUEST_TYPES.PAY_BILLS,
          transactions: [{ questFlag: 'true' }],
        },
      ],
    };
    const result = await checkQuestIndicator(reqMock, paymentDetails);
    expect(result).to.be.undefined();
  });

  it('should initialize transactions if missing', async () => {
    const paymentDetails = {
      tokenPaymentId: 'GLA-123',
      userToken: 'Bearer token123',
      settlementDetails: [
        {
          requestType: constants.PAYMENT_REQUEST_TYPES.PAY_BILLS,
          status: ['AUTHORISED'],
        },
      ],
    };

    addAccountQuestLambdaStub.resolves({
      statusCode: '200',
      questIndicator: 'N',
    });
    updateOneStub.resolves();

    await checkQuestIndicator(reqMock, paymentDetails);

    expect(paymentDetails.settlementDetails[0].transactions).to.exist();
    expect(
      paymentDetails.settlementDetails[0].transactions[0].questIndicator
    ).to.equal('N');
    expect(
      paymentDetails.settlementDetails[0].transactions[0].questFlag
    ).to.equal('true');
    expect(updateOneStub.calledOnce).to.equal(true);
    expect(updateOneStub.firstCall.args).to.equal([paymentDetails, reqMock]);
  });

  it('should call addQuest and update transactions when conditions are met', async () => {
    const paymentDetails = {
      tokenPaymentId: 'GLA-123',
      userToken: 'Bearer token123',
      settlementDetails: [
        {
          requestType: constants.PAYMENT_REQUEST_TYPES.PAY_BILLS,
          status: ['AUTHORISED'],
          transactions: [{}],
        },
      ],
    };

    addAccountQuestLambdaStub.resolves({
      statusCode: '200',
      questIndicator: 'Y',
    });
    updateOneStub.resolves();

    await checkQuestIndicator(reqMock, paymentDetails);

    expect(addAccountQuestLambdaStub.calledOnce).to.be.true();
    expect(
      paymentDetails.settlementDetails[0].transactions[0].questIndicator
    ).to.equal('Y');
    expect(
      paymentDetails.settlementDetails[0].transactions[0].questFlag
    ).to.equal('true');
    expect(updateOneStub.calledOnce).to.equal(true);
    expect(updateOneStub.firstCall.args).to.equal([paymentDetails, reqMock]);
  });

  it('should handle existing questInd correctly', async () => {
    const paymentDetails = {
      tokenPaymentId: 'GLA-123',
      userToken: 'Bearer token123',
      settlementDetails: [
        {
          requestType: constants.PAYMENT_REQUEST_TYPES.PAY_BILLS,
          status: ['AUTHORISED'],
          transactions: [{ questIndicator: 'Y' }],
        },
        {
          requestType: constants.PAYMENT_REQUEST_TYPES.PAY_BILLS,
          status: ['AUTHORISED'],
          transactions: [{ questIndicator: 'N' }],
        },
      ],
    };

    addAccountQuestLambdaStub.resolves({
      statusCode: '200',
      questIndicator: 'N',
    });
    updateOneStub.resolves();

    await checkQuestIndicator(reqMock, paymentDetails);

    expect(
      paymentDetails.settlementDetails[0].transactions[0].questIndicator
    ).to.equal('Y');

    expect(
      paymentDetails.settlementDetails[1].transactions[0].questIndicator
    ).to.equal('N');

    expect(addAccountQuestLambdaStub.calledOnce).to.equal(true);

    expect(updateOneStub.called).to.equal(false);
  });
});
