import nodemailer from 'nodemailer';
import { config } from '../config.js';
import { EmailOutbox } from '../models/EmailOutbox.js';
import { Booking } from '../models/Booking.js';
import { Mentor } from '../models/Mentor.js';
import { DateTime } from 'luxon';
let transporter;
function getTransporter() {
  if (!config.smtp.host || !config.smtp.user || !config.smtp.pass) return null;
  if (!transporter) transporter = nodemailer.createTransport({
    host: config.smtp.host, port: config.smtp.port, secure: config.smtp.secure,
    auth: { user: config.smtp.user, pass: config.smtp.pass }
  });
  return transporter;
}
export async function deliverOutboxForBooking(bookingId) {
  const transport = getTransporter();
  const records = await EmailOutbox.find({ booking: bookingId, status: { $in: ['pending', 'failed'] } });
  const booking = await Booking.findById(bookingId).populate('mentor');
  if (!booking) return;
  for (const record of records) {
    record.attempts += 1;
    if (!transport) {
      record.status = 'failed';
      record.lastError = 'SMTP is not configured. Add SMTP settings to server/.env.';
      await record.save();
      console.warn(`[email-not-sent] ${record.kind} -> ${record.recipient}: SMTP not configured`);
      continue;
    }
    const parentTime = DateTime.fromJSDate(booking.startAt).setZone(booking.parentTimezone).toFormat("ccc, LLL d, yyyy 'at' h:mm a ZZZZ");
    const mentorTime = DateTime.fromJSDate(booking.startAt).setZone(booking.mentor.timezone).toFormat("ccc, LLL d, yyyy 'at' h:mm a ZZZZ");
    const isParent = record.kind === 'parent-confirmation';
    const subject = isParent ? 'Your trial class is confirmed' : 'A new trial class has been assigned to you';
    const text = isParent
      ? `Hi ${booking.parentName},

Your trial class is confirmed.
Time in your timezone (${booking.parentTimezone}): ${parentTime}
Mentor: ${booking.mentor.name}
Meeting link: ${booking.meetingUrl}

Please join a few minutes early.

MentorSlot`
      : `Hi ${booking.mentor.name},

A trial class has been assigned to you.
Time in your timezone (${booking.mentor.timezone}): ${mentorTime}
Parent: ${booking.parentName}
Meeting link: ${booking.meetingUrl}

MentorSlot`;
    try {
      await transport.sendMail({ from: config.smtp.from, to: record.recipient, subject, text });
      record.status = 'sent'; record.sentAt = new Date(); record.lastError = '';
    } catch (error) {
      record.status = 'failed'; record.lastError = String(error?.message || 'Email delivery failed').slice(0, 500);
      console.error(`Email delivery failed for ${record.recipient}:`, record.lastError);
    }
    await record.save();
  }
}
export async function retryFailedEmails() {
  const bookings = await EmailOutbox.distinct('booking', { status: 'failed', attempts: { $lt: 5 } });
  for (const bookingId of bookings) await deliverOutboxForBooking(bookingId);
}
