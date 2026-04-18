'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type {
  PageId,
  Order,
  OrderStatus,
  Tranche,
  UserInfo,
  UserPermissions,
} from './crm-types';
import type { Lang } from './translations';
import { generateId, generateWeekOptions, dateToWeekValue } from './crm-utils';
import { t } from './translations';
import { toast } from 'sonner';

// Дефолтные разрешения для админа
const ADMIN_PERMISSIONS: UserPermissions = {
  canViewProfit: true,
  canViewBudget: true,
  canViewPaymentCalendar: true,
  canEditOrders: true,
  canViewDashboardFinance: true,
  canImportFrom1C: true,
};

interface CRMState {
  currentPage: PageId;
  setCurrentPage: (page: PageId) => void;
  breadcrumbs: string[];
  setBreadcrumbs: (items: string[]) => void;
  lang: Lang;
  toggleLang: () => void;
  tr: (key: string) => string;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Аутентификация
  currentUser: UserInfo | null;
  isAdmin: boolean;
  hasPermission: (key: keyof UserPermissions) => boolean;

  orders: Order[];
  isLoading: boolean;
  selectedOrderId: string | null;
  setSelectedOrderId: (id: string | null) => void;
  
  fetchOrders: () => Promise<void>;
  addOrder: (data: any) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  updateOrderAmount: (orderId: string, amount: number) => Promise<void>;
  updateOrderPaymentDate: (orderId: string, date: string | null) => Promise<void>;
  updateBudgetItemDate: (orderId: string, itemId: string, newDate: string, currentPlan: number) => Promise<void>;
  updateOrderDates: (orderId: string, updates: Partial<Pick<Order, 'productionStart' | 'assemblyStart' | 'shippingStart' | 'deadline'>>) => Promise<void>;
  toggleStageFlag: (orderId: string, flag: 'isProductionStarted' | 'isAssemblyStarted' | 'isShipped') => Promise<void>;
  updateBudgetItemPlan: (orderId: string, itemId: string, newPlan: number) => Promise<void>;
  updateTranche: (orderId: string, itemId: string, trancheId: string, updates: Partial<Tranche>) => Promise<void>;
  addTranche: (orderId: string, itemId: string) => Promise<void>;
  removeTranche: (orderId: string, itemId: string, trancheId: string) => Promise<void>;
  toggleTranches: (orderId: string, itemId: string) => Promise<void>;
  addBudgetItem: (orderId: string, name: string, isIncome?: boolean) => Promise<void>;
  removeBudgetItem: (orderId: string, itemId: string) => Promise<void>;
  updatePaymentArticle: (orderId: string, paymentId: string, budgetItemId: string | null) => Promise<void>;
  removeOrder: (orderId: string) => Promise<void>;
}

const CRMContext = createContext<CRMState | null>(null);

export function useCRM(): CRMState {
  const ctx = useContext(CRMContext);
  if (!ctx) throw new Error('useCRM must be used within CRMProvider');
  return ctx;
}

interface CRMProviderProps {
  children: ReactNode;
  user?: UserInfo | null;
}

export function CRMProvider({ children, user = null }: CRMProviderProps) {
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>(['Дашборд']);
  const handleSetPage = useCallback((page: PageId) => setCurrentPage(page), []);

  const [lang, setLang] = useState<Lang>('ru');
  const toggleLang = useCallback(() => setLang((prev) => (prev === 'ru' ? 'ukr' : 'ru')), []);
  const tr = useCallback((key: string) => t(lang, key), [lang]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const toggleSidebar = useCallback(() => setSidebarCollapsed((prev) => !prev), []);

  // === Аутентификация ===
  const currentUser = user || null;
  const isAdmin = currentUser?.role === 'ADMIN';
  
  const hasPermission = useCallback((key: keyof UserPermissions): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'ADMIN') return true;
    const perms = currentUser.permissions || {};
    return !!(perms as any)[key];
  }, [currentUser]);

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      } else {
        toast.error('Ошибка загрузки заказов', { description: `Сервер вернул ${res.status}` });
      }
    } catch (e) {
      console.error('Failed to fetch orders:', e);
      toast.error('Не удалось загрузить заказы', { description: 'Проверьте подключение к серверу' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const addOrder = useCallback(async (data: any) => {
    const orderTotal = data.orders?.reduce((sum: number, o: any) => sum + (o.total || 0), 0) || 0;
    const salesTotal = data.sales?.reduce((sum: number, s: any) => sum + (s.amount || 0), 0) || 0;
    
    // Новая логика: Если 1С передает жесткую сумму взаиморасчетов (totalContractAmount), используем её.
    // Иначе считаем как раньше (по сумме реализаций/заказов).
    const orderAmount = data.totalContractAmount !== undefined 
      ? data.totalContractAmount 
      : Math.max(orderTotal, salesTotal);
      
    // Новая логика: Если 1С передает жесткую чистую себестоимость материалов (totalMaterialCost), используем её.
    // Иначе высчитываем из суммы себестоимостей отдельных строк.
    const actualCost = data.totalMaterialCost !== undefined
      ? data.totalMaterialCost
      : data.sales?.reduce((sum: number, s: any) => sum + (s.cost !== undefined ? s.cost : 0), 0) || 0;
      
    const plannedCost = actualCost;

    const specItems = (data.sales || []).map((s: any) => ({
      material: s.item || 'Без названия',
      unit: 'шт',
      quantity: s.quantity || 1,
      pricePerUnit: (s.amount || 0) / (s.quantity || 1),
      total: s.amount || 0,
      cost: s.cost !== undefined ? s.cost : null,
    }));

    const payments = (data.settlements || []).map((s: any) => ({
      date: s.date || new Date().toISOString(),
      document: s.document || 'Оплата из 1С',
      article: s.article || '',   // Статья ДДС из 1С — для авто-привязки к бюджету
      income: s.income || 0,
      expense: s.expense || 0,
    }));

    const clientPaymentsFact = payments.reduce((sum: number, p: any) => sum + p.income, 0);

    const defaultWeek = generateWeekOptions('ru')[0].value;
    const budgetItems = [
      // === Системные статьи (скрыты из BudgetTab, используются для маржи) ===
      {
        name: 'Оплата от клиента',
        plan: orderAmount,
        fact: clientPaymentsFact,
        isIncome: true,
        hasTranches: true,
        tranches: [{ amount: orderAmount, month: defaultWeek }],
      },
      {
        name: 'Материалы (План)',
        plan: plannedCost,
        fact: actualCost,
        isIncome: false,
        hasTranches: true,
        tranches: [{ amount: plannedCost, month: defaultWeek }],
      },
      // === Стандартные статьи расходов ===
      { name: 'Проектирование', plan: 0, fact: 0, isIncome: false, hasTranches: false },
      { name: 'Закупные', plan: 0, fact: 0, isIncome: false, hasTranches: false },
      { name: 'Сборка', plan: 0, fact: 0, isIncome: false, hasTranches: false },
      { name: 'Погрузка', plan: 0, fact: 0, isIncome: false, hasTranches: false },
      { name: 'Доставка', plan: 0, fact: 0, isIncome: false, hasTranches: false },
      { name: 'Разгрузка', plan: 0, fact: 0, isIncome: false, hasTranches: false },
      { name: 'Монтаж', plan: 0, fact: 0, isIncome: false, hasTranches: false },
      { name: 'Бонус конструктора', plan: 0, fact: 0, isIncome: false, hasTranches: false },
      { name: 'Налоги', plan: 0, fact: 0, isIncome: false, hasTranches: false },
      { name: 'Бонус менеджера', plan: 0, fact: 0, isIncome: false, hasTranches: false },
      { name: 'Бонус тендера', plan: 0, fact: 0, isIncome: false, hasTranches: false },
      // === Стандартная статья доходов ===
      { name: 'Прибыль', plan: 0, fact: 0, isIncome: true, hasTranches: false },
    ];

    const newOrder = {
      id: data.contractor?.id || generateId(),
      name: data.contractor?.name || 'Новый Тендер',
      status: 'Проектирование',
      orderAmount,
      plannedCost,
      deadline: new Date().toISOString().slice(0, 10),
      productionStart: new Date().toISOString().slice(0, 10),
      assemblyStart: new Date().toISOString().slice(0, 10),
      shippingStart: new Date().toISOString().slice(0, 10),
      budgetItems,
      specItems,
      payments,
    };

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOrder),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error('Ошибка создания заказа', { description: err.error || `Код: ${res.status}` });
      throw new Error(err.error || 'Failed to create order');
    }
    
    toast.success('Заказ успешно импортирован');
    // Refresh fully to get IDs from DB
    await fetchOrders();
  }, [fetchOrders]);

  const removeOrder = useCallback(async (orderId: string) => {
    // UI optimistic update
    const previousOrders = orders;
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    if (selectedOrderId === orderId) setSelectedOrderId(null);

    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Заказ удалён');
      await fetchOrders();
    } catch {
      toast.error('Не удалось удалить заказ');
      setOrders(previousOrders);
    }
  }, [orders, selectedOrderId, fetchOrders]);

  const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error('Ошибка обновления статуса');
      await fetchOrders();
    }
  }, [fetchOrders]);

  const updateOrderAmount = useCallback(async (orderId: string, amount: number) => {
    // Обновляем общую сумму заказа и ставим флаг ручного ввода
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, orderAmount: amount, isAmountManual: true } : o)));
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderAmount: amount, isAmountManual: true })
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error('Ошибка обновления суммы');
      await fetchOrders();
      return;
    }

    // Также обновляем плановую сумму статьи "Оплата от клиента", если она существует
    // Используем прямой вызов API, чтобы избежать круговой зависимости с updateBudgetItemPlan
    setOrders((prev) => {
      const order = prev.find(o => o.id === orderId);
      if (order) {
        const incomeItem = order.budgetItems?.find(b => b.isIncome && b.name.includes("Оплата"));
        if (incomeItem) {
          // Обновляем локально
          fetch(`/api/orders/${orderId}/budget`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: incomeItem.id, plan: amount })
          }).catch(() => {});
          
          return prev.map(o => o.id !== orderId ? o : {
            ...o,
            budgetItems: o.budgetItems.map(b => b.id === incomeItem.id ? { ...b, plan: amount } : b)
          });
        }
      }
      return prev;
    });
  }, [fetchOrders]);

  const updateOrderPaymentDate = useCallback(async (orderId: string, date: string | null) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, expectedPaymentDate: date || undefined } : o)));
    
    // Также обновляем транш статьи "Оплата от клиента"
    setOrders((prev) => {
      const order = prev.find(o => o.id === orderId);
      if (order && date) {
        const incomeItem = order.budgetItems?.find(b => b.isIncome && b.name.includes("Оплата"));
        if (incomeItem && incomeItem.tranches && incomeItem.tranches.length > 0) {
          // Обновляем первый транш с plannedDate
          const tranche = incomeItem.tranches[0];
          const weekVal = dateToWeekValue(date);
          // API call для транша
          fetch(`/api/orders/${orderId}/budget/${incomeItem.id}/tranches`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: tranche.id, month: weekVal, plannedDate: date })
          }).catch(() => {});
          
          return prev.map(o => o.id !== orderId ? o : {
            ...o,
            budgetItems: o.budgetItems.map(b => b.id === incomeItem.id ? {
              ...b,
              tranches: b.tranches?.map((t, i) => i === 0 ? { ...t, month: weekVal, plannedDate: date } : t)
            } : b)
          });
        }
      }
      return prev;
    });
    
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedPaymentDate: date })
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error('Ошибка обновления даты оплаты');
      await fetchOrders();
    }
  }, [fetchOrders]);

  const updateOrderDates = useCallback(
    async (orderId: string, updates: Partial<Pick<Order, 'productionStart' | 'assemblyStart' | 'shippingStart' | 'deadline'>>) => {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...updates } : o)));
      try {
        const res = await fetch(`/api/orders/${orderId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });
        if (!res.ok) throw new Error();
      } catch {
        toast.error('Ошибка обновления дат');
        await fetchOrders();
      }
    },
    [fetchOrders]
  );

  const toggleStageFlag = useCallback(
    async (orderId: string, flag: 'isProductionStarted' | 'isAssemblyStarted' | 'isShipped') => {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;
      const newValue = !order[flag];
      
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, [flag]: newValue } : o)));
      
      try {
        const res = await fetch(`/api/orders/${orderId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [flag]: newValue })
        });
        if (!res.ok) throw new Error();
      } catch {
        toast.error('Ошибка обновления этапа');
        await fetchOrders();
      }
    },
    [orders, fetchOrders]
  );

  const updateTranche = useCallback(async (orderId: string, itemId: string, trancheId: string, updates: Partial<Tranche>) => {
    setOrders((prev) => prev.map((o) => {
      if (o.id !== orderId) return o;
      return {
        ...o,
        budgetItems: o.budgetItems.map((b) => {
          if (b.id !== itemId) return b;
          return { ...b, tranches: b.tranches?.map((tt) => tt.id === trancheId ? { ...tt, ...updates } : tt) };
        }),
      };
    }));
    try {
      const res = await fetch(`/api/orders/${orderId}/budget/${itemId}/tranches`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: trancheId, ...updates })
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error('Ошибка обновления транша');
      await fetchOrders();
    }
  }, [fetchOrders]);

  const updateBudgetItemDate = useCallback(async (orderId: string, itemId: string, newDate: string, currentPlan: number) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const item = order.budgetItems?.find(b => b.id === itemId);
    if (!item) return;

    if (item.tranches && item.tranches.length > 0) {
      // update first tranche
      const tranche = item.tranches[0];
      const weekVal = dateToWeekValue(newDate);
      updateTranche(orderId, itemId, tranche.id, { plannedDate: newDate, month: weekVal || tranche.month, amount: currentPlan });
    } else {
      // create the first tranche
      const tempId = generateId();
      const weekVal = dateToWeekValue(newDate) || '';
      const newTranche = { id: tempId, amount: currentPlan, month: weekVal, plannedDate: newDate };
      
      setOrders((prev) => prev.map((o) => {
        if (o.id !== orderId) return o;
        return { ...o, budgetItems: o.budgetItems.map((b) => b.id === itemId ? { ...b, tranches: [newTranche] } : b) };
      }));

      try {
        await fetch(`/api/orders/${orderId}/budget/${itemId}/tranches`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: currentPlan, month: weekVal, plannedDate: newDate })
        });
      } catch {
        toast.error('Ошибка сохранения даты');
      }
      fetchOrders();
    }
  }, [orders, updateTranche, fetchOrders]);

  const updateBudgetItemPlan = useCallback(async (orderId: string, itemId: string, newPlan: number) => {
    setOrders((prev) => prev.map((o) => {
      if (o.id !== orderId) return o;
      return { 
        ...o, 
        budgetItems: o.budgetItems.map((b) => {
          if (b.id !== itemId) return b;
          let updatedTranches = b.tranches;
          if (!b.hasTranches && updatedTranches && updatedTranches.length === 1) {
            updatedTranches = [{ ...updatedTranches[0], amount: newPlan }];
          }
          return { ...b, plan: newPlan, tranches: updatedTranches };
        }) 
      };
    }));
    try {
      const res = await fetch(`/api/orders/${orderId}/budget`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, plan: newPlan })
      });
      if (!res.ok) throw new Error();
      
      const order = orders.find(o => o.id === orderId);
      const item = order?.budgetItems?.find(b => b.id === itemId);
      if (item && !item.hasTranches && item.tranches && item.tranches.length === 1) {
         fetch(`/api/orders/${orderId}/budget/${itemId}/tranches`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: item.tranches[0].id, amount: newPlan })
         }).catch(() => {});
      }
    } catch {
      toast.error('Ошибка обновления бюджета');
      await fetchOrders();
    }
  }, [orders, fetchOrders]);

  const addTranche = useCallback(async (orderId: string, itemId: string) => {
    const tempId = generateId();
    const today = new Date().toISOString().slice(0, 10);
    const weekVal = dateToWeekValue(today);
    const newTranche = { id: tempId, amount: 0, month: weekVal, plannedDate: today };
    
    setOrders((prev) => prev.map((o) => {
      if (o.id !== orderId) return o;
      return { ...o, budgetItems: o.budgetItems.map((b) => b.id === itemId ? { ...b, tranches: [...(b.tranches || []), newTranche] } : b) };
    }));

    try {
      const res = await fetch(`/api/orders/${orderId}/budget/${itemId}/tranches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 0, month: weekVal, plannedDate: today })
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error('Ошибка добавления транша');
    }
    // refresh to get real IDs
    await fetchOrders();
  }, [fetchOrders]);

  const removeTranche = useCallback(async (orderId: string, itemId: string, trancheId: string) => {
    setOrders((prev) => prev.map((o) => {
      if (o.id !== orderId) return o;
      return {
        ...o,
        budgetItems: o.budgetItems.map((b) => b.id === itemId ? { ...b, tranches: b.tranches?.filter((tt) => tt.id !== trancheId) } : b),
      };
    }));
    try {
      const res = await fetch(`/api/orders/${orderId}/budget/${itemId}/tranches?id=${trancheId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
    } catch {
      toast.error('Ошибка удаления транша');
      await fetchOrders();
    }
  }, [fetchOrders]);

  const toggleTranches = useCallback(async (orderId: string, itemId: string) => {
    const order = orders.find(o => o.id === orderId);
    if(!order) return;
    const item = order.budgetItems?.find(b => b.id === itemId);
    if(!item) return;

    const newValue = !item.hasTranches;

    setOrders((prev) => prev.map((o) => o.id === orderId ? {
      ...o, budgetItems: o.budgetItems.map(b => b.id === itemId ? { ...b, hasTranches: newValue } : b)
    } : o));

    try {
      const res = await fetch(`/api/orders/${orderId}/budget`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, hasTranches: newValue })
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error('Ошибка переключения траншей');
      await fetchOrders();
    }
  }, [orders, fetchOrders]);

  const addBudgetItem = useCallback(async (orderId: string, name: string, isIncome?: boolean) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/budget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, plan: 0, fact: 0, isIncome: !!isIncome, hasTranches: false })
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error('Ошибка добавления статьи бюджета');
    }
    await fetchOrders();
  }, [fetchOrders]);

  const removeBudgetItem = useCallback(async (orderId: string, itemId: string) => {
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, budgetItems: o.budgetItems.filter(b => b.id !== itemId) } : o));
    try {
      const res = await fetch(`/api/orders/${orderId}/budget?id=${itemId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
    } catch {
      toast.error('Ошибка удаления статьи');
      await fetchOrders();
    }
  }, [fetchOrders]);

  const updatePaymentArticle = useCallback(async (orderId: string, paymentId: string, budgetItemId: string | null) => {
    setOrders((prev) => prev.map((o) => {
      if (o.id !== orderId) return o;
      return {
        ...o,
        payments: o.payments?.map(p => p.id === paymentId ? { ...p, budgetItemId: budgetItemId || undefined } : p)
      };
    }));
    try {
      const res = await fetch(`/api/orders/${orderId}/payments/${paymentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budgetItemId })
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error('Ошибка привязки платежа');
      await fetchOrders();
    }
  }, [fetchOrders]);

  const value: CRMState = {
    currentPage, setCurrentPage: handleSetPage,
    breadcrumbs, setBreadcrumbs,
    lang, toggleLang, tr,
    sidebarCollapsed, toggleSidebar,
    currentUser, isAdmin, hasPermission,
    orders, isLoading, selectedOrderId, setSelectedOrderId,
    fetchOrders, addOrder, updateOrderStatus, updateOrderAmount, updateOrderPaymentDate, updateBudgetItemDate, updateOrderDates, toggleStageFlag,
    updateBudgetItemPlan, updateTranche, addTranche, removeTranche, toggleTranches,
    addBudgetItem, removeBudgetItem, removeOrder, updatePaymentArticle,
  };

  return <CRMContext.Provider value={value}>{children}</CRMContext.Provider>;
}
