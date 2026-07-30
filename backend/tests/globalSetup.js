import { execSync } from 'node:child_process';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgresql://upa:upa_secret@db:5432/upa_entrega_test?schema=public';

// Roda uma vez antes de toda a suíte (processo separado, fora do "environment"
// injetado pelo test.env do vitest.config.js — por isso repassamos a URL
// explicitamente para o comando).
export default function globalSetup() {
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'inherit',
  });
}
