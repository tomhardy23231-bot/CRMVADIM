// ============================================================
// CRM Types — Furniture Manufacturing Management System
// ============================================================

/** Возможные статусы заказа */
export type OrderStatus = 'Новый' | 'В производстве' | 'Сборка' | 'Отгружен';

/** Навигационные страницы приложения */
export type PageId = 'dashboard' | 'orders' | 'payment-calendar' | 'settings';

/** Роли пользователей */
export type UserRole = 'ADMIN' | 'MANAGER' | 'WORKER';

/** Разрешения пользователя */
export interface UserPermissions {
  canViewProfit: boolean;
  canViewBudget: boolean;
  canViewPaymentCalendar: boolean;
  canEditOrders: boolean;
  canViewDashboardFinance: boolean;
  canImportFrom1C: boolean;
}

/** Информация о текущем пользователе */
export interface UserInfo {
  id: string;
  login: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions: UserPermissions;
}

/** Транш — часть разбиения статьи бюджета по неделям */
export interface Tranche {
  id: string;
  amount: number;       // Сумма транша (₴)
  month: string;        // Год-Месяц (YYYY-MM), например '2026-05'
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
  total: number;         // Итого продажи (₴)
  cost?: number;         // Реальная себестоимость из 1С (₴)
}

/** Взаиморасчеты (Платеж из 1С) */
export interface Payment1C {
  id: string;
  orderId: string;
  date: string;          // Дата документа
  document: string;      // Представление документа 1С
  article?: string;
  income: number;        // Приход (Оплата от клиента)
  expense: number;       // Расход (Оплата поставщикам/прочее)
  budgetItemId?: string;
}

/** Заказ */
export interface Order {
  id: string;                    // ID заказа (TNDR-001)
  name: string;                  // Название
  status: OrderStatus;
  orderAmount: number;           // Сумма заказа (₴)
  isAmountManual?: boolean;      // Ручной ввод суммы
  plannedCost: number;           // Плановая себестоимость (₴)
  deadline: string;              // Дедлайн (ISO date string)
  productionStart: string;       // Старт производства
  assemblyStart: string;         // Начало сборки
  shippingStart: string;         // Начало отгрузки
  budgetItems: BudgetItem[];     // Дополнительные расходы
  specItems: SpecItem[];         // Спецификация из 1С
  payments?: Payment1C[];        // Исходные документы оплат из 1С
  createdAt: string;
  // Фактические отметки выполнения этапов
  isProductionStarted?: boolean; // Факт: производство начато
  isAssemblyStarted?: boolean;   // Факт: сборка начата
  isShipped?: boolean;           // Факт: отгрузка выполнена
}



/** Статья бюджета может быть доходом или расходом */
export type BudgetItemType = 'expense' | 'income';
