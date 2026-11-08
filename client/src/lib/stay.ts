import { addDays, todayIso } from './format';
import type { Room } from './api';

/** The trip a visitor is looking at. It lives in the URL, so every page can be linked and reloaded. */
export interface Stay {
  destination: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  rooms: number;
}

const int = (v: string | null, fallback: number, min: number, max: number) => {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isNaN(n) ? fallback : Math.min(max, Math.max(min, n));
};
const validDate = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

export function defaultStay(): Stay {
  const checkIn = addDays(todayIso(), 34);
  return { destination: 'Goa', checkIn, checkOut: addDays(checkIn, 3), adults: 2, children: 0, rooms: 1 };
}

export function stayFromParams(p: URLSearchParams): Stay {
  const d = defaultStay();
  const checkIn = validDate(p.get('checkIn')) ?? d.checkIn;
  const out = validDate(p.get('checkOut'));
  return {
    destination: p.get('destination') ?? d.destination,
    checkIn,
    checkOut: out && out > checkIn ? out : addDays(checkIn, 3),
    adults: int(p.get('adults'), d.adults, 1, 30),
    children: int(p.get('children'), d.children, 0, 20),
    rooms: int(p.get('rooms'), d.rooms, 1, 8),
  };
}

export function stayToParams(s: Stay) {
  return new URLSearchParams({
    destination: s.destination,
    checkIn: s.checkIn,
    checkOut: s.checkOut,
    adults: String(s.adults),
    children: String(s.children),
    rooms: String(s.rooms),
  });
}

/** Search matches on one term, so "Goa, India" must be sent as "Goa". */
export const searchTerm = (destination: string) => destination.split(',')[0]!.trim();

/**
 * Seeded rooms are named "Room category | Rate". The API has one row per rate, so the client
 * groups rows into the design's room cards. Rooms without the separator become a single rate.
 */
export function splitRoomName(name: string) {
  const [category, rate] = name.split(' | ');
  return { category: category!, rate: rate ?? null };
}

export function rateLabel(room: Pick<Room, 'name' | 'refundable'>) {
  return splitRoomName(room.name).rate ?? (room.refundable ? 'Flexible' : 'Non-refundable');
}

export const includesBreakfast = (room: Pick<Room, 'name'>) => /breakfast/i.test(splitRoomName(room.name).rate ?? '');

export function groupRooms<T extends Pick<Room, 'name'>>(rooms: T[]) {
  const groups = new Map<string, T[]>();
  for (const room of rooms) {
    const { category } = splitRoomName(room.name);
    groups.set(category, [...(groups.get(category) ?? []), room]);
  }
  return [...groups.entries()].map(([category, rates]) => ({ category, rates }));
}

/** Picks the rate that fits the two answers in the "Not sure which rate?" helper. */
export function recommendRate<T extends Pick<Room, 'name' | 'refundable' | 'pricePerNight'>>(
  rates: T[],
  answers: { plansMayChange: boolean; breakfast: boolean },
) {
  const score = (r: T) =>
    (r.refundable === answers.plansMayChange ? 2 : 0) + (includesBreakfast(r) === answers.breakfast ? 1 : 0);
  return [...rates].sort((a, b) => score(b) - score(a) || a.pricePerNight - b.pricePerNight)[0];
}

/** Collapses results with the same type and rating band under one card, unless switched off. */
export function groupLookalikes<T extends { type: string; ratingAvg: number; destination: { slug: string } }>(items: T[]) {
  const groups = new Map<string, { lead: T; similar: T[] }>();
  for (const item of items) {
    const key = `${item.destination.slug}:${item.type}:${Math.floor(item.ratingAvg)}`;
    const group = groups.get(key);
    if (group) group.similar.push(item);
    else groups.set(key, { lead: item, similar: [] });
  }
  return [...groups.values()];
}
