// prisma/seed.ts

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPassword   = await bcrypt.hash('Dora@112233', 10);
  const managerPassword = await bcrypt.hash('Samii@00', 10);
  const empPassword     = await bcrypt.hash('Dishaa1234', 10);

  // ── Superadmin (untouched) ───────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'chardepradhumn2000@gmail.com' },
    update: {
      password: adminPassword,
      role: 'SUPERADMIN',
    },
    create: {
      email: 'chardepradhumn2000@gmail.com',
      name: 'Pradhumn',
      password: adminPassword,
      role: 'SUPERADMIN',
    },
  });

  // ── Manager ──────────────────────────────────────────────────────────────
  const manager = await prisma.user.upsert({
    where: { email: 'samikshajuwar@gmail.com' },
    update: {
      password: managerPassword,
      role: 'MANAGER',
    },
    create: {
      email: 'samikshajuwar@gmail.com',
      name: 'Samiksha',
      password: managerPassword,
      role: 'MANAGER',
    },
  });

  // ── Employee (assigned to Samiksha) ──────────────────────────────────────
  const employee = await prisma.user.upsert({
    where: { email: 'disha@gmail.com' },
    update: {
      password: empPassword,
      role: 'EMPLOYEE',
      managerId: manager.id,
    },
    create: {
      email: 'disha@gmail.com',
      name: 'Disha',
      password: empPassword,
      role: 'EMPLOYEE',
      managerId: manager.id,
    },
  });

  console.log('✅ Seeded successfully:');
  console.log('Superadmin:', admin.email);
  console.log('Manager:   ', manager.email);
  console.log('Employee:  ', employee.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });