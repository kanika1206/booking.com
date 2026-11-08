import { Router } from 'express';
import { z } from 'zod';
import { pagination, uuidParam } from '../../lib/params.js';
import { currentAuth, requireAuth } from '../../middleware/auth.js';
import { createReview, createReviewSchema, listReviews } from './reviews.service.js';

export const reviewsRouter = Router({ mergeParams: true });

const propertyIdOf = (params: unknown) =>
  uuidParam.parse((params as { propertyId?: string }).propertyId);

reviewsRouter.get('/', async (req, res) => {
  const { page, limit } = z.object(pagination).parse(req.query);
  res.json(await listReviews(propertyIdOf(req.params), page, limit));
});

reviewsRouter.post('/', requireAuth, async (req, res) => {
  const input = createReviewSchema.parse(req.body);
  const review = await createReview(currentAuth(req).userId, propertyIdOf(req.params), input);
  res.status(201).json({ data: review });
});
