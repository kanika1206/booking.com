import { Router } from 'express';
import { z } from 'zod';
import { getPropertyDetail, listFeatured } from './properties.service.js';

export const propertiesRouter = Router();

propertiesRouter.get('/featured', async (req, res) => {
  const { limit } = z
    .object({ limit: z.coerce.number().int().min(1).max(24).default(8) })
    .parse(req.query);
  res.json({ data: await listFeatured(limit) });
});

propertiesRouter.get('/:slug', async (req, res) => {
  res.json({ data: await getPropertyDetail(req.params.slug) });
});
