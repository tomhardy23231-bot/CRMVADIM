// ============================================================
// Mock Data — Начальные данные CRM WEST WOOD COMPANY
// ============================================================

import type { Order, SpecItem, BudgetItem } from './crm-types';

// --- Спецификация (материалы из 1С) для TNDR-001 ---
const tndr001Spec: SpecItem[] = [
  { id: 'spec-1', material: 'ДСП 16мм EGGER (дуб сонома)', unit: 'лист', quantity: 120, pricePerUnit: 1850, total: 222000 },
  { id: 'spec-2', material: 'Кромка ABS 2мм (дуб сонома)', unit: 'пог.м', quantity: 2400, pricePerUnit: 18, total: 43200 },
  { id: 'spec-3', material: 'Фурнитура Hettich (петли, направляющие)', unit: 'компл.', quantity: 80, pricePerUnit: 4200, total: 336000 },
  { id: 'spec-4', material: 'Столешница из камня (кварц)', unit: 'кв.м', quantity: 45, pricePerUnit: 4800, total: 216000 },
  { id: 'spec-5', material: 'Краска и ЛКМ (покрытие)', unit: 'компл.', quantity: 1, pricePerUnit: 85000, total: 85000 },
];

// --- Дополнительные расходы (Бюджетирование) для TNDR-001 ---
const tndr001Budget: BudgetItem[] = [
  {
    id: 'budget-1',
    name: 'Логистика',
    plan: 25000,
    fact: 25000,
    isIncome: false,
  },
  {
    id: 'budget-2',
    name: 'Грузчики',
    plan: 10000,
    fact: 14000,
    isIncome: false,
  },
  {
    id: 'budget-3',
    name: 'Сборка и Монтаж',
    plan: 150000,
    fact: 0,
    isIncome: false,
    hasTranches: false,
    tranches: [
      { id: 'tr-1', amount: 50000, week: 1 },
      { id: 'tr-2', amount: 100000, week: 2 },
    ],
  },
];

// --- Основной тестовый заказ ---
const tndr001: Order = {
  id: 'TNDR-001',
  name: 'Тендер #125: ЖК Французский Квартал — Мебель в лобби',
  status: 'В производстве',
  orderAmount: 3500000,
  plannedCost: 1800000,
  deadline: '2026-06-20',
  productionStart: '2026-05-01',
  assemblyStart: '2026-06-10',
  shippingStart: '2026-06-18',
  budgetItems: tndr001Budget,
  specItems: tndr001Spec,
  createdAt: '2026-04-15T10:00:00Z',
  isProductionStarted: true,
  isAssemblyStarted: false,
  isShipped: false,
};

// --- Ещё пара заказов для таблицы ---
export const initialOrders: Order[] = [
  tndr001,
  {
    id: 'TNDR-002',
    name: 'Заказ #88: Офисные перегородки — БЦ Левый Берег',
    status: 'Новый',
    orderAmount: 1250000,
    plannedCost: 780000,
    deadline: '2026-05-15',
    productionStart: '2026-04-20',
    assemblyStart: '2026-05-10',
    shippingStart: '2026-05-14',
    budgetItems: [],
    specItems: [],
    createdAt: '2026-04-10T08:30:00Z',
  },
  {
    id: 'TNDR-003',
    name: 'Заказ #92: Кухни на заказ — ЖК Символ',
    status: 'Сборка',
    orderAmount: 890000,
    plannedCost: 540000,
    deadline: '2026-05-08',
    productionStart: '2026-03-25',
    assemblyStart: '2026-05-01',
    shippingStart: '2026-05-07',
    budgetItems: [],
    specItems: [],
    createdAt: '2026-03-20T14:00:00Z',
    isProductionStarted: true,
    isAssemblyStarted: true,
    isShipped: false,
  },
  {
    id: 'TNDR-004',
    name: 'Заказ #97: Шкафы-купе — ЖК Резиденция Печерск',
    status: 'Отгружен',
    orderAmount: 2100000,
    plannedCost: 1350000,
    deadline: '2026-04-10',
    productionStart: '2026-02-15',
    assemblyStart: '2026-04-01',
    shippingStart: '2026-04-09',
    budgetItems: [],
    specItems: [],
    createdAt: '2026-02-01T09:00:00Z',
    isProductionStarted: true,
    isAssemblyStarted: true,
    isShipped: true,
  },
  {
    id: 'TNDR-005',
    name: 'Заказ #101: Мебель для ресторана «Днепр»',
    status: 'В производстве',
    orderAmount: 1750000,
    plannedCost: 1100000,
    deadline: '2026-05-25',
    productionStart: '2026-04-01',
    assemblyStart: '2026-05-18',
    shippingStart: '2026-05-24',
    budgetItems: [],
    specItems: [],
    createdAt: '2026-03-28T11:15:00Z',
    isProductionStarted: true,
    isAssemblyStarted: false,
    isShipped: false,
  },
];
