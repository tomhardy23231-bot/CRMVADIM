// ============================================================
// CRM Types — Furniture Manufacturing Management System
// ============================================================

/** Возможные статусы заказа */
export type OrderStatus = 'Новый' | 'В производстве' | 'Сборка' | 'Отгружен';

/** Навигационные страницы приложения */
export type PageId = 'dashboard' | 'orders' | 'payment-calendar';

/** Транш — часть разбиения статьи бюджета по неделям */
export interface Tranche {
  id: string;
  amount: number;       // Сумма транша (₴)
  week: number;         // Номер недели (1, 2, 3…)
}

/** Статья расходов/доходов в бюджете */
export interface BudgetItem {
  id: string;
  name: string;          // Название статьи
  plan: number;          // Плановая сумма (₴)
  fact: number;          // Фактическая сумма из 1С (₴)
  isIncome?: boolean;    // true = статья доходов, false = расходов
  hasTranches?: boolean; // Разбита ли на транши
  tranches?: Tranche[];  // Массив траншей
}

/** Спецификация (материалы из 1С) */
export interface SpecItem {
  id: string;
  material: string;      // Название материала
  unit: string;          // Единица измерения
  quantity: number;      // Количество
  pricePerUnit: number;  // Цена за единицу (₴)
  total: number;         // Итого (₴)
}

/** Заказ */
export interface Order {
  id: string;                    // ID заказа (TNDR-001)
  name: string;                  // Название
  status: OrderStatus;
  orderAmount: number;           // Сумма заказа (₴)
  plannedCost: number;           // Плановая себестоимость (₴)
  deadline: string;              // Дедлайн (ISO date string)
  productionStart: string;       // Старт производства
  assemblyStart: string;         // Начало сборки
  shippingStart: string;         // Начало отгрузки
  budgetItems: BudgetItem[];     // Дополнительные расходы
  specItems: SpecItem[];         // Спецификация из 1С
  createdAt: string;
  // Фактические отметки выполнения этапов
  isProductionStarted?: boolean; // Факт: производство начато
  isAssemblyStarted?: boolean;   // Факт: сборка начата
  isShipped?: boolean;           // Факт: отгрузка выполнена
}

/** Строка платежного календаря (поступление или выплата) */
export interface CalendarRow {
  id: string;
  label: string;           // Название статьи
  week1: number;
  week2: number;
  week3: number;
  week4: number;
  isIncome?: boolean;      // true = поступление, false = выплата
  orderId?: string;        // ID заказа (для фильтрации; пустое = общая статья)
}

/** Статья бюджета может быть доходом или расходом */
export type BudgetItemType = 'expense' | 'income';
