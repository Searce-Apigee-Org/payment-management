import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import moment from 'moment-timezone';
import {
  computeDailyWindow,
  isValidDate,
} from '../../src/util/dateTimeUtil.js';

const lab = Lab.script();
const { describe, it } = lab;
export { lab };

describe('Util :: DateUtil :: computeDailyWindow', () => {
  it('should compute window correctly before today threshold', () => {
    const now = new Date('2025-11-06T02:00:00+08:00');
    const { dateFrom, dateTo } = computeDailyWindow(
      { hh: 6, mm: 0, ss: 0 },
      now
    );

    expect(dateFrom instanceof Date).to.be.true();
    expect(dateTo instanceof Date).to.be.true();
    expect(dateTo.getTime() - dateFrom.getTime()).to.equal(24 * 60 * 60 * 1000);
  });

  it('should compute window correctly after today threshold', () => {
    const now = new Date('2025-11-06T18:00:00+08:00');
    const { dateFrom, dateTo } = computeDailyWindow(
      { hh: 6, mm: 0, ss: 0 },
      now
    );

    expect(dateFrom instanceof Date).to.be.true();
    expect(dateTo instanceof Date).to.be.true();
    expect(dateTo.getTime() - dateFrom.getTime()).to.equal(24 * 60 * 60 * 1000);
  });

  it('should format times to Manila timezone', () => {
    const now = new Date('2025-11-06T10:00:00+08:00');
    const result = computeDailyWindow({ hh: 6, mm: 0, ss: 0 }, now);
    const expectedZone = moment.tz.zone('Asia/Manila');
    expect(expectedZone).to.exist();
    expect(result.formattedDateFrom).to.be.a.date();
    expect(result.formattedDateTo).to.be.a.date();
  });
});

describe('Util :: DateUtil :: isValidDate', () => {
  it('should return true for valid yyyy-mm-dd', () => {
    expect(isValidDate('2025-11-06')).to.be.true();
  });

  it('should return false for invalid format', () => {
    expect(isValidDate('06-11-2025')).to.be.false();
    expect(isValidDate('2025/11/06')).to.be.false();
  });

  it('should return false for out-of-range month or day', () => {
    expect(isValidDate('2025-13-10')).to.be.false();
    expect(isValidDate('2025-00-10')).to.be.false();
    expect(isValidDate('2025-11-32')).to.be.false();
  });

  it('should handle leap years correctly', () => {
    expect(isValidDate('2024-02-29')).to.be.true();
    expect(isValidDate('2025-02-29')).to.be.false();
  });

  it('should reject invalid April 31 date', () => {
    expect(isValidDate('2025-04-31')).to.be.false();
  });

  it('should return false for non-string or empty input', () => {
    expect(isValidDate('')).to.be.false();
    expect(isValidDate(null)).to.be.false();
    expect(isValidDate(undefined)).to.be.false();
  });
});
