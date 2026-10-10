import { DateTime, IANAZone } from 'luxon';
export function isValidTimezone(zone) { return typeof zone === 'string' && IANAZone.isValidZone(zone); }
export function parseInstant(value) {
  if (typeof value !== 'string') return null;
  const dt = DateTime.fromISO(value, { setZone: true });
  return dt.isValid ? dt.toUTC() : null;
}
export function localDateFor(instant, zone) { return instant.setZone(zone).toISODate(); }
export function isInsideWorkingHours(start, end, zone, hours) {
  const localStart = start.setZone(zone);
  const localEnd = end.setZone(zone);
  if (localStart.toISODate() !== localEnd.minus({ milliseconds: 1 }).toISODate()) return false;
  const startMinute = localStart.hour * 60 + localStart.minute;
  const endMinute = localEnd.hour * 60 + localEnd.minute;
  return startMinute >= hours.start * 60 && endMinute <= hours.end * 60 && localStart.minute % 30 === 0;
}
export function formatForZone(instant, zone) {
  return instant.setZone(zone).toFormat("ccc, LLL d, yyyy 'at' h:mm a ZZZZ");
}
