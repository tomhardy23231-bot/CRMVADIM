import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAction } from '@/lib/audit';
import bcrypt from 'bcryptjs';

// ============================================================
// POST /api/users/[userId]/reset-password — Сброс пароля
// ============================================================
export async function POST(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }

  const { userId } = await params;
  const body = await req.json();
  const { newPassword } = body;

  if (!newPassword || newPassword.length < 4) {
    return NextResponse.json({ error: 'Пароль должен содержать минимум 4 символа' }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  const user = await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
    select: { id: true, firstName: true, lastName: true },
  });

  await logAction({
    userId: (session.user as any).id,
    action: 'user.resetPassword',
    entity: 'user',
    entityId: userId,
    details: { description: `Сброшен пароль для: ${user.firstName} ${user.lastName}` },
  });

  return NextResponse.json({ success: true });
}
