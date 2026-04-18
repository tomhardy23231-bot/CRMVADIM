import { prisma } from './db';

// ============================================================
// Утилита логирования действий (Audit Log)
// ============================================================

interface LogActionParams {
  userId: string;
  action: string;        // "order.create", "budget.update", "user.create" etc.
  entity?: string;       // "order", "user", "budgetItem"
  entityId?: string;     // ID затронутой сущности
  details?: Record<string, any>; // Дополнительные данные
}

/**
 * Записывает действие пользователя в журнал аудита.
 * Используется во всех API-маршрутах для отслеживания изменений.
 */
export async function logAction({ userId, action, entity, entityId, details }: LogActionParams) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity: entity || null,
        entityId: entityId || null,
        details: details || undefined,
      },
    });
  } catch (error) {
    // Не блокируем основную операцию при ошибке логирования
    console.error('[AuditLog] Failed to log action:', error);
  }
}

/**
 * Получает логи с пагинацией и фильтрами.
 */
export async function getAuditLogs(params: {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const { page = 1, limit = 50, userId, action, dateFrom, dateTo } = params;

  const where: any = {};

  if (userId) where.userId = userId;
  if (action) where.action = { contains: action };
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo);
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total, page, limit, totalPages: Math.ceil(total / limit) };
}
