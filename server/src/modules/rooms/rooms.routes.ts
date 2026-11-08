import { Router } from 'express';
import { notFound } from '../../lib/errors.js';
import { uuidParam } from '../../lib/params.js';
import { prisma } from '../../lib/prisma.js';
import { toRoomDto } from './rooms.dto.js';

export const roomsRouter = Router();

roomsRouter.get('/:id', async (req, res) => {
  const room = await prisma.room.findUnique({
    where: { id: uuidParam.parse(req.params.id) },
    include: { amenities: { include: { amenity: true } } },
  });
  if (!room) throw notFound('Room');
  res.json({ data: toRoomDto(room) });
});
