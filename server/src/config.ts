import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(604800),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
  BCRYPT_COST: z.coerce.number().int().min(4).max(15).default(12),
  TAX_RATE: z.coerce.number().min(0).max(1).default(0.12),
  CURRENCY: z.string().length(3).default('USD'),
  MAX_STAY_NIGHTS: z.coerce.number().int().positive().default(30),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}
const env = parsed.data;

export const config = {
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  port: env.PORT,
  clientOrigin: env.CLIENT_ORIGIN,
  auth: {
    jwtSecret: env.JWT_SECRET,
    expiresInSeconds: env.JWT_EXPIRES_IN_SECONDS,
    bcryptCost: env.BCRYPT_COST,
    cookieName: 'booking_session',
  },
  pricing: { taxRate: env.TAX_RATE, currency: env.CURRENCY },
  booking: { maxStayNights: env.MAX_STAY_NIGHTS },
} as const;
