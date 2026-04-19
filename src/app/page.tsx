'use client';

import React, { useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { CRMProvider, useCRM } from '@/lib/crm-context';
import { SessionProvider, useSession } from 'next-auth/react';
import { Sidebar } from '@/components/crm/Sidebar';
import { Header } from '@/components/crm/Header';
import { DashboardSkeleton, OrdersListSkeleton } from '@/components/crm/LoadingSkeleton';
import { MobileBottomNav } from '@/components/crm/MobileBottomNav';
import type { UserInfo } from '@/lib/crm-types';

// ============================================================
// OrdersList + OrderCard — прямой импорт (частый переход, без задержки)
// Dashboard, PaymentCalendar, Settings — lazy (реже открываются)
// ============================================================
import { OrdersList } from '@/components/crm/OrdersList';
import { OrderCard } from '@/components/crm/OrderCard';

const Dashboard = dynamic(() => import('@/components/crm/Dashboard').then(m => ({ default: m.Dashboard })), {
  loading: () => <DashboardSkeleton />,
});

const PaymentCalendar = dynamic(() => import('@/components/crm/PaymentCalendar').then(m => ({ default: m.PaymentCalendar })), {
  loading: () => <DashboardSkeleton />,
});

const Settings = dynamic(() => import('@/components/crm/Settings').then(m => ({ default: m.Settings })), {
  loading: () => <DashboardSkeleton />,
});

// ============================================================
// CRMShell — Внутренняя оболочка: Sidebar + Header + Content
// Управляется через React State (currentPage + selectedOrderId)
// ============================================================

function CRMShell() {
  const { currentPage, selectedOrderId, setSelectedOrderId, lang, tr, isLoading } = useCRM();

  // Навигация к карточке заказа
  const handleSelectOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
  };

  // Назад к списку заказов
  const handleBackToOrders = () => {
    setSelectedOrderId(null);
  };

  // Определяем, что рендерить
  const renderContent = () => {
    // Скелетоны загрузки
    if (isLoading) {
      if (currentPage === 'orders' || currentPage === 'archive') return <OrdersListSkeleton />;
      return <DashboardSkeleton />;
    }

    // Если выбран заказ — показываем карточку (только на страницах заказов/архива)
    if (selectedOrderId && (currentPage === 'orders' || currentPage === 'archive')) {
      return <OrderCard orderId={selectedOrderId} onBack={handleBackToOrders} />;
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'orders':
        return <OrdersList onSelectOrder={handleSelectOrder} />;
      case 'archive':
        return <OrdersList isArchive onSelectOrder={handleSelectOrder} />;
      case 'payment-calendar':
        return <PaymentCalendar />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="h-[100dvh] flex bg-slate-200 overflow-hidden w-full">
      {/* Десктопный сайдбар */}
      <Sidebar />

      {/* Основная область */}
      <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden">
        {/* Мобильный хедер */}
        <div className="lg:hidden flex items-center justify-between px-4 h-14 border-b border-gray-200/60 bg-white/90 backdrop-blur-md sticky top-0 z-40 mobile-safe-top">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#426BB3] flex items-center justify-center shadow-sm">
              <img src="/logo-white.svg" alt="WWC Logo" className="w-5 h-5 object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-gray-900 tracking-wide leading-tight">WEST WOOD</span>
              <span className="text-[9px] text-gray-400 tracking-widest uppercase leading-tight">CRM System</span>
            </div>
          </div>
          {/* Mobile header right: sync + lang + avatar */}
          <div className="flex items-center gap-2">
            <Header isMobileCompact />
          </div>
        </div>

        {/* Хедер (только на десктопе) */}
        <div className="hidden lg:block">
          <Header />
        </div>

        {/* Контент — с отступом снизу для мобильной навигации */}
        <main className="flex-1 overflow-y-auto p-3 lg:p-6 pb-20 lg:pb-6 mobile-scroll">
          {renderContent()}
        </main>

        {/* Мобильная навигация снизу — как в iOS */}
        <MobileBottomNav />
      </div>
    </div>
  );
}

// ============================================================
// SessionWrapper — Извлекает сессию и пробрасывает user в CRMProvider
// ============================================================

function SessionWrapper() {
  const { data: session } = useSession();

  const user: UserInfo | null = session?.user
    ? {
        id: (session.user as any).id,
        login: (session.user as any).login || '',
        firstName: (session.user as any).firstName || '',
        lastName: (session.user as any).lastName || '',
        role: (session.user as any).role || 'WORKER',
        permissions: (session.user as any).permissions || {},
      }
    : null;

  return (
    <CRMProvider user={user}>
      <CRMShell />
    </CRMProvider>
  );
}

// ============================================================
// Page — Точка входа. Оборачиваем в SessionProvider + CRMProvider
// ============================================================

export default function Home() {
  return (
    <SessionProvider>
      <SessionWrapper />
    </SessionProvider>
  );
}
