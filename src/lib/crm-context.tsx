'use client';

import React, { type ReactNode } from 'react';
import type {
  PageId,
  Order,
  OrderStatus,
  Tranche,
  UserInfo,
  UserPermissions,
} from './crm-types';
import type { Lang } from './translations';
import { NavProvider, useNav, type NavState } from './nav-context';
import { AuthProvider, useAuth, type AuthState } from './auth-context';
import { OrdersProvider, useOrders, type OrdersState } from './orders-context';

// ============================================================
// Комбинированный интерфейс CRMState — для обратной совместимости
// Все компоненты продолжают использовать useCRM() как раньше.
// Под капотом — 3 раздельных контекста для оптимизации рендеринга.
// ============================================================

interface CRMState extends NavState, AuthState, OrdersState {}

/**
 * Обратно-совместимый хук useCRM().
 * Собирает данные из всех 3 контекстов в один объект.
 * 
 * ⚡ Для максимальной производительности компоненты могут использовать
 * конкретные хуки: useNav(), useAuth(), useOrders()
 */
export function useCRM(): CRMState {
  const nav = useNav();
  const auth = useAuth();
  const orders = useOrders();
  return { ...nav, ...auth, ...orders };
}

// Re-export специализированных хуков для нового кода
export { useNav, useAuth, useOrders };

interface CRMProviderProps {
  children: ReactNode;
  user?: UserInfo | null;
}

/**
 * CRMProvider — оборачивает в 3 провайдера.
 * Nav снаружи (самый легковесный) → Auth → Orders (самый тяжёлый) внутри.
 */
export function CRMProvider({ children, user = null }: CRMProviderProps) {
  return (
    <NavProvider>
      <AuthProvider user={user}>
        <OrdersProvider>
          {children}
        </OrdersProvider>
      </AuthProvider>
    </NavProvider>
  );
}
