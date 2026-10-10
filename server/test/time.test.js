import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';
import { isValidTimezone, parseInstant, isInsideWorkingHours } from '../src/lib/time.js';
describe('time-zone utilities', () => {
  it('accepts IANA zones and rejects invalid zones', () => { expect(isValidTimezone('America/New_York')).toBe(true); expect(isValidTimezone('Not/AZone')).toBe(false); });
  it('parses an offset-bearing instant and normalizes to UTC', () => { expect(parseInstant('2027-01-15T10:00:00-05:00').toISO()).toBe('2027-01-15T15:00:00.000Z'); });
  it('checks mentor-local working hours', () => {
    const start = DateTime.fromISO('2027-01-15T10:00:00', { zone: 'Asia/Kolkata' }).toUTC();
    expect(isInsideWorkingHours(start, start.plus({ minutes: 30 }), 'Asia/Kolkata', { start: 10, end: 18 })).toBe(true);
    expect(isInsideWorkingHours(start, start.plus({ minutes: 30 }), 'Europe/London', { start: 10, end: 18 })).toBe(false);
  });
  it('walks through the spring DST gap by instants, not invalid wall-clock times', () => {
    const before = DateTime.fromISO('2027-03-14T01:30:00', { zone: 'America/New_York' });
    expect(before.plus({ minutes: 30 }).toFormat('HH:mm')).toBe('03:00');
  });
});
