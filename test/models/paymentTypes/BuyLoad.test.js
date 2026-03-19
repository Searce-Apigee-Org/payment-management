import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import { validateBuyLoadRequestType } from '../../../src/models/paymentTypes/BuyLoad.js';

const lab = Lab.script();
const { describe, it } = lab;
export { lab };

describe('Util :: RequestValidator :: BuyLoadRequestTypeValidator :: validateBuyLoadRequestType', () => {
  it('should pass with valid payload using wallet', () => {
    const payload = [
      {
        wallet: 'A',
        amount: 100,
        externalTransactionId: 'TX123',
        agentName: 'AgentX',
      },
    ];

    expect(() => validateBuyLoadRequestType(payload)).to.not.throw();
  });

  it('should pass with valid payload using keyword', () => {
    const payload = [
      {
        keyword: 'LOAD50',
        amount: 50,
        externalTransactionId: 'TX124',
        agentName: 'AgentY',
      },
    ];

    expect(() => validateBuyLoadRequestType(payload)).to.not.throw();
  });

  it('should pass when agentName is an empty string', () => {
    const payload = [
      {
        wallet: 'A',
        amount: 100,
        externalTransactionId: 'TX125',
        agentName: '',
      },
    ];

    expect(() => validateBuyLoadRequestType(payload)).to.not.throw();
    expect(payload[0].agentName).to.equal(null);
  });

  it('should pass when agentName is whitespace and normalize it to null', () => {
    const payload = [
      {
        wallet: 'A',
        amount: 100,
        agentName: '   ',
      },
    ];

    expect(() => validateBuyLoadRequestType(payload)).to.not.throw();
    expect(payload[0].agentName).to.equal(null);
  });

  it('should throw InsufficientParameters when payload is empty', () => {
    const payload = [];
    expect(() => validateBuyLoadRequestType(payload)).to.throw();
  });

  it('should throw InvalidParameter when both keyword and wallet are provided', () => {
    const payload = [
      {
        keyword: 'LOAD50',
        wallet: 'L',
        amount: 100,
      },
    ];

    expect(() => validateBuyLoadRequestType(payload)).to.throw();
  });

  it('should throw InsufficientParameters when amount is missing', () => {
    const payload = [
      {
        keyword: 'LOAD50',
      },
    ];

    expect(() => validateBuyLoadRequestType(payload)).to.throw();
  });

  it('should throw InvalidParameter when wallet has invalid value', () => {
    const payload = [
      {
        wallet: 'Z',
        amount: 100,
      },
    ];

    expect(() => validateBuyLoadRequestType(payload)).to.throw();
  });

  it('should throw InvalidParameter when keyword is blank', () => {
    const payload = [
      {
        keyword: ' ',
        amount: 100,
      },
    ];

    expect(() => validateBuyLoadRequestType(payload)).to.throw();
  });
});
