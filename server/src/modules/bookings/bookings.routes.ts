import { Router } from 'express';
import { z } from 'zod';
import { pagination, uuidParam } from '../../lib/params.js';
import { currentAuth, requireAuth, requireRole } from '../../middleware/auth.js';
import {
  cancelBooking,
  createBooking,
  createBookingSchema,
  getBooking,
  listAllBookings,
  listBookingsSchema,
  listUserBookings,
} from './bookings.service.js';

const cancelSchema = z.object({ reason: z.string().trim().max(500).optional() });

export const bookingsRouter = Router();
bookingsRouter.use(requireAuth);

bookingsRouter.post('/', async (req, res) => {
  const input = createBookingSchema.parse(req.body);
  res.status(201).json({ data: await createBooking(currentAuth(req).userId, input) });
});

bookingsRouter.get('/', async (req, res) => {
  res.json(await listUserBookings(currentAuth(req).userId, listBookingsSchema.parse(req.query)));
});

bookingsRouter.get('/admin/all', requireRole('ADMIN'), async (req, res) => {
  res.json(await listAllBookings(z.object(pagination).parse(req.query)));
});

bookingsRouter.get('/:id', async (req, res) => {
  res.json({ data: await getBooking(currentAuth(req), uuidParam.parse(req.params.id)) });
});

bookingsRouter.post('/:id/cancel', async (req, res) => {
  const { reason } = cancelSchema.parse(req.body ?? {});
  const booking = await cancelBooking(currentAuth(req), uuidParam.parse(req.params.id), reason);
  res.json({ data: booking });
});
