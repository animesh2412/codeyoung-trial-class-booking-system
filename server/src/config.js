import dotenv from 'dotenv';
dotenv.config();
export const config = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mentorslot',
  demoClassUrl: process.env.DEMO_CLASS_URL || 'https://example.com/demo-class',
  bookingDurationMinutes: Number(process.env.BOOKING_DURATION_MINUTES || 30),
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'MentorSlot <no-reply@example.com>'
  }
};
