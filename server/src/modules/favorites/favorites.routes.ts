import { Router } from 'express';
import { notFound } from '../../lib/errors.js';
import { uuidParam } from '../../lib/params.js';
import { prisma } from '../../lib/prisma.js';
import { currentAuth, requireAuth } from '../../middleware/auth.js';
import { propertyCardInclude, toPropertyCard } from '../properties/properties.service.js';

export const favoritesRouter = Router();
favoritesRouter.use(requireAuth);

favoritesRouter.get('/', async (req, res) => {
  const rows = await prisma.favorite.findMany({
    where: { userId: currentAuth(req).userId },
    include: { property: { include: propertyCardInclude } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data: rows.map((f) => toPropertyCard(f.property)) });
});

// PUT and DELETE are idempotent, so a double click cannot produce an error.
favoritesRouter.put('/:propertyId', async (req, res) => {
  const propertyId = uuidParam.parse(req.params.propertyId);
  const { userId } = currentAuth(req);
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) throw notFound('Property');
  await prisma.favorite.upsert({
    where: { userId_propertyId: { userId, propertyId } },
    create: { userId, propertyId },
    update: {},
  });
  res.status(204).end();
});

favoritesRouter.delete('/:propertyId', async (req, res) => {
  const propertyId = uuidParam.parse(req.params.propertyId);
  await prisma.favorite.deleteMany({ where: { userId: currentAuth(req).userId, propertyId } });
  res.status(204).end();
});
