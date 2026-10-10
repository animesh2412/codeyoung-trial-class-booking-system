import mongoose from 'mongoose';
const mentorSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  timezone: { type: String, required: true, default: 'Asia/Kolkata' },
  active: { type: Boolean, default: true },
  workingHours: { start: { type: Number, default: 10 }, end: { type: Number, default: 18 } },
  specialties: { type: [String], default: ['Creative learning'] }
}, { timestamps: true });
mentorSchema.index({ email: 1 }, { unique: true });
export const Mentor = mongoose.model('Mentor', mentorSchema);
