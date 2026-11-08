# Booking prototype

Full-stack travel-booking prototype and the foundation for our Booking Holdings hackathon entry.

**Status:** the backend, database, seed data and frontend are built. Search, availability, pricing, bookings, cancellation, accounts, reviews and favourites are real. Some design features are simulated and labelled in the UI (see [What's real and what's demo](#whats-real-and-whats-demo)).

## Stack

- **API:** Node 22, Express 5, TypeScript, Zod
- **Database:** PostgreSQL 16 (Docker), Prisma 6
- **Auth:** JWT in an httpOnly cookie, bcrypt password hashes
- **Tests:** Vitest and Supertest against a real Postgres database

## Setup

Requires Node 22+ and Docker.

```bash
npm install
cp server/.env.example server/.env
# Set JWT_SECRET in server/.env to the output of: openssl rand -hex 32
npm run db:up        # Postgres on localhost:5433
npm run db:migrate
npm run db:seed
npm run dev:server   # API on http://localhost:4000
npm run dev:client   # App on http://localhost:5173, in a second terminal
```

Check the API with `curl localhost:4000/api/health`.

### Which database?

Run the seed against an empty database. It adds the India catalogue from the Figma design and prices everything in INR, so set `CURRENCY=INR` in `server/.env`.

If your `booking` database holds older USD seed data, keep it and use a separate one. The seed skips any database that already has properties.

```bash
docker compose exec db psql -U booking -d postgres -c "CREATE DATABASE booking_next"
# In server/.env, change the database name at the end of DATABASE_URL to booking_next
npm run db:migrate
npm run db:seed
```

### Demo accounts

Local development only. The seed script refuses to run when `NODE_ENV=production`.

| Email | Password | Role |
| --- | --- | --- |
| `demo@example.com` | `Demo1234!` | User, with upcoming, past and cancelled bookings |
| `admin@example.com` | `Admin1234!` | Admin |

### Commands

| Command | Purpose |
| --- | --- |
| `npm test` | Run backend tests. Uses a separate `booking_test` database, and Postgres must be running |
| `npm run db:seed` | Add seed data. Does nothing if the database already has properties |
| `npm run db:reset` | **Delete all local data**, then migrate and re-seed |
| `npm run db:down` | Stop Postgres and keep the data |

Seed images are loaded from Unsplash, so photos need internet access.

## API

All routes are under `/api`. Successful responses look like `{ data, meta? }`, and errors look like `{ error: { code, message, details? } }`. Money is in integer minor units (cents), and dates are `YYYY-MM-DD`.

| Method and path | Auth | Purpose |
| --- | --- | --- |
| `POST /auth/register`, `/auth/login`, `/auth/logout` | | Start or end a session |
| `GET`, `PATCH /users/me` | User | Read or update profile |
| `POST /users/me/password` | User | Change password |
| `GET /destinations?q=&featured=`, `/destinations/:slug` | | Destinations and autocomplete |
| `GET /search` | | Search with filters, sorting, facets and pagination |
| `GET /properties/featured`, `/properties/:slug` | | Recommended properties and property details |
| `GET /rooms/:id` | | Room details |
| `GET /availability?propertyId=&checkIn=&checkOut=&adults=&children=&rooms=` | | Rooms left and a price for each room |
| `POST /pricing/quote` | | Price for a room and dates |
| `POST /bookings` | User | Create a booking |
| `GET /bookings?scope=upcoming\|past\|cancelled\|all` | User | Booking history |
| `GET /bookings/:id` | Owner or admin | Booking details |
| `POST /bookings/:id/cancel` | Owner or admin | Cancel a booking |
| `GET /bookings/admin/all` | Admin | All bookings |
| `GET`, `POST /properties/:propertyId/reviews` | Posting: past guest | Read or add reviews |
| `GET /favorites`, `PUT`, `DELETE /favorites/:propertyId` | User | Wishlist |

`GET /search` accepts `destination`, `checkIn`, `checkOut`, `adults`, `children`, `rooms`, `minPrice`, `maxPrice`, `minRating`, `types`, `amenities`, `sort` (`relevance`, `price_asc`, `price_desc`, `rating`), `page` and `limit`. `types` and `amenities` are comma-separated.

## Business rules

- **Room inventory:** a `rooms` row is a room category with an `inventory` count, so several guests can book the same category until it runs out. A category with an inventory of 1 behaves as a single physical room.
- **Overbooking:** `createBooking` locks the room row (`SELECT ... FOR UPDATE`) inside a transaction before checking availability, so concurrent requests run one at a time. All bookings must go through this function to keep that guarantee, because the database has no constraint enforcing it.
- **Availability:** counted night by night, and the check-out day counts as free, so back-to-back stays are allowed.
- **Duplicates:** a user can't hold two overlapping bookings for the same room category. To book several rooms, use `rooms` on a single booking.
- **Price:** calculated on the server and stored on the booking. Later rate changes don't affect existing bookings, and prices sent by the client are ignored.
- **Cancellation:** allowed before the check-in date. Non-refundable rates can only be cancelled by an admin.
- **Reviews:** one per property, and only after a completed stay.
- **Dates:** "today" is the current UTC date, not the property's local date.
- **Settings:** tax rate, currency and maximum stay are set in `server/.env`.

## Project structure

```
server/
  prisma/           schema, migrations, seed script
  src/
    config.ts       validated environment settings
    app.ts          middleware and route mounting
    lib/            database client, errors, dates
    middleware/     auth, error handling
    modules/<name>/ routes and business logic for each feature
  tests/
client/
  public/illustrations/ scene artwork exported from Figma
  src/
    lib/            API client, formatting, stay and rate logic, session hooks
    components/     shared UI, nav, search bar, cards, map
    pages/          one file per screen
    demo/           ALL simulated data and the rule-based planner
design/figma/       PNG exports of the 20 Figma screens
```

### Extending for the problem statement

1. **New feature:** create `server/src/modules/<name>/` and mount its router in `src/app.ts`.
2. **Schema change:** edit `prisma/schema.prisma`, then run `npx prisma migrate dev --name <change>` from `server/`.
3. **New business setting:** add it to the schema in `src/config.ts` and to `.env.example`.

## Known limitations

- Search loads all properties matching the destination and filters them in memory. This is fine for seed-sized data, but would need to move into SQL for a large catalogue.
- Rate limiting on login and registration is held in memory, so it resets on restart and isn't shared between server instances.
- There is no payment step. A booking is confirmed once it's saved.
- Docker Compose only runs Postgres for now. The API runs on the host.

## Frontend

React 19, TypeScript, Vite, React Router and TanStack Query, built from the [Figma file](https://www.figma.com/design/DfF0LcfC8mV1YBXJWdeIlr/Booking.com-Next-%E2%80%94-Premium-Travel-Platform?node-id=2-4&p=f). Design tokens are in `client/src/styles/app.css`. Run its tests with `npm test -w client`.

To re-export assets, create a read-only Figma personal access token with file content scope and save it to `~/.config/figma/token`. Never commit it.

### What's real and what's demo

**Real, backed by the API and database:**

- Search, filters, sorting and facets, accounts and sign-in, saved stays, reviews
- Live room counts: rooms are counted night by night, and the client rechecks every 15–30 seconds
- Prices: every total comes from the server, including 12% GST
- Bookings: created under a row lock, so stale pages can't overbook. The server rejects sold-out rooms and duplicates
- Cancelling, which puts the room back on sale
- Price-drop rebooking, which compares the booking's stored price with today's rate, then cancels and rebooks
- "Why this" reasons, lookalike grouping and rate recommendations, which are rules applied to real data

**Demo only, labelled in the UI, data in `client/src/demo/`:**

| Feature | What it actually is |
| --- | --- |
| AI Trip Planner | A rule-based text parser and template itineraries, with no AI model. Shortlisted stays and their prices are real; activity and flight costs are samples |
| Messages and Scam Shield | Sample conversations. Nothing is sent and no message is scanned |
| Verified badge, trust score | Sample data for the India catalogue only |
| AI review summary | Hand-written for Saltwater Cove Resort. The reviews below it are real seed data |
| Genius level | A label only. No discount is applied |
| Payment | Not connected. Fields are locked to sample values and no money moves |
| 10-minute hold timer | A countdown only. Rooms aren't held, so someone else can book first and the server will then reject your booking |
| Map | An illustration from Figma with no map provider. Pins use real coordinates, scaled and nudged apart |

**Not built:** Flights, Car rental, Attractions and List your property are disabled in the nav. Dark mode isn't built, because the file's dark values need Figma's Enterprise-only variables API.

### Differences from Figma

- **Price breakdown:** shows room and GST only, because that's what the server charges. Totals match the design, but there are no Genius or tourism-fee lines.
- **Search prices:** cards show the cheapest eligible rate, so Saltwater Cove shows ₹22,800 in search and defaults to the recommended ₹24,660 rate on the room page.
- **Left out because there's no data behind them:** strikethrough prices, "Closest to beach" and "Quietest" sorts, budget histogram, booking PIN, and the free-cancellation and verified filters.
- **Counts:** review and stay counts are the real seeded numbers, such as 12 reviews rather than 2,184.
- **Added beyond Figma:** sign-in, register, saved stays and account pages, built from the same components.

### Rate plans

The schema has no rate-plan table, so each rate is a `rooms` row named `Room category | Rate`, and the client groups them into one card. **Each rate therefore has its own inventory.** Booking one Garden Villa rate leaves the other rates' counts unchanged. A real rate-plan model would share one inventory across rates.
