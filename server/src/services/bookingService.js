import crypto from "node:crypto";
import mongoose from "mongoose";
import { DateTime } from "luxon";
import { Mentor } from "../models/Mentor.js";
import { Booking } from "../models/Booking.js";
import { MentorDayCapacity } from "../models/MentorDayCapacity.js";
import { EmailOutbox } from "../models/EmailOutbox.js";
import { config } from "../config.js";
import {
  isInsideWorkingHours,
  localDateFor,
  parseInstant,
} from "../lib/time.js";
import { deliverOutboxForBooking } from "./emailService.js";

const duration = config.bookingDurationMinutes;

async function getEligibleMentors(start, end, session) {
  const mentors = await Mentor.find({ active: true })
    .sort({ name: 1 })
    .session(session || null);

  const eligible = [];

  for (const mentor of mentors) {
    if (
      !isInsideWorkingHours(start, end, mentor.timezone, mentor.workingHours)
    ) {
      continue;
    }

    const localDate = localDateFor(start, mentor.timezone);

    const overlap = await Booking.findOne({
      mentor: mentor._id,
      status: "confirmed",
      startAt: { $lt: end.toJSDate() },
      endAt: { $gt: start.toJSDate() },
    }).session(session || null);

    if (overlap) continue;

    const capacity = await MentorDayCapacity.findOne({
      mentor: mentor._id,
      localDate,
    }).session(session || null);

    if ((capacity?.count || 0) >= 2) continue;

    eligible.push({ mentor, localDate });
  }

  return eligible;
}

export async function listAvailableSlots({ date, timezone }) {
  const day = DateTime.fromISO(date, { zone: timezone });

  if (!day.isValid || day.toISODate() !== date) {
    throw Object.assign(new Error("Enter a valid date and IANA time zone."), {
      status: 400,
      code: "INVALID_DATE",
    });
  }

  const startOfDay = day.startOf("day");
  const nextDay = startOfDay.plus({ days: 1 });
  const slots = [];

  // Iterate through real instants to handle daylight-saving transitions.
  for (
    let cursor = startOfDay;
    cursor.plus({ minutes: duration }) <= nextDay;
    cursor = cursor.plus({ minutes: 30 })
  ) {
    if (cursor <= DateTime.now().plus({ minutes: 15 })) continue;

    const end = cursor.plus({ minutes: duration });

    const eligible = await getEligibleMentors(cursor.toUTC(), end.toUTC());

    if (eligible.length) {
      slots.push({
        startAt: cursor.toUTC().toISO(),
        label: cursor.toFormat("h:mm a"),
        offsetLabel: cursor.toFormat("ZZZZ"),
        availableMentors: eligible.length,
      });
    }
  }

  return slots;
}

export async function createBooking(input) {
  const start = parseInstant(input.startAt);

  if (!start) {
    throw Object.assign(new Error("Choose a valid available time."), {
      status: 400,
      code: "INVALID_TIME",
    });
  }

  if (start <= DateTime.now().plus({ minutes: 15 })) {
    throw Object.assign(
      new Error("Choose a future time at least 15 minutes from now."),
      { status: 400, code: "PAST_TIME" },
    );
  }

  const end = start.plus({ minutes: duration });
  const parentEmail = input.parentEmail.toLowerCase().trim();
  const session = await mongoose.startSession();

  let created;

  try {
    await session.withTransaction(
      async () => {
        const candidates = await getEligibleMentors(start, end, session);

        for (const candidate of candidates) {
          const { mentor, localDate } = candidate;

          // Ensure the mentor-day capacity document exists.
          await MentorDayCapacity.updateOne(
            { mentor: mentor._id, localDate },
            {
              $setOnInsert: {
                mentor: mentor._id,
                localDate,
                count: 0,
              },
            },
            { upsert: true, session },
          );

          // Atomically enforce the two-booking daily limit.
          const capacity = await MentorDayCapacity.findOneAndUpdate(
            {
              mentor: mentor._id,
              localDate,
              count: { $lt: 2 },
            },
            { $inc: { count: 1 } },
            { new: true, session },
          );

          if (!capacity) continue;

          // Recheck overlap within the transaction.
          const stillNoOverlap = !(await Booking.findOne({
            mentor: mentor._id,
            status: "confirmed",
            startAt: { $lt: end.toJSDate() },
            endAt: { $gt: start.toJSDate() },
          }).session(session));

          if (!stillNoOverlap) {
            await MentorDayCapacity.updateOne(
              { mentor: mentor._id, localDate },
              { $inc: { count: -1 } },
              { session },
            );

            continue;
          }

          const [booking] = await Booking.create(
            [
              {
                parentName: input.parentName.trim(),
                parentEmail,
                parentTimezone: input.parentTimezone,
                mentor: mentor._id,
                startAt: start.toJSDate(),
                endAt: end.toJSDate(),
                mentorLocalDate: localDate,
                meetingUrl: config.demoClassUrl,
                confirmationToken: crypto.randomBytes(32).toString("hex"),
              },
            ],
            { session },
          );

          // FIX: ordered:true is required when creating multiple
          // documents with a Mongoose session.
          await EmailOutbox.create(
            [
              {
                booking: booking._id,
                recipient: parentEmail,
                kind: "parent-confirmation",
              },
              {
                booking: booking._id,
                recipient: mentor.email,
                kind: "mentor-notification",
              },
            ],
            { session, ordered: true },
          );

          created = {
            bookingId: booking._id.toString(),
            confirmationToken: booking.confirmationToken,
            parentName: booking.parentName,
            parentEmail: booking.parentEmail,
            parentTimezone: booking.parentTimezone,
            mentorName: mentor.name,
            mentorTimezone: mentor.timezone,
            startAt: start.toISO(),
            endAt: end.toISO(),
            meetingUrl: booking.meetingUrl,
          };

          break;
        }

        if (!created) {
          throw Object.assign(
            new Error(
              "That time was just taken. Please choose another available slot.",
            ),
            { status: 409, code: "SLOT_UNAVAILABLE" },
          );
        }
      },
      {
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
        readPreference: "primary",
      },
    );
  } catch (error) {
    if (
      error.code === 11000 ||
      error.hasErrorLabel?.("TransientTransactionError")
    ) {
      throw Object.assign(
        new Error(
          "That time is no longer available. Please choose another slot.",
        ),
        { status: 409, code: "SLOT_UNAVAILABLE" },
      );
    }

    throw error;
  } finally {
    await session.endSession();
  }

  // Booking persistence is independent of SMTP success.
  // Email delivery status is returned for the confirmation screen.
  await deliverOutboxForBooking(created.bookingId);

  const statuses = await EmailOutbox.find({
    booking: created.bookingId,
  })
    .select("kind status")
    .lean();

  return {
    ...created,
    emails: statuses,
  };
}

export async function getBookingConfirmation(token) {
  if (typeof token !== "string" || token.length < 32) {
    return null;
  }

  const booking = await Booking.findOne({
    confirmationToken: token,
  })
    .populate("mentor")
    .select("+confirmationToken");

  if (!booking) return null;

  const emails = await EmailOutbox.find({
    booking: booking._id,
  })
    .select("kind status")
    .lean();

  return {
    parentName: booking.parentName,
    parentEmail: booking.parentEmail,
    parentTimezone: booking.parentTimezone,
    mentorName: booking.mentor.name,
    mentorTimezone: booking.mentor.timezone,
    startAt: booking.startAt.toISOString(),
    endAt: booking.endAt.toISOString(),
    meetingUrl: booking.meetingUrl,
    status: booking.status,
    emails,
  };
}
