import { execSync } from 'node:child_process';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgresql://upa:upa_secret@db:5432/upa_entrega_test?schema=public';
const TEST_S3_ENDPOINT = process.env.TEST_S3_ENDPOINT || 'http://minio:9000';

// Roda uma vez antes de toda a suíte (processo separado, fora do "environment"
// injetado pelo test.env do vitest.config.js — por isso repassamos a URL
// explicitamente para o comando, e setamos process.env aqui antes de
// importar storage.js pra ele montar o client S3 com o endpoint certo).
export default async function globalSetup() {
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'inherit',
  });

  process.env.S3_ENDPOINT = TEST_S3_ENDPOINT;
  process.env.S3_BUCKET = 'upa-entrega-test';
  process.env.S3_ACCESS_KEY = 'minioadmin';
  process.env.S3_SECRET_KEY = 'minioadmin';
  const { ensureBucket } = await import('../src/lib/storage.js');
  await ensureBucket();
}
