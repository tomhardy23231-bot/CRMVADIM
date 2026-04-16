import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, DEFAULT_PERMISSIONS } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAction } from '@/lib/audit';
import bcrypt from 'bcryptjs';

// ============================================================
// GET /api/users — Список пользователей (только Admin)
// ============================================================
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      login: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      permissions: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(users);
}

// ============================================================
// POST /api/users — Создание пользователя (только Admin)
// ============================================================
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }

  const body = await req.json();
  const { login, password, firstName, lastName, role } = body;

  if (!login || !password || !firstName || !lastName) {
    return NextResponse.json({ error: 'Все поля обязательны' }, { status: 400 });
  }

  // Проверяем уникальность логина
  const existing = await prisma.user.findUnique({ where: { login } });
  if (existing) {
    return NextResponse.json({ error: 'Пользователь с таким логином уже существует' }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const validRole = ['ADMIN', 'MANAGER', 'WORKER'].includes(role) ? role : 'MANAGER';
  const permissions = DEFAULT_PERMISSIONS[validRole] || DEFAULT_PERMISSIONS.MANAGER;

  const user = await prisma.user.create({
    data: {
      login,
      password: hashedPassword,
      firstName,
      lastName,
      role: validRole,
      permissions,
    },
    select: {
      id: true,
      login: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      permissions: true,
      createdAt: true,
    },
  });

  // Логируем создание
  await logAction({
    userId: (session.user as any).id,
    action: 'user.create',
    entity: 'user',
    entityId: user.id,
    details: { 
      description: `Создан пользователь: ${firstName} ${lastName} (${login})`,
      role: validRole,
    },
  });

  return NextResponse.json(user, { status: 201 });
}
