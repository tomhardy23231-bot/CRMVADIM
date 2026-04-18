'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { PageId } from './crm-types';
import type { Lang } from './translations';
import { t } from './translations';

// Ключи для sessionStorage — сохраняем навигацию при обновлении
const NAV_STORAGE_KEY = 'crm_current_page';
const ORDER_STORAGE_KEY = 'crm_selected_order';

export interface NavState {
  currentPage: PageId;
  setCurrentPage: (page: PageId) => void;
  lang: Lang;
  toggleLang: () => void;
  tr: (key: string) => string;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  selectedOrderId: string | null;
  setSelectedOrderId: (id: string | null) => void;
}

export const NavContext = createContext<NavState | null>(null);

export function useNav(): NavState {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNav must be used within NavProvider');
  return ctx;
}

export function NavProvider({ children }: { children: ReactNode }) {
  const [currentPage, setCurrentPageRaw] = useState<PageId>('dashboard');
  const [selectedOrderId, setSelectedOrderIdRaw] = useState<string | null>(null);

  // Восстанавливаем навигацию из sessionStorage ПОСЛЕ гидрации (client-only)
  useEffect(() => {
    try {
      const savedPage = sessionStorage.getItem(NAV_STORAGE_KEY);
      if (savedPage && ['dashboard', 'orders', 'payment-calendar', 'settings'].includes(savedPage)) {
        setCurrentPageRaw(savedPage as PageId);
      }
      const savedOrder = sessionStorage.getItem(ORDER_STORAGE_KEY);
      if (savedOrder) {
        setSelectedOrderIdRaw(savedOrder);
      }
    } catch {}
  }, []);

  const setCurrentPage = useCallback((page: PageId) => {
    setCurrentPageRaw(page);
    try { sessionStorage.setItem(NAV_STORAGE_KEY, page); } catch {}
  }, []);

  const setSelectedOrderId = useCallback((id: string | null) => {
    setSelectedOrderIdRaw(id);
    try {
      if (id) sessionStorage.setItem(ORDER_STORAGE_KEY, id);
      else sessionStorage.removeItem(ORDER_STORAGE_KEY);
    } catch {}
  }, []);


  const [lang, setLang] = useState<Lang>('ru');
  const toggleLang = useCallback(() => setLang((prev) => (prev === 'ru' ? 'ukr' : 'ru')), []);
  const tr = useCallback((key: string) => t(lang, key), [lang]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const toggleSidebar = useCallback(() => setSidebarCollapsed((prev) => !prev), []);

  const value: NavState = {
    currentPage, setCurrentPage,
    lang, toggleLang, tr,
    sidebarCollapsed, toggleSidebar,
    selectedOrderId, setSelectedOrderId,
  };

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}
