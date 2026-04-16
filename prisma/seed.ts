// Seed script — создание первого администратора
// Запуск: npx tsx prisma/seed.ts

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Проверяем, есть ли уже пользователи
  const existingUsers = await prisma.user.count();
  
  if (existingUsers > 0) {
    console.log('⚠️  Пользователи уже существуют. Пропускаем seed.');
    return;
  }

  const hashedPassword = await bcrypt.hash('admin123', 12);

  const admin = await prisma.user.create({
    data: {
      login: 'admin',
      password: hashedPassword,
      firstName: 'Вадим',
      lastName: 'Админ',
      role: 'ADMIN',
      isActive: true,
      permissions: {
        canViewProfit: true,
        canViewBudget: true,
        canViewPaymentCalendar: true,
        canEditOrders: true,
        canViewDashboardFinance: true,
        canImportFrom1C: true,
      },
    },
  });

  // Записываем в лог
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'system.seed',
      entity: 'user',
      entityId: admin.id,
      details: { description: 'Создан первый администратор системы' },
    },
  });

  console.log('✅ Администратор создан:');
  console.log(`   Логин: admin`);
  console.log(`   Пароль: admin123`);
  console.log(`   Роль: ADMIN`);
  console.log(`   ID: ${admin.id}`);
}

main()
  .catch((e) => {
    console.error('❌ Ошибка seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
