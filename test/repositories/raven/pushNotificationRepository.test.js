import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { config } from '../../../convict/config.js';
import { sendPushNotification } from '../../../src/repositories/raven/pushNotificationRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Repository :: Raven :: pushNotificationRepository :: sendPushNotification', () => {
  let soap;
  let configGetStub;

  beforeEach(() => {
    soap = { send: Sinon.stub() };
    configGetStub = Sinon.stub(config, 'get');
    configGetStub.withArgs('raven.url').returns('https://raven.test');
    configGetStub.withArgs('raven.timeout').returns(3000);
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should call soap.send and return response payload', async () => {
    const response = {
      'pnm:pushNotificationExtResp': { status: '0', notification: {} },
    };
    soap.send.resolves(response);

    const result = await sendPushNotification(
      { soap },
      { userIdentity: 'test', notifPatternId: 'pattern-1' }
    );

    expect(soap.send.calledOnce).to.be.true();
    const [opts] = soap.send.getCall(0).args;
    expect(opts.url).to.equal('https://raven.test');
    expect(opts.xml).to.contain('push-notification-ext.xml');
    expect(opts.convertToXML).to.be.false();
    expect(opts.timeout).to.equal(3000);
    expect(opts.rejectUnauthorized).to.be.false();
    expect(result).to.equal(response['pnm:pushNotificationExtResp']);
  });

  it('should throw GatewayTimeout when soap.send times out', async () => {
    soap.send.rejects({ code: 'ETIMEDOUT' });

    try {
      await sendPushNotification(
        { soap },
        { userIdentity: 'test', notifPatternId: 'pattern-1' }
      );
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err.type).to.equal('GatewayTimeout');
    }
  });

  it('should throw OperationFailed for other errors', async () => {
    soap.send.rejects({ code: 'SOME_ERROR' });

    try {
      await sendPushNotification(
        { soap },
        { userIdentity: 'test', notifPatternId: 'pattern-1' }
      );
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err.type).to.equal('OperationFailed');
    }
  });
});
