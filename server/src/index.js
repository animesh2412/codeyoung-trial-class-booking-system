import { createApp } from './app.js';
import { connectDatabase } from './db.js';
import { config } from './config.js';
async function main() {
  await connectDatabase();
  const app = createApp();
  app.listen(config.port, () => console.log(`MentorSlot API listening on http://localhost:${config.port}`));
}
main().catch(error => { console.error('Could not start MentorSlot:', error.message); process.exit(1); });
