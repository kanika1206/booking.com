import type { Prisma } from '@prisma/client';
import { notFound } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { toRoomDto } from '../rooms/rooms.dto.js';

export const propertyCardInclude = {
  destination: true,
  images: { orderBy: { position: 'asc' }, take: 1 },
  amenities: { include: { amenity: true } },
  rooms: true,
} satisfies Prisma.PropertyInclude;

export type PropertyCardRow = Prisma.PropertyGetPayload<{ include: typeof propertyCardInclude }>;

export const toPropertyCard = (p: PropertyCardRow) => ({
  id: p.id,
  slug: p.slug,
  name: p.name,
  type: p.type,
  stars: p.stars,
  address: p.address,
  ratingAvg: Math.round(p.ratingAvg * 10) / 10,
  reviewCount: p.reviewCount,
  imageUrl: p.images[0]?.url ?? null,
  imageAlt: p.images[0]?.alt ?? p.name,
  destination: { slug: p.destination.slug, name: p.destination.name, country: p.destination.country },
  amenities: p.amenities.map(({ amenity }) => ({ slug: amenity.slug, name: amenity.name })),
  startingPrice: p.rooms.length ? Math.min(...p.rooms.map((r) => r.pricePerNight)) : null,
});

export async function listFeatured(limit: number) {
  const rows = await prisma.property.findMany({
    where: { featured: true },
    include: propertyCardInclude,
    orderBy: { ratingAvg: 'desc' },
    take: limit,
  });
  return rows.map(toPropertyCard);
}

export async function getPropertyDetail(slug: string) {
  const p = await prisma.property.findUnique({
    where: { slug },
    include: {
      destination: true,
      images: { orderBy: { position: 'asc' } },
      amenities: { include: { amenity: true } },
      rooms: {
        include: { amenities: { include: { amenity: true } } },
        orderBy: { pricePerNight: 'asc' },
      },
    },
  });
  if (!p) throw notFound('Property');
  return {
    ...toPropertyCard({ ...p, images: p.images.slice(0, 1) }),
    description: p.description,
    latitude: p.latitude,
    longitude: p.longitude,
    images: p.images.map((i) => ({ url: i.url, alt: i.alt })),
    rooms: p.rooms.map(toRoomDto),
  };
}
