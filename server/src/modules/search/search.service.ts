import { PropertyType, type Prisma } from '@prisma/client';
import { z } from 'zod';
import { dateString, parseDate, validateStay } from '../../lib/dates.js';
import { pageMeta, pagination } from '../../lib/params.js';
import { prisma } from '../../lib/prisma.js';
import { getAvailableUnits } from '../availability/availability.service.js';
import { calculateQuote } from '../pricing/pricing.service.js';
import { propertyCardInclude, toPropertyCard } from '../properties/properties.service.js';

const csv = z
  .string()
  .optional()
  .transform((v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []));

export const searchSchema = z
  .object({
    destination: z.string().trim().max(100).optional(),
    checkIn: dateString.optional(),
    checkOut: dateString.optional(),
    adults: z.coerce.number().int().min(1).max(30).default(2),
    children: z.coerce.number().int().min(0).max(20).default(0),
    rooms: z.coerce.number().int().min(1).max(8).default(1),
    minPrice: z.coerce.number().int().min(0).optional(),
    maxPrice: z.coerce.number().int().min(0).optional(),
    minRating: z.coerce.number().min(0).max(10).optional(),
    types: csv.pipe(z.array(z.nativeEnum(PropertyType))),
    amenities: csv,
    sort: z.enum(['relevance', 'price_asc', 'price_desc', 'rating']).default('relevance'),
    ...pagination,
  })
  .superRefine(validateStay);

export type SearchInput = z.infer<typeof searchSchema>;

function relevanceScore(
  p: { name: string; ratingAvg: number; reviewCount: number; destination: { name: string } },
  term?: string,
) {
  const t = term?.toLowerCase();
  const textScore = !t
    ? 0
    : p.destination.name.toLowerCase() === t
      ? 40
      : p.name.toLowerCase().includes(t)
        ? 30
        : 10;
  return textScore + p.ratingAvg * 2 + Math.log10(p.reviewCount + 1) * 3;
}

export async function searchProperties(q: SearchInput) {
  const where: Prisma.PropertyWhereInput = q.destination
    ? {
        OR: [
          { name: { contains: q.destination, mode: 'insensitive' } },
          { address: { contains: q.destination, mode: 'insensitive' } },
          { destination: { name: { contains: q.destination, mode: 'insensitive' } } },
          { destination: { country: { contains: q.destination, mode: 'insensitive' } } },
        ],
      }
    : {};

  const rows = await prisma.property.findMany({ where, include: propertyCardInclude });

  const checkIn = q.checkIn ? parseDate(q.checkIn) : undefined;
  const checkOut = q.checkOut ? parseDate(q.checkOut) : undefined;
  const guests = q.adults + q.children;
  const units =
    checkIn && checkOut
      ? await getAvailableUnits(prisma, rows.flatMap((r) => r.rooms), checkIn, checkOut)
      : undefined;

  // A property only matches if one room category can hold the whole party for the whole stay.
  const candidates = rows.flatMap((row) => {
    const eligible = row.rooms.filter(
      (room) =>
        room.maxGuests * q.rooms >= guests &&
        (units ? (units.get(room.id) ?? 0) : room.inventory) >= q.rooms,
    );
    if (!eligible.length) return [];
    const cheapest = eligible.reduce((a, b) => (b.pricePerNight < a.pricePerNight ? b : a));
    return [{ row, price: cheapest.pricePerNight, cheapest }];
  });

  const facets = {
    types: countBy(candidates.map((c) => ({ key: c.row.type, label: c.row.type }))),
    amenities: countBy(
      candidates.flatMap((c) =>
        c.row.amenities.map(({ amenity }) => ({ key: amenity.slug, label: amenity.name })),
      ),
    ),
    priceRange: {
      min: candidates.length ? Math.min(...candidates.map((c) => c.price)) : 0,
      max: candidates.length ? Math.max(...candidates.map((c) => c.price)) : 0,
    },
  };

  const filtered = candidates.filter(({ row, price }) => {
    if (q.minPrice !== undefined && price < q.minPrice) return false;
    if (q.maxPrice !== undefined && price > q.maxPrice) return false;
    if (q.minRating !== undefined && row.ratingAvg < q.minRating) return false;
    if (q.types.length && !q.types.includes(row.type)) return false;
    const slugs = new Set(row.amenities.map(({ amenity }) => amenity.slug));
    return q.amenities.every((a) => slugs.has(a));
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (q.sort) {
      case 'price_asc':
        return a.price - b.price;
      case 'price_desc':
        return b.price - a.price;
      case 'rating':
        return b.row.ratingAvg - a.row.ratingAvg || b.row.reviewCount - a.row.reviewCount;
      default:
        return relevanceScore(b.row, q.destination) - relevanceScore(a.row, q.destination);
    }
  });

  const start = (q.page - 1) * q.limit;
  const data = sorted.slice(start, start + q.limit).map(({ row, price, cheapest }) => ({
    ...toPropertyCard(row),
    startingPrice: price,
    latitude: row.latitude,
    longitude: row.longitude,
    room: {
      id: cheapest.id,
      name: cheapest.name,
      bedType: cheapest.bedType,
      sizeSqm: cheapest.sizeSqm,
      refundable: cheapest.refundable,
    },
    quote:
      checkIn && checkOut
        ? calculateQuote({ pricePerNight: price, checkIn, checkOut, rooms: q.rooms })
        : null,
  }));

  return { data, meta: { ...pageMeta(q.page, q.limit, sorted.length), facets } };
}

function countBy(items: { key: string; label: string }[]) {
  const counts = new Map<string, { key: string; label: string; count: number }>();
  for (const { key, label } of items) {
    const entry = counts.get(key) ?? { key, label, count: 0 };
    entry.count += 1;
    counts.set(key, entry);
  }
  return [...counts.values()].sort((a, b) => a.label.localeCompare(b.label));
}
