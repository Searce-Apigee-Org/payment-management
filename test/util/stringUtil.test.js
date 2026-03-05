import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import { compareLowerCase, encode } from '../../src/util/stringUtil.js';

const lab = Lab.script();
const { describe, it } = lab;
export { lab };

describe('Util :: StringUtil :: compareLowerCase', () => {
  it('should return true when strings match ignoring case', () => {
    expect(compareLowerCase('Hello', 'hello')).to.be.true();
  });

  it('should return false when strings differ', () => {
    expect(compareLowerCase('Hello', 'World')).to.be.false();
  });

  it('should handle empty strings correctly', () => {
    expect(compareLowerCase('', '')).to.be.true();
    expect(compareLowerCase('', 'a')).to.be.false();
  });

  it('should handle special characters correctly', () => {
    expect(compareLowerCase('A_B-C', 'a_b-c')).to.be.true();
  });
});

describe('Util :: StringUtil :: encode', () => {
  it('should encode ASCII text to base64 safely', () => {
    const result = encode('hello');
    // 'aGVsbG8' is the URL-safe base64 of "hello"
    expect(result).to.equal('aGVsbG8');
  });

  it('should encode binary buffers correctly', () => {
    const buf = Uint8Array.from([104, 101, 108, 108, 111]); // "hello"
    const result = encode(buf);
    expect(result).to.equal('aGVsbG8');
  });

  it('should remove padding and use URL-safe characters', () => {
    const buf = Buffer.from('any carnal pleasure.', 'utf8');
    const encoded = encode(buf);
    expect(encoded.includes('=')).to.be.false();
    expect(encoded).to.not.include('+');
    expect(encoded).to.not.include('/');
  });

  it('should be reversible with standard base64 decoding', () => {
    const str = 'data123';
    const encoded = encode(str);
    const decoded = Buffer.from(
      encoded.replace(/-/g, '+').replace(/_/g, '/'),
      'base64'
    ).toString();
    expect(decoded).to.equal(str);
  });
});
