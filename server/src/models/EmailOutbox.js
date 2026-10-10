import mongoose from 'mongoose';
const emailOutboxSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  recipient: { type: String, required: true, lowercase: true, trim: true },
  kind: { type: String, enum: ['parent-confirmation', 'mentor-notification'], required: true },
  status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
  attempts: { type: Number, default: 0 },
  lastError: { type: String, default: '' },
  sentAt: { type: Date }
}, { timestamps: true });
emailOutboxSchema.index({ booking: 1, kind: 1 }, { unique: true });
emailOutboxSchema.index({ status: 1, createdAt: 1 });
export const EmailOutbox = mongoose.model('EmailOutbox', emailOutboxSchema);
