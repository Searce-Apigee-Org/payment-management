import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import {
  paymentAutoRefundPubSubRequest,
  refundDetails,
} from '../../src/util/examples.js';

const lab = Lab.script();
const { describe, it } = lab;

export { lab };

describe('Utils :: examples', () => {
  it('should expose a base64 payload that decodes to refundDetails', () => {
    const decoded = Buffer.from(
      paymentAutoRefundPubSubRequest,
      'base64'
    ).toString('utf8');
    const parsed = JSON.parse(decoded);

    expect(parsed).to.equal(refundDetails);
  });
});
