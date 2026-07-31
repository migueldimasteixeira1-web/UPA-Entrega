import dotenv from 'dotenv';
import { createApp } from './app.js';
import { startEmailWorker } from './lib/email/worker.js';

dotenv.config();

const PORT = process.env.PORT || 3001;
const app = createApp();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`UPA Entrega API running on port ${PORT}`);
});

startEmailWorker();
