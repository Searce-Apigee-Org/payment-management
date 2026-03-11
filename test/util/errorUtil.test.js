import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import { formatPushNotificationExtError } from '../../src/util/errorUtil.js';

const lab = Lab.script();
const { describe, it } = lab;

export { lab };

describe('Util :: errorUtil :: formatPushNotificationExtError', () => {
  it('should throw GatewayTimeout when error code is ECONNABORTED', () => {
    try {
      formatPushNotificationExtError({ code: 'ECONNABORTED' });
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err.type).to.equal('GatewayTimeout');
    }
  });

  it('should throw GatewayTimeout when error code is ETIMEDOUT', () => {
    try {
      formatPushNotificationExtError({ code: 'ETIMEDOUT' });
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err.type).to.equal('GatewayTimeout');
    }
  });

  it('should throw GatewayTimeout when error code is ECONNRESET', () => {
    try {
      formatPushNotificationExtError({ code: 'ECONNRESET' });
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err.type).to.equal('GatewayTimeout');
    }
  });

  it('should throw GatewayTimeout when error status is 10', () => {
    try {
      formatPushNotificationExtError({ status: 10 });
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err.type).to.equal('GatewayTimeout');
    }
  });

  it('should throw OperationFailed for other errors', () => {
    try {
      formatPushNotificationExtError({ code: 'OTHER' });
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err.type).to.equal('OperationFailed');
    }
  });
});
