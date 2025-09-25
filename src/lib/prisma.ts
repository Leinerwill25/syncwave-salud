// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const isProduction = process.env.NODE_ENV === 'production';

declare global {
	// allow global prisma in dev to avoid multiple instances
	// eslint-disable-next-line no-var
	var __prisma__: PrismaClient | undefined;
}

const prisma = isProduction
	? new PrismaClient({
			log: ['error'], // reduce noise in production
	  })
	: global.__prisma__ ??
	  new PrismaClient({
			log: ['query', 'info', 'warn', 'error'],
	  });

if (!isProduction) global.__prisma__ = prisma;

export default prisma;
