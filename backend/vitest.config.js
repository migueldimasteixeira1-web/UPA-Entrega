import { defineConfig } from 'vitest/config';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgresql://upa:upa_secret@db:5432/upa_entrega_test?schema=public';

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
    },
    globalSetup: ['./tests/globalSetup.js'],
    setupFiles: ['./tests/setup.js'],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
