import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .refine((v) => Buffer.byteLength(v, 'utf8') <= 72, 'Password is too long');

const email = z.string().trim().toLowerCase().email('Enter a valid email address');

export const registerSchema = z.object({
  email,
  password: passwordSchema,
  firstName: z.string().trim().min(1, 'First name is required').max(80),
  lastName: z.string().trim().min(1, 'Last name is required').max(80),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required').max(200),
});
