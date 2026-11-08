import { randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { dateString, formatDate, parseDate, todayUtc, validateStay } from '../../lib/dates.js';
import { AppError, badRequest, conflict, notFound } from '../../lib/errors.js';
import { pageMeta, pagination, uuidParam } from '../../lib/params.js';
import { prisma } from '../../lib/prisma.js';
import type { AuthContext } from '../../middleware/auth.js';
import { getAvailableUnits } from '../availability/availability.service.js';
import { calculateQuote } from '../pricing/pricing.service.js';

export const createBookingSchema = z
  .object({
    roomId: uuidParam,
    checkIn: dateString,
    checkOut: dateString,
    adults: z.number().int().min(1).max(30),
    children: z.number().int().min(0).max(20).default(0),
    rooms: z.number().int().min(1).max(8).default(1),
    guest: z.object({
      firstName: z.string().trim().min(1, 'First name is required').max(80),
      lastName: z.string().trim().min(1, 'Last name is required').max(80),
      email: z.string().trim().toLowerCase().email('Enter a valid email address'),
      phone: z.string().trim().max(30).optional(),
    }),
    specialRequests: z.string().trim().max(1000).optional(),
  })
  .superRefine(validateStay);

export const listBookingsSchema = z.object({
  scope: z.enum(['upcoming', 'past', 'cancelled', 'all']).default('all'),
  ...pagination,
});

const bookingInclude = {
  room: {
    include: {
      property: {
        include: { destination: true, images: { orderBy: { position: 'asc' }, take: 1 } },
      },
    },
  },
} satisfies Prisma.BookingInclude;

type BookingRow = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

const CANCELLABLE_ERROR = 'This booking can no longer be cancelled because the stay has started';

function toBookingDto(b: BookingRow) {
  const today = todayUtc();
  const property = b.room.property;
  return {
    id: b.id,
    reference: b.reference,
    status: b.status,
    checkIn: formatDate(b.checkIn),
    checkOut: formatDate(b.checkOut),
    adults: b.adults,
    children: b.children,
    rooms: b.roomsCount,
    guest: {
      firstName: b.guestFirstName,
      lastName: b.guestLastName,
      email: b.guestEmail,
      phone: b.guestPhone,
    },
    specialRequests: b.specialRequests,
    price: {
      nightlyPrice: b.nightlyPrice,
      subtotal: b.subtotal,
      taxes: b.taxes,
      total: b.total,
      currency: b.currency,
    },
    cancelledAt: b.cancelledAt,
    cancelReason: b.cancelReason,
    canCancel: b.status === 'CONFIRMED' && b.checkIn > today && b.room.refundable,
    createdAt: b.createdAt,
    room: { id: b.room.id, name: b.room.name, refundable: b.room.refundable },
    property: {
      id: property.id,
      slug: property.slug,
      name: property.name,
      address: property.address,
      imageUrl: property.images[0]?.url ?? null,
      destination: property.destination.name,
    },
  };
}

const generateReference = () => `BK${randomBytes(5).toString('hex').toUpperCase()}`;

export async function createBooking(userId: string, input: z.infer<typeof createBookingSchema>) {
  const checkIn = parseDate(input.checkIn);
  const checkOut = parseDate(input.checkOut);

  const booking = await prisma.$transaction(async (tx) => {
    // Row lock serializes bookings per room category: a concurrent request waits here,
    // then sees this transaction's committed booking in its own availability check.
    await tx.$queryRaw`SELECT id FROM rooms WHERE id = ${input.roomId}::uuid FOR UPDATE`;
    const room = await tx.room.findUnique({ where: { id: input.roomId } });
    if (!room) throw notFound('Room');

    if (room.maxGuests * input.rooms < input.adults + input.children) {
      throw badRequest(
        'PARTY_TOO_LARGE',
        `This selection fits at most ${room.maxGuests * input.rooms} guests`,
      );
    }

    const duplicate = await tx.booking.findFirst({
      where: {
        userId,
        roomId: room.id,
        status: 'CONFIRMED',
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
      select: { reference: true },
    });
    if (duplicate) {
      throw conflict(
        'DUPLICATE_BOOKING',
        `You already have booking ${duplicate.reference} for this room on overlapping dates`,
      );
    }

    const units = await getAvailableUnits(tx, [room], checkIn, checkOut);
    if ((units.get(room.id) ?? 0) < input.rooms) {
      throw conflict('ROOM_UNAVAILABLE', 'This room is no longer available for your dates');
    }

    const quote = calculateQuote({
      pricePerNight: room.pricePerNight,
      checkIn,
      checkOut,
      rooms: input.rooms,
    });

    return tx.booking.create({
      data: {
        reference: generateReference(),
        userId,
        roomId: room.id,
        checkIn,
        checkOut,
        adults: input.adults,
        children: input.children,
        roomsCount: input.rooms,
        guestFirstName: input.guest.firstName,
        guestLastName: input.guest.lastName,
        guestEmail: input.guest.email,
        guestPhone: input.guest.phone || null,
        specialRequests: input.specialRequests || null,
        nightlyPrice: quote.nightlyPrice,
        subtotal: quote.subtotal,
        taxes: quote.taxes,
        total: quote.total,
        currency: quote.currency,
      },
      include: bookingInclude,
    });
  });

  return toBookingDto(booking);
}

export async function listUserBookings(userId: string, q: z.infer<typeof listBookingsSchema>) {
  const today = todayUtc();
  const scopes: Record<typeof q.scope, Prisma.BookingWhereInput> = {
    all: {},
    upcoming: { status: 'CONFIRMED', checkOut: { gt: today } },
    past: { status: 'CONFIRMED', checkOut: { lte: today } },
    cancelled: { status: 'CANCELLED' },
  };
  const where = { userId, ...scopes[q.scope] };
  const [rows, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: bookingInclude,
      orderBy: { checkIn: q.scope === 'upcoming' ? 'asc' : 'desc' },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    }),
    prisma.booking.count({ where }),
  ]);
  return { data: rows.map(toBookingDto), meta: pageMeta(q.page, q.limit, total) };
}

export async function listAllBookings(q: { page: number; limit: number }) {
  const [rows, total] = await Promise.all([
    prisma.booking.findMany({
      include: bookingInclude,
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    }),
    prisma.booking.count(),
  ]);
  return { data: rows.map(toBookingDto), meta: pageMeta(q.page, q.limit, total) };
}

const canAccess = (auth: AuthContext, ownerId: string) =>
  auth.role === 'ADMIN' || auth.userId === ownerId;

export async function getBooking(auth: AuthContext, id: string) {
  const booking = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  // Same 404 for missing and not-yours, so ids cannot be probed.
  if (!booking || !canAccess(auth, booking.userId)) throw notFound('Booking');
  return toBookingDto(booking);
}

export async function cancelBooking(auth: AuthContext, id: string, reason?: string) {
  const booking = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM bookings WHERE id = ${id}::uuid FOR UPDATE`;
    const current = await tx.booking.findUnique({ where: { id }, include: bookingInclude });
    if (!current || !canAccess(auth, current.userId)) throw notFound('Booking');
    if (current.status === 'CANCELLED') {
      throw conflict('ALREADY_CANCELLED', 'This booking is already cancelled');
    }
    if (current.checkIn <= todayUtc()) throw conflict('STAY_STARTED', CANCELLABLE_ERROR);
    if (!current.room.refundable && auth.role !== 'ADMIN') {
      throw new AppError(409, 'NON_REFUNDABLE', 'This rate is non-refundable and cannot be cancelled');
    }
    return tx.booking.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason || null },
      include: bookingInclude,
    });
  });
  return toBookingDto(booking);
}
