import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import sinon from 'sinon';
import { validateEnrolledAccounts } from '../../../src/services/common/enrolledAccountsService.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;
export { lab };

describe('Service :: v1 :: validateEnrolledAccountsService :: validateEnrolledAccounts', () => {
  let req;

  beforeEach(() => {
    req = {
      findAccount: sinon.stub(),
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return account details when matching accountNumber found (GFiber Prepaid)', async () => {
    const uuid = '12345';
    const mockAccounts = {
      accountList: [
        {
          segment: 'consumer',
          brand: 'GLOBE',
          brandDetail: 'GFiber Prepaid',
          accountNumber: '12345',
        },
      ],
    };

    req.findAccount.resolves(mockAccounts);

    const result = await validateEnrolledAccounts(req, uuid);

    expect(req.findAccount.calledOnceWith(uuid)).to.be.true();
    expect(result).to.equal('consumer-GLOBE-prepaidWired');
  });

  it('should return account details when matching mobileNumber found', async () => {
    const uuid = '09171234567';
    const mockAccounts = {
      accountList: [
        {
          segment: 'consumer',
          brand: 'GLOBE',
          brandDetail: 'GFiber Postpaid',
          mobileNumber: '09171234567',
        },
      ],
    };

    req.findAccount.resolves(mockAccounts);

    const result = await validateEnrolledAccounts(req, uuid);

    expect(result).to.equal('consumer-GLOBE-GFiber Postpaid');
  });

  it('should return account details when matching landlineNumber found', async () => {
    const uuid = '028812345';
    const mockAccounts = {
      accountList: [
        {
          segment: 'business',
          brand: 'GLOBE',
          brandDetail: 'Corporate Line',
          landlineNumber: '028812345',
        },
      ],
    };

    req.findAccount.resolves(mockAccounts);

    const result = await validateEnrolledAccounts(req, uuid);

    expect(result).to.equal('business-GLOBE-Corporate Line');
  });

  it('should throw ForbiddenToAccessAccount when no enrolled accounts exist', async () => {
    req.findAccount.resolves({ accountList: [] });

    try {
      await validateEnrolledAccounts(req, 'uuid-123');
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('ForbiddenToAccessAccount');
    }
  });

  it('should throw ForbiddenToAccessAccount when no matching UUID found', async () => {
    const mockAccounts = {
      accountList: [
        {
          segment: 'consumer',
          brand: 'GLOBE',
          brandDetail: 'GFiber Postpaid',
          accountNumber: '9999',
        },
      ],
    };

    req.findAccount.resolves(mockAccounts);

    try {
      await validateEnrolledAccounts(req, 'uuid-123');
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('ForbiddenToAccessAccount');
    }
  });

  it('should propagate errors from findAccount()', async () => {
    req.findAccount.rejects(new Error('DB connection failed'));

    await expect(validateEnrolledAccounts(req, 'uuid-123')).to.reject(
      Error,
      'DB connection failed'
    );
  });
});
