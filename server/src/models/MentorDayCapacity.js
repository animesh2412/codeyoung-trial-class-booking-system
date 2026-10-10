import mongoose from 'mongoose';
const capacitySchema = new mongoose.Schema({
  mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor', required: true },
  localDate: { type: String, required: true },
  count: { type: Number, default: 0, min: 0 }
}, { timestamps: true });
capacitySchema.index({ mentor: 1, localDate: 1 }, { unique: true });
export const MentorDayCapacity = mongoose.model('MentorDayCapacity', capacitySchema);
