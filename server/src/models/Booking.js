import mongoose from 'mongoose';
const bookingSchema = new mongoose.Schema({
  parentName: { type: String, required: true, trim: true, maxlength: 100 },
  parentEmail: { type: String, required: true, lowercase: true, trim: true },
  parentTimezone: { type: String, required: true },
  mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor', required: true },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  mentorLocalDate: { type: String, required: true },
  status: { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed' },
  meetingUrl: { type: String, required: true },
  confirmationToken: { type: String, required: true, unique: true, select: false }
}, { timestamps: true });
bookingSchema.index({ mentor: 1, startAt: 1, status: 1 });
bookingSchema.index({ mentor: 1, mentorLocalDate: 1, status: 1 });
bookingSchema.index({ parentEmail: 1, createdAt: -1 });
export const Booking = mongoose.model('Booking', bookingSchema);
