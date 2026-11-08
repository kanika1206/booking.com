import { PrismaClient, type Prisma } from '@prisma/client';

export const prisma = new PrismaClient();
export type Db = PrismaClient | Prisma.TransactionClient;
