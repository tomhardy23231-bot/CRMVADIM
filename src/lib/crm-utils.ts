// ============================================================
// Утилиты форматирования — CRM WEST WOOD COMPANY
// ============================================================

/**
 * Форматирование числа в валюту UAH.
 * Пример: 150000 → "150 000 ₴"
 */
export function formatUAH(amount: number): string {
  const formatted = Math.abs(amount)
    .toLocaleString('uk-UA', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  return amount < 0 ? `-${formatted} ₴` : `${formatted} ₴`;
}

/**
 * Форматирование числа с пробелами (без символа валюты).
 * Пример: 150000 → "150 000"
 */
export function formatNumber(amount: number): string {
  return Math.abs(amount).toLocaleString('uk-UA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Расчёт отклонения (План − Факт).
 */
export function calcDeviation(plan: number, fact: number): number {
  return plan - fact;
}

/**
 * Расчёт маржи в процентах.
 * Маржа = ((Сумма − Себестоимость) / Сумма) × 100
 */
export function calcMargin(revenue: number, cost: number): number {
  if (revenue === 0) return 0;
  return Math.round(((revenue - cost) / revenue) * 10000) / 100;
}

/**
 * Генерация простого уникального ID.
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}
