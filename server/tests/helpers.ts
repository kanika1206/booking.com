import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

export const app = createApp();

export function futureDate(days: number) {
  const d = new Date(Date.now() + days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export async function resetDb() {
  if (!process.env.DATABASE_URL?.endsWith('/booking_test')) {
    throw new Error('Refusing to wipe a non-test database');
  }
  await prisma.$executeRawUnsafe(
    'TRUNCATE users, destinations, properties, amenities, rooms, bookings, reviews, favorites, property_images, property_amenities, room_amenities, host_applications CASCADE',
  );
}

let counter = 0;

export async function registerAgent(role?: 'ADMIN') {
  const agent = request.agent(app);
  const email = `user${++counter}@test.example.com`;
  const res = await agent
    .post('/api/auth/register')
    .send({ email, password: 'Password123', firstName: 'Test', lastName: 'User' });
  if (res.status !== 201) throw new Error(`register failed: ${res.status}`);
  if (role) {
    await prisma.user.update({ where: { email }, data: { role } });
    await agent.post('/api/auth/login').send({ email, password: 'Password123' });
  }
  return { agent, email, userId: res.body.data.id as string };
}

export async function createFixture(opts: { inventory?: number; price?: number; refundable?: boolean } = {}) {
  const n = ++counter;
  const destination = await prisma.destination.create({
    data: { slug: `dest-${n}`, name: `Testville ${n}`, country: 'Testland', description: 'd', imageUrl: 'http://x/y.jpg' },
  });
  const amenity = await prisma.amenity.create({ data: { slug: `pool-${n}`, name: `Pool ${n}` } });
  const property = await prisma.property.create({
    data: {
      slug: `prop-${n}`, name: `Test Hotel ${n}`, type: 'HOTEL', description: 'd', address: 'a',
      latitude: 0, longitude: 0, stars: 4, destinationId: destination.id,
      amenities: { create: { amenityId: amenity.id } },
    },
  });
  const room = await prisma.room.create({
    data: {
      propertyId: property.id, name: 'Double', description: 'd', bedType: 'queen', sizeSqm: 20, maxGuests: 2,
      pricePerNight: opts.price ?? 10000, inventory: opts.inventory ?? 1, refundable: opts.refundable ?? true,
    },
  });
  return { destination, property, room, amenity };
}

export const bookingBody = (roomId: string, from = 10, to = 13, extra: object = {}) => ({
  roomId,
  checkIn: futureDate(from),
  checkOut: futureDate(to),
  adults: 2,
  guest: { firstName: 'Ana', lastName: 'Silva', email: 'ana@example.com' },
  ...extra,
});
