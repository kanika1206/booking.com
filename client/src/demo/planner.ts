/**
 * DEMO-ONLY trip planner. This is a rule-based text parser, not an AI model. Itineraries are
 * templates. The stays it shortlists do come from the real search API, with real prices.
 */
import { addDays, todayIso } from '../lib/format';
import type { IconName } from '../components/icons';

export interface Plan {
  destination: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  budgetPerNight: number | null;
  wants: { key: string; label: string; amenity?: string }[];
  from: string | null;
  flightAdded: boolean;
  spaDay: boolean;
}

const KNOWN = ['Goa', 'Jaipur', 'Manali', 'Jaisalmer', 'Udaipur', 'Delhi', 'Paris', 'Rome', 'Tokyo', 'Bali', 'New York', 'Barcelona', 'Dubai', 'London'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7 };
const WANTS = [
  { re: /\bpool\b/i, key: 'pool', label: 'Pool', amenity: 'pool' },
  { re: /\bbeach(front)?\b/i, key: 'beach', label: 'Beachfront', amenity: 'beachfront' },
  { re: /\bpet/i, key: 'pet', label: 'Pet-friendly', amenity: 'pet-friendly' },
  { re: /\bbreakfast\b/i, key: 'breakfast', label: 'Breakfast', amenity: 'breakfast' },
  { re: /\bspa\b/i, key: 'spa', label: 'Spa', amenity: 'spa' },
  { re: /\bwi-?fi\b|workation/i, key: 'wifi', label: 'Fast Wi-Fi', amenity: 'wifi' },
  { re: /\bquiet\b/i, key: 'quiet', label: 'Quiet' },
];

const toNumber = (s: string) => WORDS[s.toLowerCase()] ?? Number.parseInt(s, 10);

/** Next future date for a day and month name. */
function nextDate(day: number, month: number) {
  const today = todayIso();
  const year = Number(today.slice(0, 4));
  for (const y of [year, year + 1]) {
    const iso = `${y}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (iso > today) return iso;
  }
  return addDays(today, 30);
}

export function defaultPlan(): Plan {
  const checkIn = addDays(todayIso(), 34);
  return { destination: 'Goa', checkIn, checkOut: addDays(checkIn, 3), adults: 2, children: 0, budgetPerNight: null, wants: [], from: null, flightAdded: false, spaDay: false };
}

/** Applies what it can read from the text on top of the previous plan. */
export function parsePrompt(text: string, prev: Plan = defaultPlan()): Plan {
  const next: Plan = { ...prev, wants: [...prev.wants] };

  const fromMatch = text.match(/\b(?:from|fly from|flying from)\s+([A-Za-z]{3,})/i);
  if (fromMatch) next.from = fromMatch[1]!.charAt(0).toUpperCase() + fromMatch[1]!.slice(1).toLowerCase();
  const withoutFrom = fromMatch ? text.replace(fromMatch[0], ' ') : text;
  const place = KNOWN.find((k) => new RegExp(`\\b${k}\\b`, 'i').test(withoutFrom));
  if (place) next.destination = place;

  const nightsMatch = text.match(/\b(\d+|one|two|three|four|five|six|seven)\s*(?:-\s*)?nights?\b/i);
  const nights = nightsMatch ? toNumber(nightsMatch[1]!) : null;
  const range = text.match(/\b(\d{1,2})\s*(?:-|–|to)\s*(\d{1,2})\s*([A-Za-z]{3})/);
  const month = range ? MONTHS.indexOf(range[3]!.toLowerCase()) : -1;
  if (range && month >= 0) {
    next.checkIn = nextDate(Number(range[1]), month);
    next.checkOut = addDays(next.checkIn, Math.max(1, Number(range[2]) - Number(range[1])));
  } else if (nights) {
    next.checkOut = addDays(next.checkIn, nights);
  }

  const party = text.match(/\b(\d+|two|three|four|five|six)\s*adults?\b/i);
  if (party) next.adults = toNumber(party[1]!);
  else if (/\bfor (two|2)\b|\bcouple\b/i.test(text)) next.adults = 2;
  else if (/\bsolo\b|\bfor (one|1)\b/i.test(text)) next.adults = 1;

  const budget = text.match(/(?:under|below|≤|max|upto|up to)\s*₹?\s*(\d+(?:[.,]\d+)?)\s*(k)?/i);
  if (budget) {
    const value = Number(budget[1]!.replace(',', ''));
    next.budgetPerNight = budget[2] ? value * 1000 : value;
  }

  for (const w of WANTS) {
    if (w.re.test(text) && !next.wants.some((x) => x.key === w.key)) {
      next.wants.push({ key: w.key, label: w.label, amenity: w.amenity });
    }
  }
  return next;
}

export interface ItineraryItem { time: string; title: string; note: string; icon: IconName }
export interface ItineraryDay { title: string; items: ItineraryItem[] }

const GOA: ItineraryDay[] = [
  { title: 'Arrive & unwind', items: [
    { time: '11:45', title: 'Airport transfer', note: 'Arrange with the property', icon: 'car' },
    { time: '14:00', title: 'Check in at your stay', note: 'Book below', icon: 'bed' },
    { time: '18:00', title: 'Sunset at the beach', note: 'Short walk', icon: 'compass' },
  ] },
  { title: 'Slow beach day', items: [
    { time: '09:00', title: 'Kayak Galgibaga creek', note: 'Book later', icon: 'pool' },
    { time: '13:00', title: 'Lunch at a beach shack', note: 'Local favourite', icon: 'utensils' },
    { time: '16:00', title: 'Butterfly Beach boat', note: 'Weather permitting', icon: 'heart' },
  ] },
  { title: 'Heritage & food', items: [
    { time: '10:00', title: 'Old Goa churches', note: 'UNESCO site', icon: 'compass' },
    { time: '15:00', title: 'Fontainhas walk', note: 'Latin quarter', icon: 'map-pin' },
    { time: '20:00', title: 'Goan dinner', note: 'Reserve ahead', icon: 'utensils' },
  ] },
];

const SPA: ItineraryDay = { title: 'Spa & slow day', items: [
  { time: '10:00', title: 'Spa morning', note: 'Book at the property', icon: 'heart' },
  { time: '13:00', title: 'Long lunch', note: 'Stay nearby', icon: 'utensils' },
  { time: '17:00', title: 'Evening walk', note: 'No plans needed', icon: 'compass' },
] };

const generic = (destination: string): ItineraryDay[] => [
  { title: 'Arrive & settle in', items: [
    { time: '14:00', title: 'Check in at your stay', note: 'Book below', icon: 'bed' },
    { time: '18:00', title: `Evening walk in ${destination}`, note: 'Get your bearings', icon: 'compass' },
  ] },
  { title: `Explore ${destination}`, items: [
    { time: '10:00', title: 'Main sights', note: 'Plan your route', icon: 'map-pin' },
    { time: '13:00', title: 'Local lunch', note: 'Ask your host', icon: 'utensils' },
  ] },
  { title: 'Free day', items: [{ time: '10:00', title: 'Slow morning', note: 'Your choice', icon: 'heart' }] },
];

export function itinerary(plan: Plan, nights: number): ItineraryDay[] {
  const base = plan.destination === 'Goa' ? GOA : generic(plan.destination);
  const days = plan.spaDay && base[1] ? [base[0]!, SPA, ...base.slice(2)] : base;
  return Array.from({ length: Math.max(1, nights) }, (_, i) => days[i] ?? { title: 'Free day', items: [{ time: '10:00', title: 'Slow morning', note: 'Your choice', icon: 'heart' as IconName }] });
}

export const DEMO_ACTIVITIES_MINOR = 600000;
