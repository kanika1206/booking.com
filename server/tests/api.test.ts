import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { app, bookingBody, createFixture, futureDate, registerAgent, resetDb } from './helpers.js';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe('auth', () => {
  it('registers, reads profile, logs out, logs back in', async () => {
    const agent = request.agent(app);
    const body = { email: 'New@Example.com', password: 'Password123', firstName: 'A', lastName: 'B' };
    const reg = await agent.post('/api/auth/register').send(body);
    expect(reg.status).toBe(201);
    expect(reg.body.data.email).toBe('new@example.com');
    expect(reg.body.data.passwordHash).toBeUndefined();
    expect(reg.headers['set-cookie']?.[0]).toMatch(/HttpOnly/);

    expect((await agent.get('/api/users/me')).status).toBe(200);
    expect((await agent.post('/api/auth/logout')).status).toBe(204);
    expect((await agent.get('/api/users/me')).status).toBe(401);
    expect((await agent.post('/api/auth/login').send({ email: body.email, password: body.password })).status).toBe(200);
    expect((await agent.get('/api/users/me')).status).toBe(200);
  });

  it('stores a bcrypt hash, never the password', async () => {
    const { email } = await registerAgent();
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(user.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it('rejects duplicate email, weak password, bad email', async () => {
    const { email } = await registerAgent();
    const base = { password: 'Password123', firstName: 'A', lastName: 'B' };
    const dup = await request(app).post('/api/auth/register').send({ ...base, email });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('EMAIL_TAKEN');
    expect((await request(app).post('/api/auth/register').send({ ...base, email: 'x@y.com', password: 'short' })).status).toBe(400);
    expect((await request(app).post('/api/auth/register').send({ ...base, email: 'nope' })).status).toBe(400);
  });

  it('gives the same error for wrong password and unknown email', async () => {
    const { email } = await registerAgent();
    const a = await request(app).post('/api/auth/login').send({ email, password: 'wrong-password' });
    const b = await request(app).post('/api/auth/login').send({ email: 'ghost@example.com', password: 'wrong-password' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.error.message).toBe(b.body.error.message);
  });

  it('rejects a tampered session cookie', async () => {
    const res = await request(app).get('/api/users/me').set('Cookie', 'booking_session=not.a.jwt');
    expect(res.status).toBe(401);
  });

  it('cannot escalate role through registration or profile update', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ email: 'r@example.com', password: 'Password123', firstName: 'A', lastName: 'B', role: 'ADMIN' });
    expect(res.body.data.role).toBe('USER');
    const { agent } = await registerAgent();
    const patched = await agent.patch('/api/users/me').send({ role: 'ADMIN', firstName: 'Z' });
    expect(patched.body.data.role).toBe('USER');
    expect(patched.body.data.firstName).toBe('Z');
  });

  it('changes password only with the correct current password', async () => {
    const { agent, email } = await registerAgent();
    expect((await agent.post('/api/users/me/password').send({ currentPassword: 'bad', newPassword: 'NewPassword1' })).status).toBe(400);
    expect((await agent.post('/api/users/me/password').send({ currentPassword: 'Password123', newPassword: 'NewPassword1' })).status).toBe(204);
    expect((await request(app).post('/api/auth/login').send({ email, password: 'NewPassword1' })).status).toBe(200);
  });
});

describe('search', () => {
  it('finds by destination, filters, sorts and paginates', async () => {
    const cheap = await createFixture({ price: 5000 });
    const dear = await createFixture({ price: 50000 });
    await prisma.property.update({ where: { id: dear.property.id }, data: { ratingAvg: 9.5, reviewCount: 4, destinationId: cheap.destination.id } });
    await prisma.property.update({ where: { id: cheap.property.id }, data: { ratingAvg: 6, reviewCount: 4, type: 'HOSTEL' } });
    await createFixture({ price: 7000 }); // other destination

    const dest = cheap.destination.name;
    const get = (q: object) => request(app).get('/api/search').query({ destination: dest, ...q });

    const all = await get({ sort: 'price_asc' });
    expect(all.body.data.map((p: { id: string }) => p.id)).toEqual([cheap.property.id, dear.property.id]);
    expect((await get({ sort: 'price_desc' })).body.data[0].id).toBe(dear.property.id);
    expect((await get({ sort: 'rating' })).body.data[0].id).toBe(dear.property.id);
    expect((await get({ maxPrice: 6000 })).body.data).toHaveLength(1);
    expect((await get({ minPrice: 6000 })).body.data[0].id).toBe(dear.property.id);
    expect((await get({ minRating: 9 })).body.data[0].id).toBe(dear.property.id);
    expect((await get({ types: 'HOSTEL' })).body.data[0].id).toBe(cheap.property.id);
    expect((await get({ amenities: cheap.amenity.slug })).body.data).toHaveLength(1);

    const page2 = await get({ sort: 'price_asc', limit: 1, page: 2 });
    expect(page2.body.data[0].id).toBe(dear.property.id);
    expect(page2.body.meta).toMatchObject({ total: 2, totalPages: 2, page: 2 });
    expect(all.body.meta.facets.priceRange).toEqual({ min: 5000, max: 50000 });

    // The client needs the cheapest eligible room and coordinates to draw cards and map pins.
    expect(all.body.data[0].room).toMatchObject({ refundable: true, bedType: expect.any(String), sizeSqm: expect.any(Number) });
    expect(all.body.data[0].latitude).toEqual(expect.any(Number));
    expect(all.body.data[0].longitude).toEqual(expect.any(Number));
  });

  it('returns empty result rather than error for unknown destination', async () => {
    const res = await request(app).get('/api/search').query({ destination: 'Atlantis' });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('excludes fully booked properties for the dates and parties that do not fit', async () => {
    const { room, destination, property } = await createFixture({ inventory: 1 });
    const { agent } = await registerAgent();
    await agent.post('/api/bookings').send(bookingBody(room.id, 10, 13));
    const search = (q: object) => request(app).get('/api/search').query({ destination: destination.name, ...q });

    expect((await search({ checkIn: futureDate(11), checkOut: futureDate(12) })).body.data).toHaveLength(0);
    const free = await search({ checkIn: futureDate(13), checkOut: futureDate(15) });
    expect(free.body.data[0].id).toBe(property.id);
    expect(free.body.data[0].quote.nights).toBe(2);
    expect((await search({ adults: 3 })).body.data).toHaveLength(0);
    expect((await search({ adults: 3, rooms: 2 })).body.data).toHaveLength(0); // only 1 room exists, whatever the dates
  });

  it('validates dates', async () => {
    const q = (o: object) => request(app).get('/api/search').query(o);
    expect((await q({ checkIn: futureDate(5), checkOut: futureDate(3) })).status).toBe(400);
    expect((await q({ checkIn: futureDate(-5), checkOut: futureDate(3) })).status).toBe(400);
    expect((await q({ checkIn: futureDate(5) })).status).toBe(400);
    expect((await q({ checkIn: '2030-02-31', checkOut: '2030-03-02' })).status).toBe(400);
    expect((await q({ checkIn: futureDate(1), checkOut: futureDate(40) })).status).toBe(400);
    expect((await q({ sort: 'nonsense' })).status).toBe(400);
  });
});

describe('property details and availability', () => {
  it('returns detail by slug and 404 otherwise', async () => {
    const { property } = await createFixture();
    const res = await request(app).get(`/api/properties/${property.slug}`);
    expect(res.status).toBe(200);
    expect(res.body.data.rooms).toHaveLength(1);
    expect((await request(app).get('/api/properties/none')).status).toBe(404);
  });

  it('reports units left and an accurate quote', async () => {
    const { property, room } = await createFixture({ inventory: 2, price: 10000 });
    const { agent } = await registerAgent();
    await agent.post('/api/bookings').send(bookingBody(room.id, 10, 13));
    const res = await request(app).get('/api/availability').query({
      propertyId: property.id, checkIn: futureDate(11), checkOut: futureDate(12), adults: 2,
    });
    expect(res.body.data[0]).toMatchObject({ availableUnits: 1, available: true });
    expect(res.body.data[0].quote.total).toBe(11200);
  });
});

describe('bookings', () => {
  it('requires auth', async () => {
    const { room } = await createFixture();
    expect((await request(app).post('/api/bookings').send(bookingBody(room.id))).status).toBe(401);
    expect((await request(app).get('/api/bookings')).status).toBe(401);
  });

  it('persists a booking with a server-calculated price', async () => {
    const { room } = await createFixture({ price: 10000 });
    const { agent } = await registerAgent();
    const res = await agent.post('/api/bookings').send(bookingBody(room.id, 10, 13, { total: 1, subtotal: 1, nightlyPrice: 1 }));
    expect(res.status).toBe(201);
    expect(res.body.data.price).toMatchObject({ subtotal: 30000, taxes: 3600, total: 33600 });
    const row = await prisma.booking.findUniqueOrThrow({ where: { id: res.body.data.id } });
    expect(row).toMatchObject({ status: 'CONFIRMED', total: 33600 });
    expect(res.body.data.reference).toMatch(/^BK[0-9A-F]{10}$/);
  });

  it('keeps the booked price when the room rate later changes', async () => {
    const { room } = await createFixture({ price: 10000 });
    const { agent } = await registerAgent();
    const { body } = await agent.post('/api/bookings').send(bookingBody(room.id));
    await prisma.room.update({ where: { id: room.id }, data: { pricePerNight: 99900 } });
    expect((await agent.get(`/api/bookings/${body.data.id}`)).body.data.price.total).toBe(33600);
  });

  it('prevents overlapping bookings across users, in every overlap shape', async () => {
    const { room } = await createFixture({ inventory: 1 });
    const a = await registerAgent();
    const b = await registerAgent();
    expect((await a.agent.post('/api/bookings').send(bookingBody(room.id, 10, 15))).status).toBe(201);
    for (const [from, to] of [[10, 15], [8, 11], [14, 18], [11, 13], [5, 20]] as const) {
      const res = await b.agent.post('/api/bookings').send(bookingBody(room.id, from, to));
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ROOM_UNAVAILABLE');
    }
  });

  it('allows back-to-back stays', async () => {
    const { room } = await createFixture({ inventory: 1 });
    const a = await registerAgent();
    const b = await registerAgent();
    expect((await a.agent.post('/api/bookings').send(bookingBody(room.id, 10, 13))).status).toBe(201);
    expect((await b.agent.post('/api/bookings').send(bookingBody(room.id, 13, 15))).status).toBe(201);
    expect((await b.agent.post('/api/bookings').send(bookingBody(room.id, 8, 10))).status).toBe(201);
  });

  it('rejects a duplicate from the same user even when rooms remain', async () => {
    const { room } = await createFixture({ inventory: 5 });
    const { agent } = await registerAgent();
    expect((await agent.post('/api/bookings').send(bookingBody(room.id))).status).toBe(201);
    const dup = await agent.post('/api/bookings').send(bookingBody(room.id));
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('DUPLICATE_BOOKING');
  });

  it('only one of many concurrent requests gets the last room', async () => {
    const { room } = await createFixture({ inventory: 1 });
    const users = await Promise.all(Array.from({ length: 10 }, () => registerAgent()));
    const results = await Promise.all(
      users.map((u) => u.agent.post('/api/bookings').send(bookingBody(room.id))),
    );
    const statuses = results.map((r) => r.status).sort();
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(9);
    expect(await prisma.booking.count({ where: { roomId: room.id, status: 'CONFIRMED' } })).toBe(1);
  });

  it('never oversells multi-room bookings under concurrency', async () => {
    const { room } = await createFixture({ inventory: 3 });
    const users = await Promise.all(Array.from({ length: 6 }, () => registerAgent()));
    await Promise.all(users.map((u) => u.agent.post('/api/bookings').send(bookingBody(room.id, 10, 13, { rooms: 2 }))));
    const rows = await prisma.booking.findMany({ where: { roomId: room.id, status: 'CONFIRMED' } });
    expect(rows.reduce((sum, r) => sum + r.roomsCount, 0)).toBeLessThanOrEqual(3);
    expect(rows).toHaveLength(1);
  });

  it('rejects parties too large, bad input and unknown rooms', async () => {
    const { room } = await createFixture();
    const { agent } = await registerAgent();
    const big = await agent.post('/api/bookings').send(bookingBody(room.id, 10, 13, { adults: 3 }));
    expect(big.body.error.code).toBe('PARTY_TOO_LARGE');
    expect((await agent.post('/api/bookings').send(bookingBody(room.id, -3, 2))).status).toBe(400);
    expect((await agent.post('/api/bookings').send({ roomId: 'nope' })).status).toBe(400);
    expect((await agent.post('/api/bookings').send(bookingBody('00000000-0000-4000-8000-000000000000'))).status).toBe(404);
    const malformed = await agent.post('/api/bookings').set('Content-Type', 'application/json').send('{bad');
    expect(malformed.status).toBe(400);
    expect(await prisma.booking.count()).toBe(0);
  });

  it('lists history by scope', async () => {
    const { room } = await createFixture({ inventory: 5 });
    const { agent, userId } = await registerAgent();
    const upcoming = await agent.post('/api/bookings').send(bookingBody(room.id, 10, 12));
    const toCancel = await agent.post('/api/bookings').send(bookingBody(room.id, 20, 22));
    await agent.post(`/api/bookings/${toCancel.body.data.id}/cancel`).send({});
    const past = await prisma.booking.create({
      data: {
        reference: 'BKPAST', userId, roomId: room.id, checkIn: new Date(futureDate(-10)), checkOut: new Date(futureDate(-8)),
        adults: 1, roomsCount: 1, guestFirstName: 'A', guestLastName: 'B', guestEmail: 'a@b.com',
        nightlyPrice: 1, subtotal: 2, taxes: 0, total: 2, currency: 'USD',
      },
    });
    const ids = async (scope: string) => (await agent.get('/api/bookings').query({ scope })).body.data.map((b: { id: string }) => b.id);
    expect(await ids('upcoming')).toEqual([upcoming.body.data.id]);
    expect(await ids('past')).toEqual([past.id]);
    expect(await ids('cancelled')).toEqual([toCancel.body.data.id]);
    expect(await ids('all')).toHaveLength(3);
  });

  it('cancels, frees the room, and rejects a second cancel', async () => {
    const { room } = await createFixture({ inventory: 1 });
    const a = await registerAgent();
    const b = await registerAgent();
    const { body } = await a.agent.post('/api/bookings').send(bookingBody(room.id));
    const cancelled = await a.agent.post(`/api/bookings/${body.data.id}/cancel`).send({ reason: 'Plans changed' });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data).toMatchObject({ status: 'CANCELLED', cancelReason: 'Plans changed', canCancel: false });

    const again = await a.agent.post(`/api/bookings/${body.data.id}/cancel`).send({});
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('ALREADY_CANCELLED');
    expect((await b.agent.post('/api/bookings').send(bookingBody(room.id))).status).toBe(201);
  });

  it('blocks cancelling started stays and non-refundable rates', async () => {
    const { room } = await createFixture({ inventory: 3 });
    const { agent, userId } = await registerAgent();
    const started = await prisma.booking.create({
      data: {
        reference: 'BKSTART', userId, roomId: room.id, checkIn: new Date(futureDate(0)), checkOut: new Date(futureDate(2)),
        adults: 1, roomsCount: 1, guestFirstName: 'A', guestLastName: 'B', guestEmail: 'a@b.com',
        nightlyPrice: 1, subtotal: 2, taxes: 0, total: 2, currency: 'USD',
      },
    });
    const res = await agent.post(`/api/bookings/${started.id}/cancel`).send({});
    expect(res.body.error.code).toBe('STAY_STARTED');

    const nr = await createFixture({ refundable: false });
    const created = await agent.post('/api/bookings').send(bookingBody(nr.room.id));
    expect(created.body.data.canCancel).toBe(false);
    const denied = await agent.post(`/api/bookings/${created.body.data.id}/cancel`).send({});
    expect(denied.body.error.code).toBe('NON_REFUNDABLE');
  });

  it("hides other users' bookings and restricts admin routes", async () => {
    const { room } = await createFixture();
    const owner = await registerAgent();
    const other = await registerAgent();
    const admin = await registerAgent('ADMIN');
    const { body } = await owner.agent.post('/api/bookings').send(bookingBody(room.id));
    const url = `/api/bookings/${body.data.id}`;

    expect((await other.agent.get(url)).status).toBe(404);
    expect((await other.agent.post(`${url}/cancel`).send({})).status).toBe(404);
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: body.data.id } })).status).toBe('CONFIRMED');
    expect((await other.agent.get('/api/bookings')).body.data).toEqual([]);

    expect((await other.agent.get('/api/bookings/admin/all')).status).toBe(403);
    expect((await admin.agent.get('/api/bookings/admin/all')).body.meta.total).toBe(1);
    expect((await admin.agent.get(url)).status).toBe(200);
  });
});

describe('reviews', () => {
  const review = { rating: 9, title: 'Great', comment: 'Very nice stay' };

  it('only allows past guests, once, and updates the property rating', async () => {
    const { property, room } = await createFixture({ inventory: 3 });
    const { agent, userId } = await registerAgent();
    const url = `/api/properties/${property.id}/reviews`;

    expect((await request(app).post(url).send(review)).status).toBe(401);
    expect((await agent.post(url).send(review)).status).toBe(403);

    await prisma.booking.create({
      data: {
        reference: 'BKREV', userId, roomId: room.id, checkIn: new Date(futureDate(-5)), checkOut: new Date(futureDate(-2)),
        adults: 1, roomsCount: 1, guestFirstName: 'A', guestLastName: 'B', guestEmail: 'a@b.com',
        nightlyPrice: 1, subtotal: 3, taxes: 0, total: 3, currency: 'USD',
      },
    });
    expect((await agent.post(url).send({ ...review, rating: 11 })).status).toBe(400);
    expect((await agent.post(url).send(review)).status).toBe(201);
    expect((await agent.post(url).send(review)).status).toBe(409);

    const updated = await prisma.property.findUniqueOrThrow({ where: { id: property.id } });
    expect(updated).toMatchObject({ ratingAvg: 9, reviewCount: 1 });
    const list = await request(app).get(url);
    expect(list.body.data[0].author).toBe('Test U.');
    expect(JSON.stringify(list.body)).not.toContain('@');
  });
});

describe('favorites', () => {
  it('adds idempotently, lists, removes, and scopes per user', async () => {
    const { property } = await createFixture();
    const a = await registerAgent();
    const b = await registerAgent();
    const url = `/api/favorites/${property.id}`;
    expect((await request(app).put(url)).status).toBe(401);
    expect((await a.agent.put(url)).status).toBe(204);
    expect((await a.agent.put(url)).status).toBe(204);
    expect((await a.agent.get('/api/favorites')).body.data).toHaveLength(1);
    expect((await b.agent.get('/api/favorites')).body.data).toHaveLength(0);
    expect((await a.agent.delete(url)).status).toBe(204);
    expect((await a.agent.delete(url)).status).toBe(204);
    expect((await a.agent.get('/api/favorites')).body.data).toHaveLength(0);
    expect((await a.agent.put('/api/favorites/00000000-0000-4000-8000-000000000000')).status).toBe(404);
  });
});

describe('error handling', () => {
  it('returns structured 404s and no internals', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect((await request(app).get('/api/rooms/not-a-uuid')).status).toBe(400);
  });
});
