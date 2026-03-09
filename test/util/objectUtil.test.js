import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import { checkIfEmptyProp, hasAttribute } from '../../src/util/objectUtil.js';

const lab = Lab.script();
const { describe, it } = lab;

export { lab };

describe('Util :: objectUtil :: checkIfEmptyProp', () => {
  it('should return empty string for falsy inputs', () => {
    const falsyValues = [undefined, null, '', 0, false, NaN];

    for (const v of falsyValues) {
      expect(checkIfEmptyProp(v)).to.equal('');
    }
  });

  it('should return the original value for truthy inputs', () => {
    const obj = { a: 1 };
    const arr = [1, 2, 3];

    expect(checkIfEmptyProp('1692020940')).to.equal('1692020940');
    expect(checkIfEmptyProp(123)).to.equal(123);
    expect(checkIfEmptyProp(true)).to.equal(true);
    expect(checkIfEmptyProp(obj)).to.equal(obj);
    expect(checkIfEmptyProp(arr)).to.equal(arr);
  });
});

describe('Util :: objectUtil :: hasAttribute', () => {
  it('should return true when attribute exists and is not null', () => {
    const obj = { name: 'Alice' };
    const result = hasAttribute(obj, 'name');
    expect(result).to.be.true();
  });

  it('should return false when attribute value is null', () => {
    const obj = { name: null };
    const result = hasAttribute(obj, 'name');
    expect(result).to.be.false();
  });

  it('should return false when attribute does not exist', () => {
    const obj = { name: 'Alice' };
    const result = hasAttribute(obj, 'age');
    expect(result).to.be.false();
  });
});
