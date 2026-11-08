import { z } from 'zod';
import { config } from '../config.js';

const MS_PER_DAY = 86_400_000;

/** Stay dates are calendar dates, handled as UTC midnight to avoid timezone drift. */
export const parseDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
export const formatDate = (date: Date) => date.toISOString().slice(0, 10);
export const todayUtc = () => parseDate(new Date().toISOString().slice(0, 10));
export const nightsBetween = (from: Date, to: Date) =>
  Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
export const addDays = (date: Date, days: number) => new Date(date.getTime() + days * MS_PER_DAY);

export const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format')
  .refine((v) => {
    const d = parseDate(v);
    return !Number.isNaN(d.getTime()) && formatDate(d) === v;
  }, 'Not a valid calendar date');

/** Adds stay rules to any schema containing checkIn and checkOut. */
export function validateStay(
  value: { checkIn?: string; checkOut?: string },
  ctx: z.RefinementCtx,
) {
  const { checkIn, checkOut } = value;
  if (!checkIn && !checkOut) return;
  if (!checkIn || !checkOut) {
    ctx.addIssue({
      code: 'custom',
      path: [checkIn ? 'checkOut' : 'checkIn'],
      message: 'checkIn and checkOut must be provided together',
    });
    return;
  }
  const from = parseDate(checkIn);
  const to = parseDate(checkOut);
  if (from < todayUtc()) {
    ctx.addIssue({ code: 'custom', path: ['checkIn'], message: 'Check-in cannot be in the past' });
  }
  if (to <= from) {
    ctx.addIssue({ code: 'custom', path: ['checkOut'], message: 'Check-out must be after check-in' });
  } else if (nightsBetween(from, to) > config.booking.maxStayNights) {
    ctx.addIssue({
      code: 'custom',
      path: ['checkOut'],
      message: `Stays are limited to ${config.booking.maxStayNights} nights`,
    });
  }
}
