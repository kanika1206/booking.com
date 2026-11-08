import { Router } from 'express';
import { z } from 'zod';
import { dateString, parseDate, validateStay } from '../../lib/dates.js';
import { notFound } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { uuidParam } from '../../lib/params.js';
import { calculateQuote } from './pricing.service.js';

const quoteSchema = z
  .object({
    roomId: uuidParam,
    checkIn: dateString,
    checkOut: dateString,
    rooms: z.coerce.number().int().min(1).max(8).default(1),
  })
  .superRefine(validateStay);

export const pricingRouter = Router();

pricingRouter.post('/quote', async (req, res) => {
  const input = quoteSchema.parse(req.body);
  const room = await prisma.room.findUnique({ where: { id: input.roomId } });
  if (!room) throw notFound('Room');
  res.json({
    data: calculateQuote({
      pricePerNight: room.pricePerNight,
      checkIn: parseDate(input.checkIn),
      checkOut: parseDate(input.checkOut),
      rooms: input.rooms,
    }),
  });
});
