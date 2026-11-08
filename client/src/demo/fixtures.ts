/**
 * DEMO-ONLY DATA. Nothing here comes from the API or database. The backend has no trust checks,
 * loyalty programme, review analysis, messaging or flights. Every place that renders this data
 * must show <DemoTag />, so nobody mistakes it for a real signal.
 */

export const DEMO_GENIUS_LEVEL = 'Genius Level 2';

export interface TrustInfo { score: number; checks: string[] }

const checks = (visit: string, photoMatch: number, reviews: string) => [
  `Address confirmed by on-site visit · ${visit}`,
  `Photos match guest uploads (AI check, ${photoMatch}%)`,
  'Partner account uses 2FA · no new devices',
  'Payout account unchanged for 18 months',
  reviews,
];

const scores: Record<string, TrustInfo> = {
  'saltwater-cove-resort': { score: 96, checks: checks('Mar 2026', 98, 'All reviews from verified stays') },
  'azure-bay-villas': { score: 94, checks: checks('Jan 2026', 97, 'All reviews from verified stays') },
  'casa-fontainhas': { score: 92, checks: checks('Feb 2026', 95, 'All reviews from verified stays') },
};

/** Only the India catalogue has demo trust data. Other properties show no verified claim at all. */
export function trustFor(slug: string, country: string): TrustInfo | null {
  if (scores[slug]) return scores[slug];
  return country === 'India' ? { score: 90, checks: checks('Dec 2025', 93, 'All reviews from verified stays') } : null;
}

/** Bookings carry the destination name but not the country. */
export const hasDemoTrust = (destination: string) => ['Goa', 'Jaipur', 'Manali', 'Jaisalmer'].includes(destination);

export interface ReviewSummary {
  summary: string;
  loved: string[];
  watch: string[];
  scores: { label: string; value: number }[];
}

export const reviewSummaries: Record<string, ReviewSummary> = {
  'saltwater-cove-resort': {
    summary:
      'Guests love the calm, swimmable cove and the private plunge pools. It’s quiet even in peak season. Breakfast and staff get frequent praise. A few mention the 15-minute ride to Canacona town and patchy Wi-Fi in garden villas.',
    loved: ['Quiet, clean beach', 'Plunge pool villas', 'Friendly staff'],
    watch: ['Wi-Fi weaker in garden villas', 'No lift to upper rooms'],
    scores: [
      { label: 'Cleanliness', value: 9.4 },
      { label: 'Comfort', value: 9.3 },
      { label: 'Location', value: 9.6 },
      { label: 'Value', value: 8.8 },
      { label: 'Wi-Fi', value: 7.6 },
    ],
  },
};

export interface DemoFlight { time: string; route: string; carrier: string; pricePerPerson: number }
export const demoFlight: DemoFlight = { time: '08:15', route: 'DEL → GOI', carrier: 'IndiGo', pricePerPerson: 548000 };

export type DemoMessage =
  | { kind: 'them'; who: string; meta: string; text: string }
  | { kind: 'me'; text: string }
  | { kind: 'ai'; text: string }
  | { kind: 'blocked'; who: string; meta: string; text: string; link: string; amount: string; flags: string[] };

export interface DemoThread {
  id: string;
  initials: string;
  name: string;
  preview: string;
  when: string;
  tone?: 'ai' | 'bad';
  messages: DemoMessage[];
}

export const demoThreads: DemoThread[] = [
  {
    id: 'property',
    initials: 'SC',
    name: 'Saltwater Cove Resort',
    preview: 'Scam Shield blocked a payment request',
    when: '2m',
    tone: 'bad',
    messages: [
      { kind: 'them', who: 'Saltwater Cove', meta: '09:12 · verified sender', text: 'Thank you for booking with us! Your Garden Villa will be ready from 14:00. Would you like an airport pickup?' },
      { kind: 'me', text: 'Yes please, we land at 11:40.' },
      {
        kind: 'blocked',
        who: '“Saltwater Cove Front Desk”',
        meta: '09:41 · new device',
        text: 'URGENT: Your card failed. Pay ₹18,450 within 1 hour via bank transfer or your booking will be cancelled →',
        link: 'pay-saltwatercove-secure.example',
        amount: '₹18,450',
        flags: ['External link', 'Bank transfer', 'Urgent tone', 'New device on partner account'],
      },
      { kind: 'ai', text: 'Your booking is safe. Your card was never charged, so nothing failed. In the real product, the partner account would now be locked while the trust team verifies it.' },
    ],
  },
  {
    id: 'ai',
    initials: 'AI',
    name: 'Booking AI Support',
    preview: 'Your late check-out request is…',
    when: '1h',
    tone: 'ai',
    messages: [{ kind: 'ai', text: 'Your late check-out request is with the property. I’ll let you know as soon as they reply.' }],
  },
  {
    id: 'support',
    initials: 'BK',
    name: 'Customer Service',
    preview: 'Case #88210 resolved',
    when: 'Mar',
    messages: [{ kind: 'them', who: 'Customer Service', meta: 'Mar', text: 'Case #88210 is resolved. Thanks for your patience.' }],
  },
];

export const demoReplies: Record<string, string> = {
  'Confirm my pickup time': 'Your 11:40 arrival is noted, and the property would confirm the pickup here.',
  'Request late check-out': 'I’ve asked the property about late check-out. Replies usually take about 10 minutes.',
  'Get invoice': 'Your invoice would appear under Documents on your trip.',
};
