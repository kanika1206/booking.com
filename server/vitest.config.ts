import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/global-setup.ts'],
    fileParallelism: false,
    testTimeout: 30000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://booking:booking_local_only@localhost:5433/booking_test',
      JWT_SECRET: 'test-only-secret-test-only-secret-1234',
      BCRYPT_COST: '4',
      TAX_RATE: '0.12',
      CURRENCY: 'USD',
      MAX_STAY_NIGHTS: '30',
    },
  },
});
