'use client';

import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type {
  PageId,
  Order,
  OrderStatus,
  Tranche,
} from './crm-types';
import type { Lang } from './translations';
import { initialOrders } from './crm-mock-data';
import { generateId } from './crm-utils';
import { t } from './translations';

// ============================================================
// CRM Context — Глобальное состояние приложения
// ============================================================

interface CRMState {
  // Навигация
  currentPage: PageId;
  setCurrentPage: (page: PageId) => void;
  breadcrumbs: string[];
  setBreadcrumbs: (items: string[]) => void;

  // Язык
  lang: Lang;
  toggleLang: () => void;
  /** Функция перевода: t('key') → строка */
  tr: (key: string) => string;

  // Сайдбар
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Заказы
  orders: Order[];
  selectedOrderId: string | null;
  setSelectedOrderId: (id: string | null) => void;
  addOrder: (id: string) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  updateOrderDates: (orderId: string, updates: Partial<Pick<Order, 'productionStart' | 'assemblyStart' | 'shippingStart' | 'deadline'>>) => void;
  toggleStageFlag: (orderId: string, flag: 'isProductionStarted' | 'isAssemblyStarted' | 'isShipped') => void;
  updateBudgetItemPlan: (orderId: string, itemId: string, newPlan: number) => void;
  updateTranche: (orderId: string, itemId: string, trancheId: string, updates: Partial<Tranche>) => void;
  addTranche: (orderId: string, itemId: string) => void;
  removeTranche: (orderId: string, itemId: string, trancheId: string) => void;
  toggleTranches: (orderId: string, itemId: string) => void;
  addBudgetItem: (orderId: string, name: string, isIncome?: boolean) => void;
  removeBudgetItem: (orderId: string, itemId: string) => void;
}

const CRMContext = createContext<CRMState | null>(null);

/** Хук для доступа к глобальному состоянию CRM */
export function useCRM(): CRMState {
  const ctx = useContext(CRMContext);
  if (!ctx) throw new Error('useCRM must be used within CRMProvider');
  return ctx;
}

// ============================================================
// Provider компонент
// ============================================================

export function CRMProvider({ children }: { children: ReactNode }) {
  // --- Навигация ---
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>(['Дашборд']);

  const handleSetPage = useCallback((page: PageId) => {
    setCurrentPage(page);
  }, []);

  // --- Язык ---
  const [lang, setLang] = useState<Lang>('ru');
  const toggleLang = useCallback(() => {
    setLang((prev) => (prev === 'ru' ? 'ukr' : 'ru'));
  }, []);

  // Функция перевода, привязанная к текущему языку
  const tr = useCallback(
    (key: string) => t(lang, key),
    [lang]
  );

  // --- Сайдбар ---
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  // --- Заказы ---
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  /** Импорт нового пустого заказа из 1С */
  const addOrder = useCallback((id: string) => {
    const newOrder: Order = {
      id,
      name: `Замовлення ${id} (імпорт з 1С)`,
      status: 'Новый',
      orderAmount: 0,
      plannedCost: 0,
      deadline: new Date().toISOString().slice(0, 10),
      productionStart: new Date().toISOString().slice(0, 10),
      assemblyStart: new Date().toISOString().slice(0, 10),
      shippingStart: new Date().toISOString().slice(0, 10),
      budgetItems: [],
      specItems: [],
      createdAt: new Date().toISOString(),
    };
    setOrders((prev) => [...prev, newOrder]);
  }, []);

  const updateOrderStatus = useCallback((orderId: string, status: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
  }, []);

  /** Обновление дат заказа (производство, сборка, отгрузка, дедлайн) */
  const updateOrderDates = useCallback(
    (orderId: string, updates: Partial<Pick<Order, 'productionStart' | 'assemblyStart' | 'shippingStart' | 'deadline'>>) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, ...updates } : o))
      );
    },
    []
  );

  /** Переключение булевого флага этапа (Факт) */
  const toggleStageFlag = useCallback(
    (orderId: string, flag: 'isProductionStarted' | 'isAssemblyStarted' | 'isShipped') => {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, [flag]: !o[flag] } : o))
      );
    },
    []
  );

  /** Обновление плановой суммы статьи бюджета */
  const updateBudgetItemPlan = useCallback((orderId: string, itemId: string, newPlan: number) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          budgetItems: o.budgetItems.map((b) =>
            b.id === itemId ? { ...b, plan: newPlan } : b
          ),
        };
      })
    );
  }, []);

  /** Обновление транша */
  const updateTranche = useCallback(
    (orderId: string, itemId: string, trancheId: string, updates: Partial<Tranche>) => {
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o;
          return {
            ...o,
            budgetItems: o.budgetItems.map((b) => {
              if (b.id !== itemId) return b;
              return {
                ...b,
                tranches: b.tranches?.map((tt) =>
                  tt.id === trancheId ? { ...tt, ...updates } : tt
                ),
              };
            }),
          };
        })
      );
    },
    []
  );

  /** Добавление нового транша к статье */
  const addTranche = useCallback((orderId: string, itemId: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          budgetItems: o.budgetItems.map((b) => {
            if (b.id !== itemId) return b;
            const newTranche: Tranche = {
              id: generateId(),
              amount: 0,
              week: (b.tranches?.length ?? 0) + 1,
            };
            return {
              ...b,
              tranches: [...(b.tranches ?? []), newTranche],
            };
          }),
        };
      })
    );
  }, []);

  /** Удаление транша */
  const removeTranche = useCallback((orderId: string, itemId: string, trancheId: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          budgetItems: o.budgetItems.map((b) => {
            if (b.id !== itemId) return b;
            return {
              ...b,
              tranches: b.tranches?.filter((tt) => tt.id !== trancheId),
            };
          }),
        };
      })
    );
  }, []);

  /** Показать/скрыть транши у статьи */
  const toggleTranches = useCallback((orderId: string, itemId: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          budgetItems: o.budgetItems.map((b) => {
            if (b.id !== itemId) return b;
            return { ...b, hasTranches: !b.hasTranches };
          }),
        };
      })
    );
  }, []);

  /** Добавление новой статьи расходов/доходов */
  const addBudgetItem = useCallback((orderId: string, name: string, isIncome?: boolean) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const newItem = {
          id: generateId(),
          name,
          plan: 0,
          fact: 0,
          isIncome: !!isIncome,
        };
        return { ...o, budgetItems: [...o.budgetItems, newItem] };
      })
    );
  }, []);

  /** Удаление статьи бюджета */
  const removeBudgetItem = useCallback((orderId: string, itemId: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        return { ...o, budgetItems: o.budgetItems.filter((b) => b.id !== itemId) };
      })
    );
  }, []);

  const value: CRMState = {
    currentPage,
    setCurrentPage: handleSetPage,
    breadcrumbs,
    setBreadcrumbs,
    lang,
    toggleLang,
    tr,
    sidebarCollapsed,
    toggleSidebar,
    orders,
    selectedOrderId,
    setSelectedOrderId,
    addOrder,
    updateOrderStatus,
    updateOrderDates,
    toggleStageFlag,
    updateBudgetItemPlan,
    updateTranche,
    addTranche,
    removeTranche,
    toggleTranches,
    addBudgetItem,
    removeBudgetItem,
  };

  return <CRMContext.Provider value={value}>{children}</CRMContext.Provider>;
}
