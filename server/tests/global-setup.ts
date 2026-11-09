import { execSync } from 'node:child_process';

export default function setup() {
  execSync('npx prisma migrate deploy', {
    stdio: 'pipe',
    env: {
      ...process.env,
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgresql://booking:booking_local_only@localhost:5433/booking_test',
    },
  });
}
