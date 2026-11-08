import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import { prisma } from './lib/prisma.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { availabilityRouter } from './modules/availability/availability.routes.js';
import { bookingsRouter } from './modules/bookings/bookings.routes.js';
import { destinationsRouter } from './modules/destinations/destinations.routes.js';
import { favoritesRouter } from './modules/favorites/favorites.routes.js';
import { pricingRouter } from './modules/pricing/pricing.routes.js';
import { propertiesRouter } from './modules/properties/properties.routes.js';
import { reviewsRouter } from './modules/reviews/reviews.routes.js';
import { roomsRouter } from './modules/rooms/rooms.routes.js';
import { searchRouter } from './modules/search/search.routes.js';
import { usersRouter } from './modules/users/users.routes.js';

/** To add a module for the hackathon PS: create src/modules/<name>/ and mount its router here. */
export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: config.clientOrigin, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/api/health', async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ data: { status: 'ok' } });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/destinations', destinationsRouter);
  app.use('/api/properties/:propertyId/reviews', reviewsRouter);
  app.use('/api/properties', propertiesRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/availability', availabilityRouter);
  app.use('/api/rooms', roomsRouter);
  app.use('/api/pricing', pricingRouter);
  app.use('/api/bookings', bookingsRouter);
  app.use('/api/favorites', favoritesRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
