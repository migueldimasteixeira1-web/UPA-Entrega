import { defineConfig } from 'vitest/config';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgresql://upa:upa_secret@db:5432/upa_entrega_test?schema=public';

// Mesmo raciocínio do TEST_DATABASE_URL: "minio" é o hostname certo quando
// os testes rodam dentro da rede do compose (CI, docker exec); rodando do
// host (dev local via ./iniciar-local.sh) precisa de TEST_S3_ENDPOINT
// apontando pra localhost.
const TEST_S3_ENDPOINT = process.env.TEST_S3_ENDPOINT || 'http://minio:9000';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      JWT_SECRET: 'test_jwt_secret_do_not_use_in_prod',
      JWT_EXPIRES_IN: '8h',
      FRONTEND_URL: 'http://localhost:5173',
      NODE_ENV: 'test',
      S3_ENDPOINT: TEST_S3_ENDPOINT,
      S3_BUCKET: 'upa-entrega-test',
      S3_ACCESS_KEY: 'minioadmin',
      S3_SECRET_KEY: 'minioadmin',
    },
    globalSetup: ['./tests/globalSetup.js'],
    setupFiles: ['./tests/setup.js'],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
