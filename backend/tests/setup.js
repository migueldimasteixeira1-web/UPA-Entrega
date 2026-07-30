import { beforeEach } from 'vitest';
import prisma from '../src/lib/prisma.js';

beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "OrderHistory", "OrderItem", "Order", "Route", "Address", "Patient", "Medication", "User", "DailyCounter" RESTART IDENTITY CASCADE;'
  );
});
