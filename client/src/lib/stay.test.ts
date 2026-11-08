import { describe, expect, it } from 'vitest';
import { defaultPlan, parsePrompt } from '../demo/planner';
import { dateRange, money, nightsBetween } from './format';
import { safeNext } from './session';
import { groupLookalikes, groupRooms, rateLabel, recommendRate, searchTerm, splitRoomName, stayFromParams } from './stay';

const rate = (name: string, refundable: boolean, pricePerNight: number) => ({ name, refundable, pricePerNight });
const garden = [
  rate('Villa | Flexible · Breakfast', true, 7339),
  rate('Villa | Flexible · Room only', true, 6786),
  rate('Villa | Non-refundable · Breakfast', false, 6785),
];

describe('format', () => {
  it('formats paise as whole rupees', () => expect(money(2466001)).toBe('₹24,660'));
  it('counts nights across a month end', () => expect(nightsBetween('2026-12-30', '2027-01-02')).toBe(3));
  it('shortens ranges in one month', () => expect(dateRange('2026-12-12', '2026-12-15')).toBe('12–15 Dec'));
});

describe('stay params', () => {
  it('repairs a check-out before check-in', () => {
    const s = stayFromParams(new URLSearchParams('checkIn=2030-05-10&checkOut=2030-05-01'));
    expect(s.checkOut).toBe('2030-05-13');
  });
  it('rejects malformed dates and out-of-range counts', () => {
    const s = stayFromParams(new URLSearchParams('checkIn=tomorrow&adults=99&rooms=0'));
    expect(s.checkIn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(s.adults).toBe(30);
    expect(s.rooms).toBe(1);
  });
  it('sends only the place name to search', () => expect(searchTerm('Goa, India')).toBe('Goa'));
});

describe('rooms and rates', () => {
  it('splits category and rate', () => expect(splitRoomName('Villa | Flexible · Breakfast')).toEqual({ category: 'Villa', rate: 'Flexible · Breakfast' }));
  it('labels rooms without a rate from their refund flag', () => {
    expect(rateLabel({ name: 'Standard Double', refundable: true })).toBe('Flexible');
    expect(rateLabel({ name: 'Saver', refundable: false })).toBe('Non-refundable');
  });
  it('groups rates by category', () => {
    const groups = groupRooms([...garden, rate('Suite | Flexible · Breakfast', true, 10000)]);
    expect(groups.map((g) => [g.category, g.rates.length])).toEqual([['Villa', 3], ['Suite', 1]]);
  });
  it.each([
    [true, true, 'Villa | Flexible · Breakfast'],
    [true, false, 'Villa | Flexible · Room only'],
    [false, true, 'Villa | Non-refundable · Breakfast'],
  ])('recommends for plansMayChange=%s breakfast=%s', (plansMayChange, breakfast, expected) => {
    expect(recommendRate(garden, { plansMayChange, breakfast })?.name).toBe(expected);
  });
  it('recommends nothing when nothing is bookable', () => expect(recommendRate([], { plansMayChange: true, breakfast: true })).toBeUndefined());
});

describe('lookalike grouping', () => {
  const p = (id: string, type: string, ratingAvg: number) => ({ id, type, ratingAvg, destination: { slug: 'goa' } });
  it('keeps the first of each type and rating band as the lead', () => {
    const groups = groupLookalikes([p('a', 'VILLA', 9.5), p('b', 'VILLA', 9.1), p('c', 'VILLA', 8.8), p('d', 'RESORT', 9.2)]);
    expect(groups.map((g) => [g.lead.id, g.similar.map((s) => s.id)])).toEqual([['a', ['b']], ['c', []], ['d', []]]);
  });
});

describe('demo planner parsing', () => {
  it('reads the design’s example prompt', () => {
    const plan = parsePrompt('Plan 3 nights in Goa for two, 12-15 Dec. Quiet beach with a pool, under ₹9k a night. We fly from Delhi.');
    expect(plan.destination).toBe('Goa');
    expect(plan.from).toBe('Delhi');
    expect(plan.adults).toBe(2);
    expect(plan.budgetPerNight).toBe(9000);
    expect(nightsBetween(plan.checkIn, plan.checkOut)).toBe(3);
    expect(plan.checkIn.slice(5)).toBe('12-12');
    expect(plan.wants.map((w) => w.key)).toEqual(['pool', 'beach', 'quiet']);
  });
  it('does not mistake the departure city for the destination', () => {
    expect(parsePrompt('Beach break, flying from Delhi').destination).toBe('Goa');
  });
  it('applies follow-ups on top of the previous plan', () => {
    const first = parsePrompt('Manali for 2 with a spa');
    const next = parsePrompt('make it 5 nights', first);
    expect(next.destination).toBe('Manali');
    expect(nightsBetween(next.checkIn, next.checkOut)).toBe(5);
    expect(next.wants.map((w) => w.key)).toEqual(['spa']);
  });
  it('leaves the default plan alone when it reads nothing', () => {
    const base = defaultPlan();
    expect(parsePrompt('hello', base)).toEqual(base);
  });
});

describe('safeNext', () => {
  it('allows same-site paths', () => expect(safeNext('/trips?b=1')).toBe('/trips?b=1'));
  it.each(['https://evil.example', '//evil.example', null])('rejects %s', (v) => expect(safeNext(v)).toBe('/'));
});
