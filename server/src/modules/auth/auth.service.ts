import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { config } from '../../config.js';
import { conflict, unauthorized } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { hashPassword } from '../users/users.service.js';

// Compared against when the email is unknown, so response time does not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer-not-a-real-password', config.auth.bcryptCost);

export async function register(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}) {
  const { password, ...rest } = input;
  try {
    return await prisma.user.create({
      data: { ...rest, passwordHash: await hashPassword(password) },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw conflict('EMAIL_TAKEN', 'An account with this email already exists');
    }
    throw err;
  }
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) throw unauthorized('Incorrect email or password');
  return user;
}
