import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAuditLogs } from '@/lib/audit';

// ============================================================
// GET /api/audit-log — Получение логов (только Admin)
// ============================================================
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const userId = searchParams.get('userId') || undefined;
  const action = searchParams.get('action') || undefined;
  const dateFrom = searchParams.get('dateFrom') || undefined;
  const dateTo = searchParams.get('dateTo') || undefined;

  const result = await getAuditLogs({ page, limit, userId, action, dateFrom, dateTo });

  return NextResponse.json(result);
}
