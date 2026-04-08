import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import {
  applyOonaCompTravelPricing,
  applyOonaSmartDelayPricing,
  validateOonaCompTravel,
  validateOonaSku,
  validateOonaSmartDelay,
} from '../../src/util/oonaUtil.js';

const lab = Lab.script();
const { describe, it } = lab;
export { lab };

describe('Util :: OonaUtil :: validateOonaSku', () => {
  it('should call validateOonaCompTravel for oonacomptravel', () => {
    const metadata = {
      firstName: 'John',
      lastName: 'Doe',
      email: '[john@doe.com](mailto:john@doe.com)',
      mobileNumber: '9999999999',
      startDate: '2025-11-06',
      endDate: '2025-11-07',
    };
    expect(() => validateOonaSku('oonacomptravel', metadata)).to.not.throw();
  });

  it('should call validateOonaSmartDelay for oonasmartdelay', () => {
    const metadata = {
      members: [{ firstName: 'John', lastName: 'Doe' }],
      flights: ['CX100'],
    };
    expect(() => validateOonaSku('oonasmartdelay', metadata)).to.not.throw();
  });

  it('should throw for invalid SKU type', () => {
    expect(() => validateOonaSku('invalidsku', {})).to.throw();
  });
});

describe('Util :: OonaUtil :: validateOonaCompTravel', () => {
  const valid = {
    firstName: 'John',
    lastName: 'Doe',
    email: '[john@doe.com](mailto:john@doe.com)',
    mobileNumber: '9999999999',
    startDate: '2025-11-06',
    endDate: '2025-11-07',
  };

  it('should pass for valid metadata', () => {
    expect(() => validateOonaCompTravel(valid)).to.not.throw();
  });

  it('should throw for missing metadata', () => {
    expect(() => validateOonaCompTravel(null)).to.throw();
  });

  it('should throw for empty string field', () => {
    const bad = { ...valid, firstName: '' };
    expect(() => validateOonaCompTravel(bad)).to.throw();
  });
});

describe('Util :: OonaUtil :: validateOonaSmartDelay', () => {
  const valid = {
    members: [{ firstName: 'Jane', lastName: 'Smith' }],
    flights: ['AA101'],
  };

  it('should pass for valid metadata', () => {
    expect(() => validateOonaSmartDelay(valid)).to.not.throw();
  });

  it('should throw when members array is missing', () => {
    const bad = { flights: ['AA101'] };
    expect(() => validateOonaSmartDelay(bad)).to.throw();
  });

  it('should throw when flights array is missing', () => {
    const bad = { members: [{ firstName: 'Jane', lastName: 'Smith' }] };
    expect(() => validateOonaSmartDelay(bad)).to.throw();
  });

  it('should throw when members invalid', () => {
    const bad = {
      members: [{ firstName: '', lastName: 'Smith' }],
      flights: ['AA101'],
    };
    expect(() => validateOonaSmartDelay(bad)).to.throw();
  });

  it('should throw when flights invalid', () => {
    const bad = {
      members: [{ firstName: 'Jane', lastName: 'Smith' }],
      flights: [''],
    };
    expect(() => validateOonaSmartDelay(bad)).to.throw();
  });
});

describe('Util :: OonaUtil :: applyOonaCompTravelPricing', () => {
  it('should apply comp travel pricing to miscellaneous', () => {
    const miscellaneous = {};
    const pricingData = {
      oona_promos_key: {
        oonacomptravel: { pricing: { net: 1500 } },
      },
    };
    const amount = applyOonaCompTravelPricing({
      miscellaneous,
      skuIdentifier: 'oonacomptravel',
      pricingData,
      oonaPromosKey: 'oona_promos_key',
    });
    expect(amount).to.equal(1500);
  });

  it('should throw when pricing data missing', () => {
    const miscellaneous = {};
    expect(() =>
      applyOonaCompTravelPricing({
        miscellaneous,
        skuIdentifier: 'oonacomptravel',
        pricingData: {},
        oonaPromosKey: 'badkey',
      })
    ).to.throw();
  });
});

describe('Util :: OonaUtil :: applyOonaSmartDelayPricing', () => {
  it('should calculate correctly for one member', () => {
    const params = {
      miscellaneous: {},
      settlementInfo: {
        metadata: { members: [{ firstName: 'A', lastName: 'B' }] },
      },
      pricingData: { OONA_SMART_DELAY: { base: { net: 1000 } } },
    };
    const amount = applyOonaSmartDelayPricing(params);
    expect(amount).to.equal(1000);
  });

  it('should calculate correctly for multiple members with additional pricing', () => {
    const params = {
      miscellaneous: {},
      settlementInfo: { metadata: { members: [{}, {}, {}] } },
      pricingData: {
        OONA_SMART_DELAY: { base: { net: 1000 }, additional: { net: 200 } },
      },
    };
    const amount = applyOonaSmartDelayPricing(params);
    expect(amount).to.equal(1400); // 1000 + (3-1)*200
  });

  it('should throw when pricingData missing or invalid', () => {
    const params = {
      miscellaneous: {},
      settlementInfo: { metadata: { members: [] } },
      pricingData: {},
    };
    expect(() => applyOonaSmartDelayPricing(params)).to.throw();
  });
});
