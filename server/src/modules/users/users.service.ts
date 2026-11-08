import bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';
import { config } from '../../config.js';
import { AppError, notFound } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';

export const toUserDto = (u: User) => ({
  id: u.id,
  email: u.email,
  firstName: u.firstName,
  lastName: u.lastName,
  phone: u.phone,
  role: u.role,
  createdAt: u.createdAt,
});

export const hashPassword = (password: string) => bcrypt.hash(password, config.auth.bcryptCost);

export async function getUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw notFound('User');
  return user;
}

export async function updateProfile(
  id: string,
  data: { firstName?: string; lastName?: string; phone?: string | null },
) {
  return prisma.user.update({ where: { id }, data });
}

export async function changePassword(id: string, currentPassword: string, newPassword: string) {
  const user = await getUser(id);
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new AppError(400, 'INVALID_PASSWORD', 'Current password is incorrect');
  }
  await prisma.user.update({
    where: { id },
    data: { passwordHash: await hashPassword(newPassword) },
  });
}
