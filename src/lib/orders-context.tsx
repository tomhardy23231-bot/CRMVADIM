'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type {
  Order,
  OrderStatus,
  Tranche,
} from './crm-types';
import { generateId, generateWeekOptions, dateToWeekValue } from './crm-utils';
import { toast } from 'sonner';

// Интервал фонового polling (мс) — 30 секунд
const POLL_INTERVAL = 30_000;

export interface OrdersState {
  orders: Order[];
  isLoading: boolean;
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

export const OrdersContext = createContext<OrdersState | null>(null);

export function useOrders(): OrdersState {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error('useOrders must be used within OrdersProvider');
  return ctx;
}

// Хелпер: тихая загрузка одного заказа с сервера (без скелетона)
async function fetchSingleOrder(orderId: string): Promise<Order | null> {
  try {
    const res = await fetch(`/api/orders/${orderId}`);
    if (res.ok) return await res.json();
  } catch {}
  return null;
}

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ============================================================
  // fetchOrders — полная загрузка (только при старте)
  // ============================================================
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

  // Начальная загрузка
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ============================================================
  // УМНЫЙ POLLING: Сравниваем данные перед обновлением стейта
  // Если данные идентичны — setOrders не вызывается → нет ререндера
  // ============================================================
  const ordersRef = useRef(orders);
  ordersRef.current = orders;

  useEffect(() => {
    const silentPoll = async () => {
      try {
        const res = await fetch('/api/orders');
        if (res.ok) {
          const freshOrders = await res.json();
          // Умное сравнение: обновляем стейт ТОЛЬКО если данные реально изменились
          const freshJSON = JSON.stringify(freshOrders);
          const currentJSON = JSON.stringify(ordersRef.current);
          if (freshJSON !== currentJSON) {
            setOrders(freshOrders);
          }
        }
      } catch {
        // Тихо игнорируем ошибки polling — не спамим пользователя
      }
    };

    const intervalId = setInterval(silentPoll, POLL_INTERVAL);
    return () => clearInterval(intervalId);
  }, []);

  // ============================================================
  // Все мутации — optimistic updates, без fetchOrders()
  // ============================================================

  const addOrder = useCallback(async (data: any) => {
    const orderTotal = data.orders?.reduce((sum: number, o: any) => sum + (o.total || 0), 0) || 0;
    const salesTotal = data.sales?.reduce((sum: number, s: any) => sum + (s.amount || 0), 0) || 0;
    
    const orderAmount = data.totalContractAmount !== undefined 
      ? data.totalContractAmount 
      : Math.max(orderTotal, salesTotal);
      
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
      article: s.article || '',
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
    
    const createdOrder = await res.json();
    toast.success('Заказ успешно импортирован');
    setOrders((prev) => [createdOrder, ...prev]);
  }, []);

  const removeOrder = useCallback(async (orderId: string) => {
    let previousOrders: Order[] = [];
    setOrders((prev) => {
      previousOrders = prev;
      return prev.filter((o) => o.id !== orderId);
    });

    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Заказ удалён');
    } catch {
      toast.error('Не удалось удалить заказ');
      setOrders(previousOrders);
    }
  }, []);

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
      const fresh = await fetchSingleOrder(orderId);
      if (fresh) setOrders((prev) => prev.map((o) => o.id === orderId ? fresh : o));
    }
  }, []);

  const updateOrderAmount = useCallback(async (orderId: string, amount: number) => {
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
      const fresh = await fetchSingleOrder(orderId);
      if (fresh) setOrders((prev) => prev.map((o) => o.id === orderId ? fresh : o));
      return;
    }

    setOrders((prev) => {
      const order = prev.find(o => o.id === orderId);
      if (order) {
        const incomeItem = order.budgetItems?.find(b => b.isIncome && b.name.includes("Оплата"));
        if (incomeItem) {
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
  }, []);

  const updateOrderPaymentDate = useCallback(async (orderId: string, date: string | null) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, expectedPaymentDate: date || undefined } : o)));
    
    setOrders((prev) => {
      const order = prev.find(o => o.id === orderId);
      if (order && date) {
        const incomeItem = order.budgetItems?.find(b => b.isIncome && b.name.includes("Оплата"));
        if (incomeItem && incomeItem.tranches && incomeItem.tranches.length > 0) {
          const tranche = incomeItem.tranches[0];
          const weekVal = dateToWeekValue(date);
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
      const fresh = await fetchSingleOrder(orderId);
      if (fresh) setOrders((prev) => prev.map((o) => o.id === orderId ? fresh : o));
    }
  }, []);

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
        const fresh = await fetchSingleOrder(orderId);
        if (fresh) setOrders((prev) => prev.map((o) => o.id === orderId ? fresh : o));
      }
    },
    []
  );

  const toggleStageFlag = useCallback(
    async (orderId: string, flag: 'isProductionStarted' | 'isAssemblyStarted' | 'isShipped') => {
      let toggledValue = false;
      setOrders((prev) => prev.map((o) => {
        if (o.id !== orderId) return o;
        toggledValue = !o[flag];
        return { ...o, [flag]: toggledValue };
      }));
      
      try {
        const res = await fetch(`/api/orders/${orderId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [flag]: toggledValue })
        });
        if (!res.ok) throw new Error();
      } catch {
        toast.error('Ошибка обновления этапа');
        const fresh = await fetchSingleOrder(orderId);
        if (fresh) setOrders((prev) => prev.map((o) => o.id === orderId ? fresh : o));
      }
    },
    []
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
      const fresh = await fetchSingleOrder(orderId);
      if (fresh) setOrders((prev) => prev.map((o) => o.id === orderId ? fresh : o));
    }
  }, []);

  const updateBudgetItemDate = useCallback(async (orderId: string, itemId: string, newDate: string, currentPlan: number) => {
    // Ищем через текущий стейт внутри setOrders updater
    let found = false;
    let existingTranche: any = null;

    setOrders((prev) => {
      const order = prev.find(o => o.id === orderId);
      const item = order?.budgetItems?.find(b => b.id === itemId);
      if (item?.tranches && item.tranches.length > 0) {
        found = true;
        existingTranche = item.tranches[0];
      }
      return prev; // Не меняем стейт — обновим через updateTranche или POST
    });

    if (found && existingTranche) {
      const weekVal = dateToWeekValue(newDate);
      // Inline optimistic update + API call для первого транша
      setOrders((prev) => prev.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          budgetItems: o.budgetItems.map((b) => {
            if (b.id !== itemId) return b;
            return {
              ...b,
              tranches: b.tranches?.map((tt) =>
                tt.id === existingTranche.id
                  ? { ...tt, plannedDate: newDate, month: weekVal || tt.month, amount: currentPlan }
                  : tt
              ),
            };
          }),
        };
      }));
      try {
        const res = await fetch(`/api/orders/${orderId}/budget/${itemId}/tranches`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: existingTranche.id, plannedDate: newDate, month: weekVal || existingTranche.month, amount: currentPlan })
        });
        if (!res.ok) throw new Error();
      } catch {
        toast.error('Ошибка обновления транша');
        const fresh = await fetchSingleOrder(orderId);
        if (fresh) setOrders((prev) => prev.map((o) => o.id === orderId ? fresh : o));
      }
    } else {
      // create the first tranche
      const weekVal = dateToWeekValue(newDate) || '';
      try {
        const res = await fetch(`/api/orders/${orderId}/budget/${itemId}/tranches`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: currentPlan, month: weekVal, plannedDate: newDate })
        });
        if (res.ok) {
          const createdTranche = await res.json();
          setOrders((prev) => prev.map((o) => {
            if (o.id !== orderId) return o;
            return { ...o, budgetItems: o.budgetItems.map((b) => b.id === itemId ? { ...b, tranches: [createdTranche] } : b) };
          }));
        } else {
          throw new Error();
        }
      } catch {
        toast.error('Ошибка сохранения даты');
      }
    }
  }, []);

  const updateBudgetItemPlan = useCallback(async (orderId: string, itemId: string, newPlan: number) => {
    let singleTranche: any = null;
    setOrders((prev) => prev.map((o) => {
      if (o.id !== orderId) return o;
      return { 
        ...o, 
        budgetItems: o.budgetItems.map((b) => {
          if (b.id !== itemId) return b;
          let updatedTranches = b.tranches;
          if (!b.hasTranches && updatedTranches && updatedTranches.length === 1) {
            singleTranche = updatedTranches[0];
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
      
      if (singleTranche) {
         fetch(`/api/orders/${orderId}/budget/${itemId}/tranches`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: singleTranche.id, amount: newPlan })
         }).catch(() => {});
      }
    } catch {
      toast.error('Ошибка обновления бюджета');
      const fresh = await fetchSingleOrder(orderId);
      if (fresh) setOrders((prev) => prev.map((o) => o.id === orderId ? fresh : o));
    }
  }, []);

  const addTranche = useCallback(async (orderId: string, itemId: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const weekVal = dateToWeekValue(today);

    try {
      const res = await fetch(`/api/orders/${orderId}/budget/${itemId}/tranches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 0, month: weekVal, plannedDate: today })
      });
      if (!res.ok) throw new Error();
      
      const createdTranche = await res.json();
      setOrders((prev) => prev.map((o) => {
        if (o.id !== orderId) return o;
        return { ...o, budgetItems: o.budgetItems.map((b) => b.id === itemId ? { ...b, tranches: [...(b.tranches || []), createdTranche] } : b) };
      }));
    } catch {
      toast.error('Ошибка добавления транша');
    }
  }, []);

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
      const fresh = await fetchSingleOrder(orderId);
      if (fresh) setOrders((prev) => prev.map((o) => o.id === orderId ? fresh : o));
    }
  }, []);

  const toggleTranches = useCallback(async (orderId: string, itemId: string) => {
    let newValue = false;
    setOrders((prev) => prev.map((o) => {
      if (o.id !== orderId) return o;
      const item = o.budgetItems.find(b => b.id === itemId);
      newValue = item ? !item.hasTranches : false;
      return { ...o, budgetItems: o.budgetItems.map(b => b.id === itemId ? { ...b, hasTranches: newValue } : b) };
    }));

    try {
      const res = await fetch(`/api/orders/${orderId}/budget`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, hasTranches: newValue })
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error('Ошибка переключения траншей');
      const fresh = await fetchSingleOrder(orderId);
      if (fresh) setOrders((prev) => prev.map((o) => o.id === orderId ? fresh : o));
    }
  }, []);

  const addBudgetItem = useCallback(async (orderId: string, name: string, isIncome?: boolean) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/budget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, plan: 0, fact: 0, isIncome: !!isIncome, hasTranches: false })
      });
      if (!res.ok) throw new Error();
      
      const createdItem = await res.json();
      setOrders((prev) => prev.map((o) => {
        if (o.id !== orderId) return o;
        return { ...o, budgetItems: [...o.budgetItems, createdItem] };
      }));
    } catch {
      toast.error('Ошибка добавления статьи бюджета');
    }
  }, []);

  const removeBudgetItem = useCallback(async (orderId: string, itemId: string) => {
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, budgetItems: o.budgetItems.filter(b => b.id !== itemId) } : o));
    try {
      const res = await fetch(`/api/orders/${orderId}/budget?id=${itemId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
    } catch {
      toast.error('Ошибка удаления статьи');
      const fresh = await fetchSingleOrder(orderId);
      if (fresh) setOrders((prev) => prev.map((o) => o.id === orderId ? fresh : o));
    }
  }, []);

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
      const fresh = await fetchSingleOrder(orderId);
      if (fresh) setOrders((prev) => prev.map((o) => o.id === orderId ? fresh : o));
    }
  }, []);

  const value: OrdersState = {
    orders, isLoading,
    fetchOrders, addOrder, updateOrderStatus, updateOrderAmount, updateOrderPaymentDate,
    updateBudgetItemDate, updateOrderDates, toggleStageFlag,
    updateBudgetItemPlan, updateTranche, addTranche, removeTranche, toggleTranches,
    addBudgetItem, removeBudgetItem, removeOrder, updatePaymentArticle,
  };

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}
