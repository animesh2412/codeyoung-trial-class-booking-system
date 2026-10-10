import { connectDatabase } from './db.js';
import mongoose from 'mongoose';
import { Mentor } from './models/Mentor.js';
const mentors = [
  ['Aarav Sharma','mentor1@example.com',['Maths','Problem solving']],
  ['Ishita Rao','mentor2@example.com',['Coding','Creative projects']],
  ['Rohan Mehta','mentor3@example.com',['Science','Exploration']],
  ['Ananya Das','mentor4@example.com',['Maths','Logic']],
  ['Kabir Sen','mentor5@example.com',['Coding','Games']],
  ['Meera Nair','mentor6@example.com',['Science','Robotics']],
  ['Arjun Kapoor','mentor7@example.com',['Creative projects','Coding']],
  ['Diya Mukherjee','mentor8@example.com',['Maths','Problem solving']],
  ['Vivaan Patel','mentor9@example.com',['Science','Exploration']],
  ['Sara Khan','mentor10@example.com',['Coding','Creative projects']]
];
try {
  await connectDatabase();
  let created = 0;
  for (const [name, email, specialties] of mentors) {
    const result = await Mentor.updateOne({ email }, { $setOnInsert: { name, email, timezone: 'Asia/Kolkata', active: true, workingHours: { start: 10, end: 18 }, specialties } }, { upsert: true });
    if (result.upsertedCount) created++;
  }
  console.log(`Seed complete. ${created} new mentor(s) added; total mentors: ${await Mentor.countDocuments()}.`);
} catch (error) { console.error(error); process.exitCode = 1; }
finally { await mongoose.disconnect(); }
