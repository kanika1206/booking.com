import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient, type PropertyType } from '@prisma/client';

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to seed: creates accounts with published demo passwords.');
  process.exit(1);
}

const prisma = new PrismaClient();
const img = (id: string, w = 1200) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const USD_TO_INR = 85; // The international catalogue below is priced in dollars; amounts are stored in paise.
const TAX_RATE = Number(process.env.TAX_RATE ?? 0.12);
const scene = (name: string) => `/illustrations/scene-${name}.svg`;

const destinations = [
  { slug: 'paris', name: 'Paris', country: 'France', image: '1502602898657-3e91760cbb34', featured: false, lat: 48.8566, lng: 2.3522, description: 'Grand boulevards, riverside walks and neighbourhood bistros.' },
  { slug: 'rome', name: 'Rome', country: 'Italy', image: '1552832230-c0197dd311b5', featured: false, lat: 41.9028, lng: 12.4964, description: 'Ancient landmarks around every corner of a lively modern city.' },
  { slug: 'tokyo', name: 'Tokyo', country: 'Japan', image: '1540959733332-eab4deabeeaf', featured: false, lat: 35.6762, lng: 139.6503, description: 'Neon districts, quiet shrines and world-class dining.' },
  { slug: 'bali', name: 'Bali', country: 'Indonesia', image: '1537996194471-e657df975ab4', featured: false, lat: -8.4095, lng: 115.1889, description: 'Rice terraces, surf beaches and calm jungle retreats.' },
  { slug: 'new-york', name: 'New York', country: 'United States', image: '1496442226666-8d4d0e62e6e9', featured: false, lat: 40.7128, lng: -74.006, description: 'Skyline views, Broadway nights and endless neighbourhoods.' },
  { slug: 'barcelona', name: 'Barcelona', country: 'Spain', image: '1583422409516-2895a77efded', featured: false, lat: 41.3874, lng: 2.1686, description: 'Modernist architecture, tapas bars and a city beach.' },
  { slug: 'dubai', name: 'Dubai', country: 'United Arab Emirates', image: '1512453979798-5ea266f8880c', featured: false, lat: 25.2048, lng: 55.2708, description: 'Record-breaking towers, desert escapes and Gulf beaches.' },
  { slug: 'london', name: 'London', country: 'United Kingdom', image: '1513635269975-59663e0ac1ad', featured: false, lat: 51.5072, lng: -0.1276, description: 'Royal parks, free museums and historic pubs.' },
];

const amenities: Record<string, string> = {
  wifi: 'Free WiFi', pool: 'Swimming pool', spa: 'Spa', gym: 'Fitness centre', parking: 'Parking',
  breakfast: 'Breakfast included', restaurant: 'Restaurant', bar: 'Bar', 'airport-shuttle': 'Airport shuttle',
  'pet-friendly': 'Pet friendly', 'family-rooms': 'Family rooms', beachfront: 'Beachfront',
  'room-service': 'Room service', kitchen: 'Kitchen', 'air-conditioning': 'Air conditioning',
  balcony: 'Balcony', tv: 'Flat-screen TV', minibar: 'Minibar', 'sea-view': 'Sea view', laundry: 'Laundry',
};

const hotelImages = [
  '1566073771259-6a8506099945', '1551882547-ff40c63fe5fa', '1520250497591-112f2f40a3f4',
  '1542314831-068cd1dbfeeb', '1571896349842-33c89424de2d', '1582719478250-c89cae4dc85b',
  '1564501049412-61c2a3083791', '1618773928121-c32242e63f39', '1590490360182-c33d57733427',
  '1631049307264-da0ec9d70304', '1611892440504-42a792e24d32', '1578683010236-d716f9a3f461',
  '1455587734955-081b22074882', '1445019980597-93fa8acb246c', '1496417263034-38ec4f0b665a',
];

// All property names are fictional. [name, type, stars, destination, base price in dollars, amenities]
type Seed = [string, PropertyType, number, string, number, string[]];
const properties: Seed[] = [
  ['Hotel Lumière Saint-Honoré', 'HOTEL', 5, 'paris', 420, ['wifi', 'spa', 'restaurant', 'bar', 'room-service', 'gym']],
  ['Maison du Canal', 'GUESTHOUSE', 3, 'paris', 135, ['wifi', 'breakfast', 'pet-friendly']],
  ['Montmartre Loft Apartments', 'APARTMENT', 4, 'paris', 190, ['wifi', 'kitchen', 'laundry', 'family-rooms']],
  ['Le Petit Dortoir', 'HOSTEL', 2, 'paris', 48, ['wifi', 'bar', 'laundry']],
  ['Palazzo Aurelio', 'HOTEL', 5, 'rome', 380, ['wifi', 'restaurant', 'bar', 'spa', 'room-service', 'airport-shuttle']],
  ['Trastevere Courtyard House', 'GUESTHOUSE', 3, 'rome', 118, ['wifi', 'breakfast', 'air-conditioning']],
  ['Villa Appia Antica', 'VILLA', 4, 'rome', 310, ['wifi', 'pool', 'parking', 'kitchen', 'family-rooms']],
  ['Colosseo Hostel & Terrace', 'HOSTEL', 2, 'rome', 42, ['wifi', 'bar', 'air-conditioning']],
  ['Shinjuku Skyline Hotel', 'HOTEL', 4, 'tokyo', 240, ['wifi', 'restaurant', 'gym', 'bar', 'laundry']],
  ['Asakusa Ryokan Hanami', 'GUESTHOUSE', 4, 'tokyo', 205, ['wifi', 'breakfast', 'spa']],
  ['Shibuya Micro Suites', 'APARTMENT', 3, 'tokyo', 112, ['wifi', 'kitchen', 'laundry', 'air-conditioning']],
  ['Nakameguro Riverside Hotel', 'HOTEL', 5, 'tokyo', 465, ['wifi', 'spa', 'restaurant', 'gym', 'room-service']],
  ['Ubud Jungle Sanctuary', 'RESORT', 5, 'bali', 340, ['wifi', 'pool', 'spa', 'restaurant', 'breakfast', 'airport-shuttle']],
  ['Seminyak Beach Villas', 'VILLA', 5, 'bali', 415, ['wifi', 'pool', 'beachfront', 'kitchen', 'family-rooms', 'parking']],
  ['Canggu Surf Lodge', 'HOSTEL', 2, 'bali', 35, ['wifi', 'pool', 'bar']],
  ['Sanur Coral Resort', 'RESORT', 4, 'bali', 165, ['wifi', 'pool', 'beachfront', 'restaurant', 'family-rooms']],
  ['The Hudson Meridian', 'HOTEL', 5, 'new-york', 510, ['wifi', 'gym', 'bar', 'restaurant', 'room-service', 'spa']],
  ['Brooklyn Brownstone Stays', 'APARTMENT', 3, 'new-york', 175, ['wifi', 'kitchen', 'pet-friendly', 'laundry']],
  ['Midtown Central Hotel', 'HOTEL', 3, 'new-york', 198, ['wifi', 'gym', 'air-conditioning']],
  ['Lower East Side Bunkhouse', 'HOSTEL', 2, 'new-york', 62, ['wifi', 'bar', 'laundry']],
  ['Casa Modernista Eixample', 'HOTEL', 4, 'barcelona', 225, ['wifi', 'pool', 'bar', 'restaurant', 'air-conditioning']],
  ['Barceloneta Sea Apartments', 'APARTMENT', 4, 'barcelona', 185, ['wifi', 'kitchen', 'beachfront', 'family-rooms']],
  ['Gothic Quarter Guesthouse', 'GUESTHOUSE', 3, 'barcelona', 96, ['wifi', 'breakfast', 'air-conditioning']],
  ['Costa Brava Retreat Resort', 'RESORT', 5, 'barcelona', 355, ['wifi', 'pool', 'spa', 'beachfront', 'parking', 'restaurant']],
  ['Palm Crescent Resort', 'RESORT', 5, 'dubai', 545, ['wifi', 'pool', 'spa', 'beachfront', 'restaurant', 'airport-shuttle']],
  ['Marina Tower Residences', 'APARTMENT', 4, 'dubai', 210, ['wifi', 'pool', 'gym', 'kitchen', 'parking']],
  ['Old Creek Heritage Hotel', 'HOTEL', 3, 'dubai', 105, ['wifi', 'breakfast', 'airport-shuttle']],
  ['The Kensington Crown', 'HOTEL', 5, 'london', 435, ['wifi', 'spa', 'bar', 'restaurant', 'room-service']],
  ['Shoreditch Warehouse Flats', 'APARTMENT', 3, 'london', 158, ['wifi', 'kitchen', 'laundry', 'pet-friendly']],
  ['Camden Lock Hostel', 'HOSTEL', 2, 'london', 44, ['wifi', 'bar']],
];

// The India catalogue used by the Figma design. Names are fictional.
const indiaDestinations = [
  { slug: 'goa', name: 'Goa', country: 'India', scene: 'beach', description: 'Quiet coves, heritage quarters and long beach days.' },
  { slug: 'jaipur', name: 'Jaipur', country: 'India', scene: 'heritage', description: 'Palaces, bazaars and courtyard havelis.' },
  { slug: 'manali', name: 'Manali', country: 'India', scene: 'mountain', description: 'Cedar forests, snow peaks and mountain cafes.' },
  { slug: 'jaisalmer', name: 'Jaisalmer', country: 'India', scene: 'desert', description: 'A golden fort rising from the Thar desert.' },
];

/** Room names use "Room category | Rate", which the client groups into one card per category. */
type IndiaRoom = { name: string; bed: string; sqm: number; guests: number; allInNight: number; inventory: number; refundable: boolean };
const rates = (name: string, bed: string, sqm: number, guests: number, allInNight: number, inventory: number): IndiaRoom[] => [
  { name: `${name} | Flexible · Breakfast`, bed, sqm, guests, allInNight, inventory, refundable: true },
  { name: `${name} | Non-refundable · Breakfast`, bed, sqm, guests, allInNight: Math.round(allInNight * 0.92), inventory, refundable: false },
];

type IndiaProperty = {
  name: string; type: PropertyType; stars: number; dest: string; lat: number; lng: number; address: string;
  rating: number; featured?: boolean; scenes: string[]; amenities: string[]; about: string; rooms: IndiaRoom[];
};
const indiaProperties: IndiaProperty[] = [
  {
    name: 'Saltwater Cove Resort', type: 'RESORT', stars: 4, dest: 'goa', lat: 15.0100, lng: 74.0232, featured: true,
    address: 'Palolem Beach Road, Canacona, South Goa 403702', rating: 9.2,
    scenes: ['beach', 'pool', 'room', 'lake', 'mountain'],
    amenities: ['pool', 'breakfast', 'wifi', 'airport-shuttle', 'restaurant', 'family-rooms', 'spa', 'beachfront'],
    about: 'A calm, swimmable cove with private plunge pools, 120 m from the beach.',
    rooms: [
      { name: 'Garden Villa with Plunge Pool | Flexible · Breakfast', bed: '1 king bed', sqm: 38, guests: 3, allInNight: 8220, inventory: 4, refundable: true },
      { name: 'Garden Villa with Plunge Pool | Flexible · Room only', bed: '1 king bed', sqm: 38, guests: 3, allInNight: 7600, inventory: 4, refundable: true },
      { name: 'Garden Villa with Plunge Pool | Non-refundable · Breakfast', bed: '1 king bed', sqm: 38, guests: 3, allInNight: 7600, inventory: 4, refundable: false },
      { name: 'Ocean-view Suite | Flexible · Breakfast', bed: '1 king bed and sofa bed', sqm: 52, guests: 4, allInNight: 11300, inventory: 1, refundable: true },
    ],
  },
  { name: 'Casa Fontainhas', type: 'GUESTHOUSE', stars: 4, dest: 'goa', lat: 15.4975, lng: 73.8318, featured: true, address: 'Latin Quarter, Panaji, Goa 403001', rating: 8.9, scenes: ['heritage', 'room', 'city', 'lake', 'beach'], amenities: ['wifi', 'breakfast', 'air-conditioning', 'restaurant'], about: 'A walkable heritage stay in the Latin Quarter, close to great food.', rooms: rates('Heritage Double Room', '1 queen bed', 26, 2, 6250, 5) },
  { name: 'The Hillside Loft', type: 'APARTMENT', stars: 4, dest: 'goa', lat: 15.6000, lng: 73.7770, featured: true, address: 'Assagao, North Goa 403507', rating: 8.7, scenes: ['room', 'mountain', 'lake', 'city', 'beach'], amenities: ['wifi', 'kitchen', 'air-conditioning', 'laundry'], about: 'A quiet hillside loft with a proper desk and fast Wi-Fi, made for workations.', rooms: rates('Studio Loft with Workspace', '1 king bed', 32, 2, 4480, 3) },
  { name: 'Azure Bay Villas', type: 'VILLA', stars: 5, dest: 'goa', lat: 15.5180, lng: 73.7630, featured: true, address: 'Candolim, North Goa 403515', rating: 9.5, scenes: ['pool', 'beach', 'room', 'lake', 'mountain'], amenities: ['pool', 'wifi', 'kitchen', 'parking', 'beachfront', 'family-rooms'], about: 'Private pool villas a few minutes from Candolim beach.', rooms: rates('Private Pool Villa', '2 king beds', 110, 4, 14900, 2) },
  { name: 'Agonda Shore Huts', type: 'GUESTHOUSE', stars: 3, dest: 'goa', lat: 15.0440, lng: 73.9870, address: 'Agonda Beach, South Goa 403702', rating: 8.6, scenes: ['lake', 'beach', 'room', 'mountain', 'pool'], amenities: ['wifi', 'beachfront', 'breakfast'], about: 'Eco cottages right on Agonda beach.', rooms: rates('Eco Cottage', '1 queen bed', 24, 2, 5100, 6) },
  { name: 'Palolem Bay Cottages', type: 'GUESTHOUSE', stars: 3, dest: 'goa', lat: 15.0060, lng: 74.0190, address: 'Palolem, South Goa 403702', rating: 8.4, scenes: ['beach', 'room', 'lake', 'pool', 'mountain'], amenities: ['wifi', 'beachfront', 'breakfast'], about: 'Simple cottages a short walk from Palolem beach.', rooms: rates('Beach Cottage', '1 queen bed', 22, 2, 4300, 6) },
  { name: 'Cola Beach Lagoon Tents', type: 'RESORT', stars: 3, dest: 'goa', lat: 15.0660, lng: 73.9720, address: 'Cola Beach, South Goa 403702', rating: 9.0, scenes: ['desert', 'beach', 'lake', 'room', 'pool'], amenities: ['beachfront', 'restaurant', 'breakfast'], about: 'Secluded lagoon tents where a freshwater stream meets the sea.', rooms: rates('Lagoon Tent', '1 king bed', 30, 2, 7300, 4) },
  { name: 'Patnem Pool Villas', type: 'VILLA', stars: 4, dest: 'goa', lat: 14.9950, lng: 74.0290, address: 'Patnem, South Goa 403702', rating: 8.8, scenes: ['pool', 'room', 'beach', 'lake', 'mountain'], amenities: ['pool', 'wifi', 'kitchen', 'parking'], about: 'Private pool villas behind a quiet stretch of Patnem beach.', rooms: rates('Pool Villa', '1 king bed', 60, 3, 8700, 3) },
  { name: 'Anjuna Garden Stay', type: 'GUESTHOUSE', stars: 3, dest: 'goa', lat: 15.5790, lng: 73.7420, address: 'Anjuna, North Goa 403509', rating: 8.2, scenes: ['room', 'beach', 'lake', 'mountain', 'pool'], amenities: ['wifi', 'breakfast', 'pet-friendly'], about: 'A pet-friendly garden guesthouse near the Anjuna flea market.', rooms: rates('Garden Room', '1 double bed', 20, 2, 3900, 5) },
  { name: 'Amber Courtyard Haveli', type: 'GUESTHOUSE', stars: 4, dest: 'jaipur', lat: 26.9239, lng: 75.8267, address: 'Old City, Jaipur, Rajasthan 302002', rating: 8.8, scenes: ['heritage', 'room', 'city', 'desert', 'lake'], amenities: ['wifi', 'breakfast', 'restaurant', 'air-conditioning'], about: 'A restored courtyard haveli inside the old city walls.', rooms: rates('Haveli Room', '1 queen bed', 28, 2, 2700, 6) },
  { name: 'Pink City Suites', type: 'HOTEL', stars: 4, dest: 'jaipur', lat: 26.9124, lng: 75.7873, address: 'C-Scheme, Jaipur, Rajasthan 302001', rating: 8.3, scenes: ['city', 'room', 'heritage', 'pool', 'lake'], amenities: ['wifi', 'pool', 'gym', 'restaurant'], about: 'A modern hotel a short ride from the Pink City.', rooms: rates('Deluxe King', '1 king bed', 34, 3, 3400, 8) },
  { name: 'Old Manali Cedar Lodge', type: 'GUESTHOUSE', stars: 3, dest: 'manali', lat: 32.2500, lng: 77.1800, address: 'Old Manali, Himachal Pradesh 175131', rating: 8.7, scenes: ['mountain', 'room', 'lake', 'city', 'desert'], amenities: ['wifi', 'breakfast', 'pet-friendly'], about: 'A pet-friendly cedar lodge above the river.', rooms: rates('Cedar Room', '1 double bed', 22, 2, 2200, 6) },
  { name: 'Solang Valley Retreat', type: 'RESORT', stars: 4, dest: 'manali', lat: 32.3160, lng: 77.1570, address: 'Solang Valley, Himachal Pradesh 175131', rating: 9.0, scenes: ['mountain', 'lake', 'room', 'pool', 'city'], amenities: ['wifi', 'restaurant', 'spa', 'family-rooms', 'parking'], about: 'A valley resort with snow views and a spa.', rooms: rates('Valley View Room', '1 king bed', 36, 3, 5200, 5) },
  { name: 'Golden Fort Haveli', type: 'GUESTHOUSE', stars: 3, dest: 'jaisalmer', lat: 26.9124, lng: 70.9125, address: 'Fort Road, Jaisalmer, Rajasthan 345001', rating: 8.5, scenes: ['desert', 'heritage', 'room', 'city', 'lake'], amenities: ['wifi', 'breakfast', 'air-conditioning'], about: 'A sandstone haveli in the shadow of the fort.', rooms: rates('Sandstone Room', '1 queen bed', 24, 2, 3100, 5) },
  { name: 'Sam Dunes Camp', type: 'RESORT', stars: 4, dest: 'jaisalmer', lat: 26.8320, lng: 70.5120, address: 'Sam Sand Dunes, Jaisalmer, Rajasthan 345001', rating: 8.9, scenes: ['desert', 'mountain', 'room', 'lake', 'heritage'], amenities: ['restaurant', 'breakfast', 'parking'], about: 'Swiss tents among the dunes, with dinner under the stars.', rooms: rates('Swiss Tent', '1 king bed', 30, 3, 4600, 6) },
];

/** Ratings of 1-10 whose average lands on the target, so a property's score matches its reviews. */
function ratingsFor(target: number, count: number) {
  const low = Math.floor(target);
  const highCount = Math.round((target - low) * count);
  return Array.from({ length: count }, (_, i) => (i < highCount ? low + 1 : low));
}

const blurbs: Record<PropertyType, string> = {
  HOTEL: 'A full-service hotel with attentive staff and comfortable, well-appointed rooms. Guests can settle in quickly, with the main sights and transport links close by.',
  APARTMENT: 'Self-contained apartments with room to spread out, ideal for longer stays or for travellers who like to keep their own schedule.',
  RESORT: 'A destination in its own right, with generous grounds, places to unwind and dining on site, so there is little reason to leave.',
  VILLA: 'A private villa with space for the whole group, combining the freedom of a home with the comforts of a holiday stay.',
  HOSTEL: 'A sociable, budget-friendly base with clean shared spaces and helpful staff who know the area well.',
  GUESTHOUSE: 'A small, personally run guesthouse with a homely feel, local recommendations and a warm welcome.',
};

const roomTemplates: Record<PropertyType, [string, string, number, number, number, number, boolean][]> = {
  // [name, bed type, sqm, max guests, price multiplier, inventory, refundable]
  HOTEL: [
    ['Standard Double', '1 queen bed', 24, 2, 1, 8, true],
    ['Twin Room', '2 single beds', 26, 2, 1.05, 5, true],
    ['Deluxe King', '1 king bed', 34, 3, 1.4, 4, true],
    ['Family Suite', '1 king and 2 single beds', 55, 5, 2.1, 2, true],
    ['Saver Double (non-refundable)', '1 queen bed', 24, 2, 0.88, 3, false],
  ],
  APARTMENT: [
    ['Studio Apartment', '1 queen bed', 30, 2, 1, 4, true],
    ['One-Bedroom Apartment', '1 king bed and sofa bed', 48, 4, 1.45, 3, true],
    ['Two-Bedroom Apartment', '2 queen beds', 75, 6, 2, 2, true],
  ],
  RESORT: [
    ['Garden Room', '1 king bed', 38, 3, 1, 10, true],
    ['Ocean Suite', '1 king bed and sofa bed', 62, 4, 1.6, 4, true],
    ['Private Pool Villa', '2 king beds', 120, 6, 2.6, 2, true],
  ],
  VILLA: [
    ['Two-Bedroom Villa', '2 king beds', 110, 4, 1, 2, true],
    ['Four-Bedroom Villa', '4 king beds', 220, 8, 1.8, 1, true],
  ],
  HOSTEL: [
    ['Bed in 6-Bed Dorm', '1 bunk bed', 8, 1, 1, 12, true],
    ['Private Twin', '2 single beds', 16, 2, 2.4, 3, true],
  ],
  GUESTHOUSE: [
    ['Cosy Double', '1 double bed', 18, 2, 1, 4, true],
    ['Garden Family Room', '1 double and 2 single beds', 32, 4, 1.6, 2, true],
  ],
};

const roomAmenityByType: Record<PropertyType, string[]> = {
  HOTEL: ['wifi', 'tv', 'air-conditioning', 'minibar'],
  APARTMENT: ['wifi', 'tv', 'kitchen', 'air-conditioning'],
  RESORT: ['wifi', 'tv', 'air-conditioning', 'balcony', 'minibar'],
  VILLA: ['wifi', 'tv', 'kitchen', 'balcony', 'air-conditioning'],
  HOSTEL: ['wifi'],
  GUESTHOUSE: ['wifi', 'tv'],
};

const reviewers = [
  ['Amara', 'Okafor'], ['Lucas', 'Meyer'], ['Priya', 'Nair'], ['Sofia', 'Rossi'], ['Kenji', 'Tanaka'],
  ['Hannah', 'Lindqvist'], ['Mateo', 'Garcia'], ['Chloe', 'Dubois'], ['Noah', 'Bennett'], ['Aisha', 'Rahman'],
  ['Tomasz', 'Kowalski'], ['Leila', 'Haddad'], ['Ethan', 'Walsh'], ['Yuki', 'Sato'], ['Ines', 'Costa'],
];

const reviewText: Record<'great' | 'good' | 'mixed', [string, string][]> = {
  great: [
    ['Exceptional stay', 'Spotless room, very comfortable bed and staff who remembered our names. We would book again without hesitation.'],
    ['Better than the photos', 'Location was perfect for walking everywhere, and check-in took two minutes. Breakfast was a real highlight.'],
    ['Loved every minute', 'Everything was thought through, from the quiet room to the local tips at reception. A lovely place to stay.'],
  ],
  good: [
    ['Very pleasant', 'Clean and well located with friendly staff. The room was a little smaller than expected but had everything we needed.'],
    ['Good value', 'Fair price for the area and comfortable beds. WiFi was reliable, and the neighbourhood felt safe at night.'],
    ['Would return', 'A solid choice. Good facilities and a helpful team, with some street noise in the evening.'],
  ],
  mixed: [
    ['Fine for a short stay', 'Location is convenient and the staff tried hard, but the room is showing its age and the shower pressure was weak.'],
    ['Decent but dated', 'Good base for sightseeing. Decor could use an update, and breakfast options were limited.'],
  ],
};

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const slugify = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const dayOffset = (days: number) => {
  const d = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z');
  return new Date(d.getTime() + days * 86_400_000);
};

async function main() {
  if ((await prisma.property.count()) > 0) {
    console.log('Database already seeded. Use "npm run db:reset" to wipe and re-seed.');
    return;
  }
  const rand = mulberry32(20261108);
  const pick = <T,>(items: T[]): T => items[Math.floor(rand() * items.length)]!;
  const cost = Number(process.env.BCRYPT_COST ?? 12);

  const amenityIds = new Map<string, string>();
  for (const [slug, name] of Object.entries(amenities)) {
    const a = await prisma.amenity.create({ data: { slug, name } });
    amenityIds.set(slug, a.id);
  }

  const destIds = new Map<string, (typeof destinations)[number] & { id: string }>();
  for (const d of destinations) {
    const row = await prisma.destination.create({
      data: { slug: d.slug, name: d.name, country: d.country, description: d.description, imageUrl: img(d.image), featured: d.featured },
    });
    destIds.set(d.slug, { ...d, id: row.id });
  }

  // Reviewers can never log in: their password is random and discarded.
  const unusable = await bcrypt.hash(randomBytes(24).toString('hex'), cost);
  const reviewerIds: string[] = [];
  for (const [firstName, lastName] of reviewers) {
    const u = await prisma.user.create({
      data: { email: `${slugify(`${firstName}.${lastName}`)}@reviews.example.com`, firstName: firstName!, lastName: lastName!, passwordHash: unusable },
    });
    reviewerIds.push(u.id);
  }

  const demo = await prisma.user.create({
    data: { email: 'demo@example.com', firstName: 'Aishwary', lastName: 'Singh Panwar', phone: '+91 98000 04321', passwordHash: await bcrypt.hash('Demo1234!', cost) },
  });
  await prisma.user.create({
    data: { email: 'admin@example.com', firstName: 'Admin', lastName: 'User', role: 'ADMIN', passwordHash: await bcrypt.hash('Admin1234!', cost) },
  });

  const indiaRooms = new Map<string, { id: string; price: number }>();
  for (const d of indiaDestinations) {
    const row = await prisma.destination.create({
      data: { slug: d.slug, name: d.name, country: d.country, description: d.description, imageUrl: scene(d.scene), featured: true },
    });
    for (const p of indiaProperties.filter((x) => x.dest === d.slug)) {
      const authors = [...reviewerIds].sort(() => rand() - 0.5).slice(0, 12);
      const ratings = ratingsFor(p.rating, authors.length);
      const property = await prisma.property.create({
        data: {
          slug: slugify(p.name),
          name: p.name,
          type: p.type,
          stars: p.stars,
          destinationId: row.id,
          description: `${p.about} ${d.description}`,
          address: p.address,
          latitude: p.lat,
          longitude: p.lng,
          featured: p.featured ?? false,
          ratingAvg: ratings.reduce((a, b) => a + b, 0) / ratings.length,
          reviewCount: ratings.length,
          images: { create: p.scenes.map((s, position) => ({ url: scene(s), alt: `${p.name}, ${s} illustration`, position })) },
          amenities: { create: p.amenities.map((slug) => ({ amenityId: amenityIds.get(slug)! })) },
          reviews: {
            create: authors.map((userId, i) => {
              const [title, comment] = pick(reviewText[ratings[i]! >= 9 ? 'great' : 'good']);
              return { userId, rating: ratings[i]!, title, comment, createdAt: dayOffset(-Math.floor(rand() * 300) - 5) };
            }),
          },
        },
      });
      for (const r of p.rooms) {
        // Seeded so the tax-inclusive nightly price is the round figure shown in the design.
        const price = Math.round((r.allInNight * 100) / (1 + TAX_RATE));
        const room = await prisma.room.create({
          data: {
            propertyId: property.id, name: r.name, bedType: r.bed, sizeSqm: r.sqm, maxGuests: r.guests,
            pricePerNight: price, inventory: r.inventory, refundable: r.refundable,
            description: `${r.sqm} m² with ${r.bed}. Sleeps up to ${r.guests}.`,
            amenities: { create: ['wifi', 'tv', 'air-conditioning'].map((slug) => ({ amenityId: amenityIds.get(slug)! })) },
          },
        });
        indiaRooms.set(r.name.startsWith('Garden Villa') || p.name === 'Saltwater Cove Resort' ? r.name : `${p.name}: ${r.name}`, { id: room.id, price });
      }
    }
  }

  for (const [index, [name, type, stars, destSlug, base, propAmenities]] of properties.entries()) {
    const dest = destIds.get(destSlug)!;
    const images = Array.from({ length: 5 }, (_, i) => hotelImages[(index * 3 + i * 4) % hotelImages.length]!);
    const quality = 6.8 + rand() * 2.9;
    const count = 6 + Math.floor(rand() * 8);
    const authors = [...reviewerIds].sort(() => rand() - 0.5).slice(0, count);
    const ratings = authors.map(() => Math.min(10, Math.max(3, Math.round(quality + (rand() - 0.5) * 3))));
    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;

    const property = await prisma.property.create({
      data: {
        slug: slugify(name),
        name,
        type,
        stars,
        destinationId: dest.id,
        description: `${blurbs[type]} ${name} is well placed for exploring ${dest.name}. ${dest.description}`,
        address: `${10 + index * 7} ${pick(['Central Avenue', 'Market Street', 'Harbour Road', 'Garden Lane', 'Old Town Square'])}, ${dest.name}, ${dest.country}`,
        latitude: dest.lat + (rand() - 0.5) * 0.06,
        longitude: dest.lng + (rand() - 0.5) * 0.06,
        featured: false,
        ratingAvg: avg,
        reviewCount: ratings.length,
        images: { create: images.map((id, position) => ({ url: img(id), alt: `${name} photo ${position + 1}`, position })) },
        amenities: { create: propAmenities.map((slug) => ({ amenityId: amenityIds.get(slug)! })) },
        reviews: {
          create: authors.map((userId, i) => {
            const rating = ratings[i]!;
            const [title, comment] = pick(reviewText[rating >= 9 ? 'great' : rating >= 7 ? 'good' : 'mixed']);
            return { userId, rating, title, comment, createdAt: dayOffset(-Math.floor(rand() * 300) - 5) };
          }),
        },
      },
    });

    for (const [roomName, bedType, sizeSqm, maxGuests, mult, inventory, refundable] of roomTemplates[type]) {
      const price = Math.round(base * mult * USD_TO_INR) * 100;
      await prisma.room.create({
        data: {
          propertyId: property.id,
          name: roomName,
          bedType,
          sizeSqm,
          maxGuests,
          pricePerNight: price,
          inventory,
          refundable,
          description: `${sizeSqm} m² with ${bedType}. Sleeps up to ${maxGuests}.`,
          amenities: { create: roomAmenityByType[type].map((slug) => ({ amenityId: amenityIds.get(slug)! })) },
        },
      });
    }
  }

  // Sample history for the demo account, so the trips page shows each tab. The upcoming stay is
  // far enough out not to clash with the default search dates, and its snapshot price is above
  // today's rate, which is what makes the trips page offer a price-drop rebook.
  const sample = [
    { room: 'Garden Villa with Plunge Pool | Flexible · Breakfast', from: 60, to: 63, status: 'CONFIRMED' as const, ref: 'BKDEMO00001', markup: 35714 },
    { room: 'Amber Courtyard Haveli: Haveli Room | Flexible · Breakfast', from: -240, to: -237, status: 'CONFIRMED' as const, ref: 'BKDEMO00002', markup: 0 },
    { room: 'Old Manali Cedar Lodge: Cedar Room | Flexible · Breakfast', from: -520, to: -516, status: 'CONFIRMED' as const, ref: 'BKDEMO00003', markup: 0 },
    { room: 'Golden Fort Haveli: Sandstone Room | Flexible · Breakfast', from: 90, to: 92, status: 'CANCELLED' as const, ref: 'BKDEMO00004', markup: 0 },
  ];
  for (const s of sample) {
    const room = indiaRooms.get(s.room)!;
    const nightlyPrice = room.price + s.markup;
    const subtotal = nightlyPrice * (s.to - s.from);
    const taxes = Math.round(subtotal * TAX_RATE);
    await prisma.booking.create({
      data: {
        reference: s.ref, userId: demo.id, roomId: room.id, checkIn: dayOffset(s.from), checkOut: dayOffset(s.to),
        adults: 2, roomsCount: 1, guestFirstName: demo.firstName, guestLastName: demo.lastName, guestEmail: demo.email,
        nightlyPrice, subtotal, taxes, total: subtotal + taxes, currency: process.env.CURRENCY ?? 'INR',
        status: s.status, cancelledAt: s.status === 'CANCELLED' ? new Date() : null,
      },
    });
  }

  const counts = {
    destinations: await prisma.destination.count(), properties: await prisma.property.count(),
    rooms: await prisma.room.count(), amenities: await prisma.amenity.count(),
    reviews: await prisma.review.count(), users: await prisma.user.count(), bookings: await prisma.booking.count(),
  };
  console.log('Seeded:', counts);
}

main().finally(() => prisma.$disconnect());
