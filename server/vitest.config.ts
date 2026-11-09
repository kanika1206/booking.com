import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/global-setup.ts'],
    fileParallelism: false,
    testTimeout: 30000,
    env: {
      NODE_ENV: 'test',
      // Docker Postgres by default; set TEST_DATABASE_URL to use another server (it must end in /booking_test).
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgresql://booking:booking_local_only@localhost:5433/booking_test',
      JWT_SECRET: 'test-only-secret-test-only-secret-1234',
      BCRYPT_COST: '4',
      TAX_RATE: '0.12',
      CURRENCY: 'USD',
      MAX_STAY_NIGHTS: '30',
    },
  },
});
