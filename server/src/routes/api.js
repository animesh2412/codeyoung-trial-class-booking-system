import { Router } from 'express';
import { z } from 'zod';
import { DateTime, IANAZone } from 'luxon';
import { Mentor } from '../models/Mentor.js';
import { listAvailableSlots, createBooking, getBookingConfirmation } from '../services/bookingService.js';
import { isValidTimezone } from '../lib/time.js';
const router = Router();
router.get('/health', (req, res) => res.json({ status: 'ok', service: 'mentorslot-api' }));
router.get('/timezones', (req, res) => res.json({ timezones: ['America/New_York','America/Los_Angeles','America/Chicago','Europe/London','Europe/Dublin','Asia/Kolkata','Asia/Dubai','Australia/Sydney','Pacific/Auckland'] }));
router.get('/slots', async (req, res, next) => {
  try {
    const { date, timezone } = req.query;
    if (typeof date !== 'string' || typeof timezone !== 'string' || !isValidTimezone(timezone)) return res.status(400).json({ error: { code: 'INVALID_QUERY', message: 'Provide a date and valid IANA time zone.' } });
    res.json({ date, timezone, durationMinutes: 30, slots: await listAvailableSlots({ date, timezone }) });
  } catch (error) { next(error); }
});
const bookingSchema = z.object({
  parentName: z.string().trim().min(2).max(100),
  parentEmail: z.string().trim().email().max(254),
  parentTimezone: z.string().refine(isValidTimezone, 'Use a valid IANA time zone.'),
  startAt: z.string().min(10).max(80)
});
router.post('/bookings', async (req, res, next) => {
  try {
    const parsed = bookingSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Check your details.' } });
    const booking = await createBooking(parsed.data);
    res.status(201).json({ booking });
  } catch (error) { next(error); }
});
router.get('/bookings/confirmation/:token', async (req, res) => {
  const booking = await getBookingConfirmation(req.params.token);
  if (!booking) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'This confirmation link is invalid or has expired.' } });
  res.json({ booking });
});
export default router;
