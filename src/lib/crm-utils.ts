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
