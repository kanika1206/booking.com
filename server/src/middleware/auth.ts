import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { config } from '../config.js';
import { forbidden, unauthorized } from '../lib/errors.js';

export interface AuthContext {
  userId: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export function signSession(auth: AuthContext) {
  return jwt.sign({ role: auth.role }, config.auth.jwtSecret, {
    subject: auth.userId,
    algorithm: 'HS256',
    expiresIn: config.auth.expiresInSeconds,
  });
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[config.auth.cookieName];
  if (typeof token !== 'string') throw unauthorized();
  try {
    const payload = jwt.verify(token, config.auth.jwtSecret, { algorithms: ['HS256'] });
    if (typeof payload === 'string' || !payload.sub) throw new Error('bad payload');
    req.auth = { userId: payload.sub, role: payload.role as Role };
  } catch {
    throw unauthorized('Session expired or invalid');
  }
  next();
}

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) throw unauthorized();
    if (!roles.includes(req.auth.role)) throw forbidden();
    next();
  };

/** Only call after requireAuth. */
export function currentAuth(req: Request): AuthContext {
  if (!req.auth) throw unauthorized();
  return req.auth;
}
