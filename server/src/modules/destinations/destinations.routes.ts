import { Router } from 'express';
import { z } from 'zod';
import { notFound } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';

const listSchema = z.object({
  q: z.string().trim().max(100).optional(),
  featured: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const destinationsRouter = Router();

const toDto = (d: {
  id: string;
  slug: string;
  name: string;
  country: string;
  description: string;
  imageUrl: string;
  _count: { properties: number };
}) => ({
  id: d.id,
  slug: d.slug,
  name: d.name,
  country: d.country,
  description: d.description,
  imageUrl: d.imageUrl,
  propertyCount: d._count.properties,
});

destinationsRouter.get('/', async (req, res) => {
  const { q, featured, limit } = listSchema.parse(req.query);
  const destinations = await prisma.destination.findMany({
    where: {
      ...(featured ? { featured: featured === 'true' } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { country: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    },
    include: { _count: { select: { properties: true } } },
    orderBy: { name: 'asc' },
    take: limit,
  });
  res.json({ data: destinations.map(toDto) });
});

destinationsRouter.get('/:slug', async (req, res) => {
  const destination = await prisma.destination.findUnique({
    where: { slug: req.params.slug },
    include: { _count: { select: { properties: true } } },
  });
  if (!destination) throw notFound('Destination');
  res.json({ data: toDto(destination) });
});
