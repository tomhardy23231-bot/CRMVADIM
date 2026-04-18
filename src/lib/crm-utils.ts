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
 * Расчет "Умной" (гибридной) себестоимости:
 * Если у статьи расходов есть привязанный факт (из 1С или платежей), берется факт.
 * Если факта нет — берется плановое значение.
 */
export function calcSmartHybridCost(order: any): number {
  if (!order || !order.budgetItems) return 0;
  return order.budgetItems.filter((b: any) => !b.isIncome).reduce((sum: number, b: any) => {
    if (b.name === 'Материалы (План)') {
      return sum + (b.fact > 0 ? b.fact : b.plan);
    }
    const linkedPayments = (order.payments || []).filter((p: any) => p.budgetItemId === b.id);
    const paymentsSum = linkedPayments.reduce((acc: number, p: any) => acc + p.expense, 0);
    return sum + (paymentsSum > 0 ? paymentsSum : b.plan);
  }, 0);
}

/**
 * Генерация простого уникального ID.
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Генерирует список ближайших 12 недель (начиная с текущего понедельника).
 * Значение value хранит и номер недели, и даты, например: "2026-W15::06.04-12.04"
 */
export function generateWeekOptions(lang: 'ru' | 'ukr' = 'ru') {
  const options = [];
  const now = new Date();
  const day = now.getDay();
  // Находим понедельник текущей недели
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const currentMonday = new Date(now.setDate(diff));
  
  for (let i = 0; i < 12; i++) {
    const start = new Date(currentMonday);
    start.setDate(currentMonday.getDate() + (i * 7));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    // ISO Расчет номера недели
    const d = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(( ( (d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
    const year = d.getUTCFullYear();
    
    const sDate = `${String(start.getDate()).padStart(2,'0')}.${String(start.getMonth()+1).padStart(2,'0')}`;
    const eDate = `${String(end.getDate()).padStart(2,'0')}.${String(end.getMonth()+1).padStart(2,'0')}`;

    const value = `${year}-W${String(weekNo).padStart(2,'0')}::${sDate}-${eDate}`;
    const weekWord = lang === 'ukr' ? 'Тиждень' : 'Неделя';
    const label = `${weekWord} ${weekNo} (${sDate}-${eDate})`;
    
    options.push({ value, label });
  }
  return options;
}

/**
 * Парсит строку "2026-W15::06.04-12.04" обратно в читабельный вид.
 */
export function formatWeekStr(value: string, lang: 'ru' | 'ukr' = 'ru'): string {
  if (!value || !value.includes('::')) return value || '';
  const [yw, dates] = value.split('::');
  const weekNo = yw.split('-W')[1];
  const weekWord = lang === 'ukr' ? 'Тиждень' : 'Неделя';
  return `${weekWord} ${parseInt(weekNo)} \n(${dates})`;
}

/**
 * Возвращает ISO-номер недели для заданной даты.
 */
export function getISOWeekNumber(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week: weekNo };
}

/**
 * Конвертирует ISO дату (YYYY-MM-DD) в week-value формат для платёжного календаря.
 */
export function dateToWeekValue(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  const { year, week } = getISOWeekNumber(d);
  // Находим понедельник этой недели
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const sDate = `${String(monday.getDate()).padStart(2, '0')}.${String(monday.getMonth() + 1).padStart(2, '0')}`;
  const eDate = `${String(sunday.getDate()).padStart(2, '0')}.${String(sunday.getMonth() + 1).padStart(2, '0')}`;
  return `${year}-W${String(week).padStart(2, '0')}::${sDate}-${eDate}`;
}

/**
 * Генерирует список всех недель текущего года (с 1 января до конца декабря).
 * Для использования в платёжном календаре.
 */
export function generateYearWeeks(lang: 'ru' | 'ukr' = 'ru') {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  const year = now.getFullYear();

  // Находим первый понедельник года (или последний понедельник прошлого года, если 1 января не понедельник)
  const jan1 = new Date(year, 0, 1);
  const jan1Day = jan1.getDay();
  const firstMonday = new Date(year, 0, 1);
  // Если 1 янв не понедельник — откатываемся назад
  const daysToMonday = jan1Day === 0 ? -6 : (1 - jan1Day);
  firstMonday.setDate(jan1.getDate() + daysToMonday);

  // Генерирую ~53 недели
  for (let i = 0; i < 53; i++) {
    const start = new Date(firstMonday);
    start.setDate(firstMonday.getDate() + i * 7);
    
    // Стоп если вышли за январь следующего года
    if (start.getFullYear() > year && start.getMonth() > 0) break;

    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const { year: wYear, week: weekNo } = getISOWeekNumber(start);

    const sDate = `${String(start.getDate()).padStart(2, '0')}.${String(start.getMonth() + 1).padStart(2, '0')}`;
    const eDate = `${String(end.getDate()).padStart(2, '0')}.${String(end.getMonth() + 1).padStart(2, '0')}`;

    const value = `${wYear}-W${String(weekNo).padStart(2, '0')}::${sDate}-${eDate}`;
    const weekWord = lang === 'ukr' ? 'Тиж' : 'Нед';
    const label = `${weekWord} ${weekNo} (${sDate}–${eDate})`;

    options.push({ value, label });
  }
  return options;
}

/**
 * Возвращает week-value для текущей недели.
 */
export function getCurrentWeekValue(): string {
  return dateToWeekValue(new Date().toISOString().slice(0, 10));
}

/**
 * Форматирует ISO дату в локальный вид: DD.MM.YYYY
 */
export function formatDateShort(isoDate: string): string {
  if (!isoDate) return '';
  const d = new Date(isoDate + 'T00:00:00');
  if (isNaN(d.getTime())) return isoDate;
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}
