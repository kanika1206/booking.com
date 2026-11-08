import { Router } from 'express';
import { z } from 'zod';
import { dateString, parseDate, validateStay } from '../../lib/dates.js';
import { notFound } from '../../lib/errors.js';
import { uuidParam } from '../../lib/params.js';
import { prisma } from '../../lib/prisma.js';
import { calculateQuote } from '../pricing/pricing.service.js';
import { toRoomDto } from '../rooms/rooms.dto.js';
import { getAvailableUnits } from './availability.service.js';

const querySchema = z
  .object({
    propertyId: uuidParam,
    checkIn: dateString,
    checkOut: dateString,
    adults: z.coerce.number().int().min(1).max(30).default(2),
    children: z.coerce.number().int().min(0).max(20).default(0),
    rooms: z.coerce.number().int().min(1).max(8).default(1),
  })
  .superRefine(validateStay);

export const availabilityRouter = Router();

availabilityRouter.get('/', async (req, res) => {
  const q = querySchema.parse(req.query);
  const property = await prisma.property.findUnique({
    where: { id: q.propertyId },
    include: {
      rooms: {
        include: { amenities: { include: { amenity: true } } },
        orderBy: { pricePerNight: 'asc' },
      },
    },
  });
  if (!property) throw notFound('Property');

  const checkIn = parseDate(q.checkIn);
  const checkOut = parseDate(q.checkOut);
  const guests = q.adults + q.children;
  const units = await getAvailableUnits(prisma, property.rooms, checkIn, checkOut);

  res.json({
    data: property.rooms.map((room) => {
      const availableUnits = units.get(room.id) ?? 0;
      const fitsParty = room.maxGuests * q.rooms >= guests;
      return {
        ...toRoomDto(room),
        availableUnits,
        fitsParty,
        available: availableUnits >= q.rooms && fitsParty,
        quote: calculateQuote({
          pricePerNight: room.pricePerNight,
          checkIn,
          checkOut,
          rooms: q.rooms,
        }),
      };
    }),
  });
});
