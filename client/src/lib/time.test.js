import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';

describe('parent-local time display', () => {
  it('renders the same UTC instant in the selected parent timezone', () => {
    const instant = DateTime.fromISO('2027-01-15T15:00:00.000Z');
    expect(instant.setZone('America/New_York').toFormat('h:mm a')).toBe('10:00 AM');
    expect(instant.setZone('Asia/Kolkata').toFormat('h:mm a')).toBe('8:30 PM');
  });
  it('shows distinct offsets for the repeated fall-back hour', () => {
    const first = DateTime.fromISO('2027-11-07T05:30:00.000Z').setZone('America/New_York');
    const second = DateTime.fromISO('2027-11-07T06:30:00.000Z').setZone('America/New_York');
    expect(first.toFormat('h:mm a')).toBe('1:30 AM');
    expect(second.toFormat('h:mm a')).toBe('1:30 AM');
    expect(first.toFormat('ZZZZ')).not.toBe(second.toFormat('ZZZZ'));
  });
});
