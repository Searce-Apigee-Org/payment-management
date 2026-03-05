import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import moment from 'moment';
import sinon from 'sinon';
import { attributesDetailsHelperService } from '../../../src/services/helpers/index.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;
export { lab };

describe('Service :: helper :: attributesDetailsHelperService :: getAttributesDetails', () => {
  let req;
  let updateStub;

  beforeEach(() => {
    updateStub = sinon.stub().resolves();
    req = {
      tokenPaymentId: 'PAY-123',
      requestType: 'BUYESIM',
      paymentDetails: {
        createdDate: new Date().toISOString(),
        settlementDetails: [{ transactions: [{ provisionStatus: 'PENDING' }] }],
      },
      http: {},
      mongo: {
        customerPaymentRepository: {
          updateCustomerPaymentInfo: sinon.stub().resolves({}),
        },
      },
      paymentTransactionDetailsService: {
        updateProvisionStatusAndProductAttributes: updateStub,
      },
      secretManagerClient: {},
      secretManager: {
        accountTokenRepository: {
          getAccountTokenKey: sinon
            .stub()
            .resolves(
              Buffer.from(JSON.stringify({ token_expiry_timeout: 3600 }))
            ),
        },
      },
      dsa: {
        attributesRepository: {
          getAttributesDetails: sinon.stub(),
        },
      },
    };
  });

  afterEach(() => sinon.restore());

  it('handles generic errors, updates status to FAILED, and throws OperationFailed', async () => {
    req.secretManager.accountTokenRepository.getAccountTokenKey.rejects(
      new Error()
    );

    try {
      await attributesDetailsHelperService.getAttributesDetails(req);
    } catch (error) {
      expect(error.type).to.equal('OperationFailed');
      sinon.assert.calledWith(
        updateStub,
        sinon.match({
          provisionStatus: { provisionStatus: 'FAILED' },
          productAttributes: { status: 'FAILED' },
        })
      );
    }
  });

  it('re-throws error if error.type exists', async () => {
    req.paymentDetails.createdDate = moment()
      .subtract(2, 'hours')
      .toISOString();

    try {
      await attributesDetailsHelperService.getAttributesDetails(req);
    } catch (error) {
      expect(error.type).to.equal('PaymentValidityExceeded');
      sinon.assert.calledOnce(updateStub);
    }
  });

  it('throws InternalOperationFailed on non-zero response code', async () => {
    req.dsa.attributesRepository.getAttributesDetails.resolves({
      'response-code': 1,
      id: 'TXN-001',
      'result-description': 'DSA Error',
    });

    try {
      await attributesDetailsHelperService.getAttributesDetails(req);
    } catch (error) {
      expect(error.type).to.equal('InternalOperationFailed');
      sinon.assert.calledWith(
        updateStub,
        sinon.match({
          provisionStatus: {
            provisionStatus: 'FAILED',
            transactionId: 'TXN-001',
          },
        })
      );
    }
  });

  it('throws PaymentAlreadyUsed when provisionStatus is SUCCESS', async () => {
    req.paymentDetails.settlementDetails[0].transactions[0].provisionStatus =
      'SUCCESS';

    try {
      await attributesDetailsHelperService.getAttributesDetails(req);
    } catch (error) {
      expect(error.type).to.equal('PaymentAlreadyUsed');
      sinon.assert.calledOnce(updateStub);
    }
  });

  it('throws PaymentAlreadyUsed when provisionStatus is FAILED', async () => {
    req.paymentDetails.settlementDetails[0].transactions[0].provisionStatus =
      'FAILED';

    try {
      await attributesDetailsHelperService.getAttributesDetails(req);
    } catch (error) {
      expect(error.type).to.equal('PaymentAlreadyUsed');
      sinon.assert.calledOnce(updateStub);
    }
  });

  it('successfully updates status and returns true on valid DSA response', async () => {
    req.dsa.attributesRepository.getAttributesDetails.resolves({
      'response-code': 0,
      attributeValues: [
        { name: 'msisdn', value: '639171234567' },
        { name: 'iccid', value: '8963000000000' },
      ],
    });

    const result =
      await attributesDetailsHelperService.getAttributesDetails(req);
    expect(result).to.be.true();
    sinon.assert.calledWith(
      updateStub,
      sinon.match({
        productAttributes: {
          status: 'SUCCESS',
          details: { msisdn: '639171234567', iccid: '8963000000000' },
        },
      })
    );
  });
});
