import type { Db } from '../../lib/prisma.js';
import { addDays, nightsBetween } from '../../lib/dates.js';

interface Occupancy {
  checkIn: Date;
  checkOut: Date;
  roomsCount: number;
}

/**
 * Highest number of rooms in use on any single night of the stay. Summing every overlapping
 * booking would overstate this, since two bookings can overlap the stay but not each other.
 * Check-out day is not occupied, so back-to-back stays do not conflict.
 */
export function peakOccupancy(bookings: Occupancy[], checkIn: Date, checkOut: Date) {
  let peak = 0;
  const nights = nightsBetween(checkIn, checkOut);
  for (let i = 0; i < nights; i++) {
    const night = addDays(checkIn, i);
    const used = bookings
      .filter((b) => b.checkIn <= night && b.checkOut > night)
      .reduce((sum, b) => sum + b.roomsCount, 0);
    peak = Math.max(peak, used);
  }
  return peak;
}

/** Rooms of each category still free for the whole stay, keyed by room id. */
export async function getAvailableUnits(
  db: Db,
  rooms: { id: string; inventory: number }[],
  checkIn: Date,
  checkOut: Date,
) {
  const bookings = await db.booking.findMany({
    where: {
      roomId: { in: rooms.map((r) => r.id) },
      status: 'CONFIRMED',
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
    },
    select: { roomId: true, checkIn: true, checkOut: true, roomsCount: true },
  });
  const available = new Map<string, number>();
  for (const room of rooms) {
    const own = bookings.filter((b) => b.roomId === room.id);
    available.set(room.id, Math.max(0, room.inventory - peakOccupancy(own, checkIn, checkOut)));
  }
  return available;
}
