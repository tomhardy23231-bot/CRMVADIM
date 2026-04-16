import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAction } from '@/lib/audit';

// ============================================================
// PUT /api/users/[userId] — Обновление пользователя
// ============================================================
export async function PUT(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }

  const { userId } = await params;
  const body = await req.json();
  const { firstName, lastName, role, isActive, permissions } = body;

  const updateData: any = {};
  if (firstName !== undefined) updateData.firstName = firstName;
  if (lastName !== undefined) updateData.lastName = lastName;
  if (role !== undefined && ['ADMIN', 'MANAGER', 'WORKER'].includes(role)) updateData.role = role;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (permissions !== undefined) updateData.permissions = permissions;

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
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
  });

  await logAction({
    userId: (session.user as any).id,
    action: 'user.update',
    entity: 'user',
    entityId: userId,
    details: {
      description: `Обновлён пользователь: ${user.firstName} ${user.lastName}`,
      changes: updateData,
    },
  });

  return NextResponse.json(user);
}

// ============================================================
// DELETE /api/users/[userId] — Деактивация пользователя
// ============================================================
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }

  const { userId } = await params;

  // Нельзя деактивировать себя
  if (userId === (session.user as any).id) {
    return NextResponse.json({ error: 'Нельзя деактивировать свой аккаунт' }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
    select: { id: true, firstName: true, lastName: true },
  });

  await logAction({
    userId: (session.user as any).id,
    action: 'user.deactivate',
    entity: 'user',
    entityId: userId,
    details: { description: `Деактивирован: ${user.firstName} ${user.lastName}` },
  });

  return NextResponse.json({ success: true });
}
