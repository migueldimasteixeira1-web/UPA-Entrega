import dotenv from 'dotenv';
import { createApp } from './app.js';
import { startEmailWorker } from './lib/email/worker.js';
import { ensureBucket } from './lib/storage.js';

dotenv.config();

const PORT = process.env.PORT || 3001;
const app = createApp();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SEDOM API running on port ${PORT}`);
});

startEmailWorker();

ensureBucket().catch((error) => console.error('Erro ao preparar o bucket de storage:', error));
