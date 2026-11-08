import { Router } from 'express';
import { z } from 'zod';
import { currentAuth, requireAuth } from '../../middleware/auth.js';
import { passwordSchema } from '../auth/auth.schemas.js';
import { changePassword, getUser, toUserDto, updateProfile } from './users.service.js';

const profileSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    phone: z.string().trim().max(30).nullable(),
  })
  .partial();

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export const usersRouter = Router();
usersRouter.use(requireAuth);

usersRouter.get('/me', async (req, res) => {
  res.json({ data: toUserDto(await getUser(currentAuth(req).userId)) });
});

usersRouter.patch('/me', async (req, res) => {
  const user = await updateProfile(currentAuth(req).userId, profileSchema.parse(req.body));
  res.json({ data: toUserDto(user) });
});

usersRouter.post('/me/password', async (req, res) => {
  const { currentPassword, newPassword } = passwordChangeSchema.parse(req.body);
  await changePassword(currentAuth(req).userId, currentPassword, newPassword);
  res.status(204).end();
});
