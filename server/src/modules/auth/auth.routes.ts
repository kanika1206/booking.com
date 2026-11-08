import { Router, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../../config.js';
import { signSession } from '../../middleware/auth.js';
import { toUserDto } from '../users/users.service.js';
import { loginSchema, registerSchema } from './auth.schemas.js';
import { login, register } from './auth.service.js';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.isTest,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts, try again later' } },
});

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: config.isProduction,
  path: '/',
} as const;

function startSession(res: Response, user: { id: string; role: 'USER' | 'ADMIN' }) {
  res.cookie(config.auth.cookieName, signSession({ userId: user.id, role: user.role }), {
    ...cookieOptions,
    maxAge: config.auth.expiresInSeconds * 1000,
  });
}

export const authRouter = Router();

authRouter.post('/register', limiter, async (req, res) => {
  const user = await register(registerSchema.parse(req.body));
  startSession(res, user);
  res.status(201).json({ data: toUserDto(user) });
});

authRouter.post('/login', limiter, async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await login(email, password);
  startSession(res, user);
  res.json({ data: toUserDto(user) });
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(config.auth.cookieName, cookieOptions);
  res.status(204).end();
});
