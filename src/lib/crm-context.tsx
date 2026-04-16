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
import { generateId, generateWeekOptions } from './crm-utils';
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
    const orderAmount = Math.max(orderTotal, salesTotal);
    const actualCost = data.sales?.reduce((sum: number, s: any) => sum + (s.cost !== undefined ? s.cost : 0), 0) || 0;
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
    ];

    const newOrder = {
      id: data.contractor?.id || generateId(),
      name: data.contractor?.name || 'Новый Тендер',
      status: 'Новый',
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

  const updateBudgetItemPlan = useCallback(async (orderId: string, itemId: string, newPlan: number) => {
    setOrders((prev) => prev.map((o) => {
      if (o.id !== orderId) return o;
      return { ...o, budgetItems: o.budgetItems.map((b) => b.id === itemId ? { ...b, plan: newPlan } : b) };
    }));
    try {
      const res = await fetch(`/api/orders/${orderId}/budget`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, plan: newPlan })
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error('Ошибка обновления бюджета');
      await fetchOrders();
    }
  }, [fetchOrders]);

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

  const addTranche = useCallback(async (orderId: string, itemId: string) => {
    const tempId = generateId();
    const defaultWeek = generateWeekOptions('ru')[0].value;
    const newTranche = { id: tempId, amount: 0, month: defaultWeek };
    
    setOrders((prev) => prev.map((o) => {
      if (o.id !== orderId) return o;
      return { ...o, budgetItems: o.budgetItems.map((b) => b.id === itemId ? { ...b, tranches: [...(b.tranches || []), newTranche] } : b) };
    }));

    try {
      const res = await fetch(`/api/orders/${orderId}/budget/${itemId}/tranches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 0, month: newTranche.month })
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
    fetchOrders, addOrder, updateOrderStatus, updateOrderAmount, updateOrderDates, toggleStageFlag,
    updateBudgetItemPlan, updateTranche, addTranche, removeTranche, toggleTranches,
    addBudgetItem, removeBudgetItem, removeOrder, updatePaymentArticle,
  };

  return <CRMContext.Provider value={value}>{children}</CRMContext.Provider>;
}
