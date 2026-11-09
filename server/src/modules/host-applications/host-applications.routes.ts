import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../../config.js';
import { notFound } from '../../lib/errors.js';
import { pageMeta, pagination, uuidParam } from '../../lib/params.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

const PROPERTY_TYPES = ['HOTEL', 'APARTMENT', 'RESORT', 'VILLA', 'HOSTEL', 'GUESTHOUSE'] as const;
const STATUSES = ['NEW', 'CONTACTED', 'APPROVED', 'DECLINED'] as const;

export const createHostApplicationSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(100),
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(200),
  phone: z.string().trim().max(30).optional().transform((v) => v || undefined),
  propertyName: z.string().trim().min(2, 'Enter the property name').max(120),
  city: z.string().trim().min(2, 'Enter the city').max(80),
  propertyType: z.enum(PROPERTY_TYPES),
  rooms: z.number().int().min(1, 'At least 1 room').max(500),
  message: z.string().trim().max(2000).optional().transform((v) => v || undefined),
});

// Public form: keep it from being used to flood the table.
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.isTest,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many applications, try again later' } },
});

const toDto = (a: Awaited<ReturnType<typeof prisma.hostApplication.findFirstOrThrow>>) => ({
  id: a.id, name: a.name, email: a.email, phone: a.phone, propertyName: a.propertyName, city: a.city,
  propertyType: a.propertyType, rooms: a.rooms, message: a.message, status: a.status,
  createdAt: a.createdAt.toISOString(),
});

export const hostApplicationsRouter = Router();

hostApplicationsRouter.post('/', limiter, async (req, res) => {
  const input = createHostApplicationSchema.parse(req.body);
  const application = await prisma.hostApplication.create({ data: input });
  // Only echo back what the applicant needs; the full record is for admins.
  res.status(201).json({ data: { id: application.id, status: application.status, createdAt: application.createdAt.toISOString() } });
});

hostApplicationsRouter.get('/', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const q = z.object({ ...pagination, status: z.enum(STATUSES).optional() }).parse(req.query);
  const where = q.status ? { status: q.status } : {};
  const [rows, total] = await Promise.all([
    prisma.hostApplication.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.limit, take: q.limit }),
    prisma.hostApplication.count({ where }),
  ]);
  res.json({ data: rows.map(toDto), meta: pageMeta(q.page, q.limit, total) });
});

hostApplicationsRouter.patch('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const id = uuidParam.parse(req.params.id);
  const { status } = z.object({ status: z.enum(STATUSES) }).parse(req.body);
  const existing = await prisma.hostApplication.findUnique({ where: { id } });
  if (!existing) throw notFound('Application');
  res.json({ data: toDto(await prisma.hostApplication.update({ where: { id }, data: { status } })) });
});
