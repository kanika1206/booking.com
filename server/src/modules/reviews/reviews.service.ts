import { z } from 'zod';
import { todayUtc } from '../../lib/dates.js';
import { conflict, forbidden, notFound } from '../../lib/errors.js';
import { pageMeta } from '../../lib/params.js';
import { prisma } from '../../lib/prisma.js';

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(10),
  title: z.string().trim().min(1, 'Title is required').max(120),
  comment: z.string().trim().min(1, 'Comment is required').max(2000),
});

export async function listReviews(propertyId: string, page: number, limit: number) {
  const where = { propertyId };
  const [rows, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.review.count({ where }),
  ]);
  return {
    data: rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      createdAt: r.createdAt,
      // Surname initial only: reviews are public.
      author: `${r.user.firstName} ${r.user.lastName.charAt(0)}.`,
    })),
    meta: pageMeta(page, limit, total),
  };
}

export async function createReview(
  userId: string,
  propertyId: string,
  input: z.infer<typeof createReviewSchema>,
) {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) throw notFound('Property');

  const stay = await prisma.booking.findFirst({
    where: {
      userId,
      status: 'CONFIRMED',
      checkOut: { lte: todayUtc() },
      room: { propertyId },
    },
    select: { id: true },
  });
  if (!stay) throw forbidden('Only guests who completed a stay here can leave a review');

  const existing = await prisma.review.findUnique({
    where: { userId_propertyId: { userId, propertyId } },
  });
  if (existing) throw conflict('ALREADY_REVIEWED', 'You have already reviewed this property');

  return prisma.$transaction(async (tx) => {
    // Lock serializes rating recalculation across concurrent reviews of one property.
    await tx.$queryRaw`SELECT id FROM properties WHERE id = ${propertyId}::uuid FOR UPDATE`;
    const review = await tx.review.create({ data: { ...input, userId, propertyId } });
    const stats = await tx.review.aggregate({
      where: { propertyId },
      _avg: { rating: true },
      _count: true,
    });
    await tx.property.update({
      where: { id: propertyId },
      data: { ratingAvg: stats._avg.rating ?? 0, reviewCount: stats._count },
    });
    return review;
  });
}
