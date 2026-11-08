import { describe, expect, it } from 'vitest';
import { parseDate } from '../src/lib/dates.js';
import { peakOccupancy } from '../src/modules/availability/availability.service.js';
import { calculateQuote } from '../src/modules/pricing/pricing.service.js';

const stay = (a: string, b: string, roomsCount = 1) => ({
  checkIn: parseDate(a), checkOut: parseDate(b), roomsCount,
});

describe('peakOccupancy', () => {
  const from = parseDate('2030-01-10');
  const to = parseDate('2030-01-15');

  it('counts nothing when no bookings', () => {
    expect(peakOccupancy([], from, to)).toBe(0);
  });
  it('does not sum bookings that overlap the stay but not each other', () => {
    expect(peakOccupancy([stay('2030-01-09', '2030-01-11'), stay('2030-01-13', '2030-01-16')], from, to)).toBe(1);
  });
  it('sums bookings on the same night', () => {
    expect(peakOccupancy([stay('2030-01-10', '2030-01-12', 2), stay('2030-01-11', '2030-01-13')], from, to)).toBe(3);
  });
  it('treats check-out day as free', () => {
    expect(peakOccupancy([stay('2030-01-05', '2030-01-10'), stay('2030-01-15', '2030-01-18')], from, to)).toBe(0);
  });
});

describe('calculateQuote', () => {
  it('multiplies nights and rooms and applies tax', () => {
    const q = calculateQuote({ pricePerNight: 10000, checkIn: parseDate('2030-01-10'), checkOut: parseDate('2030-01-13'), rooms: 2 });
    expect(q).toMatchObject({ nights: 3, subtotal: 60000, taxes: 7200, total: 67200, currency: 'USD' });
  });
  it('rounds tax to whole minor units', () => {
    const q = calculateQuote({ pricePerNight: 333, checkIn: parseDate('2030-01-10'), checkOut: parseDate('2030-01-11'), rooms: 1 });
    expect(q.taxes).toBe(40);
    expect(q.total).toBe(373);
  });
  it('is correct across a daylight saving boundary', () => {
    const q = calculateQuote({ pricePerNight: 100, checkIn: parseDate('2030-03-30'), checkOut: parseDate('2030-04-01'), rooms: 1 });
    expect(q.nights).toBe(2);
  });
});
