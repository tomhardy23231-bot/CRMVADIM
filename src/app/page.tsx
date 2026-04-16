'use client';

import React, { useEffect } from 'react';
import { CRMProvider, useCRM } from '@/lib/crm-context';
import { SessionProvider, useSession } from 'next-auth/react';
import { Sidebar } from '@/components/crm/Sidebar';
import { MobileSidebar } from '@/components/crm/MobileSidebar';
import { Header } from '@/components/crm/Header';
import { Dashboard } from '@/components/crm/Dashboard';
import { OrdersList } from '@/components/crm/OrdersList';
import { OrderCard } from '@/components/crm/OrderCard';
import { PaymentCalendar } from '@/components/crm/PaymentCalendar';
import { Settings } from '@/components/crm/Settings';
import { DashboardSkeleton, OrdersListSkeleton } from '@/components/crm/LoadingSkeleton';
import type { UserInfo } from '@/lib/crm-types';

// ============================================================
// CRMShell — Внутренняя оболочка: Sidebar + Header + Content
// Управляется через React State (currentPage + selectedOrderId)
// ============================================================

function CRMShell() {
  const { currentPage, selectedOrderId, setSelectedOrderId, setBreadcrumbs, lang, tr, isLoading } = useCRM();

  // Обновляем хлебные крошки при смене страницы или языка
  useEffect(() => {
    if (selectedOrderId) {
      setBreadcrumbs([tr('orders'), `${tr('order_card')} ${selectedOrderId}`]);
    } else {
      const map: Record<string, string[]> = {
        dashboard: [tr('dashboard')],
        orders: [tr('orders')],
        'payment-calendar': [tr('finance'), tr('payment_calendar')],
      };
      setBreadcrumbs(map[currentPage] || [tr('dashboard')]);
    }
  }, [currentPage, selectedOrderId, lang, tr, setBreadcrumbs]);

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
      if (currentPage === 'orders') return <OrdersListSkeleton />;
      return <DashboardSkeleton />;
    }

    // Если выбран заказ — показываем карточку
    if (selectedOrderId) {
      return <OrderCard orderId={selectedOrderId} onBack={handleBackToOrders} />;
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'orders':
        return <OrdersList onSelectOrder={handleSelectOrder} />;
      case 'payment-calendar':
        return <PaymentCalendar />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Десктопный сайдбар */}
      <Sidebar />

      {/* Основная область */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Мобильный хедер + сайдбар */}
        <div className="lg:hidden flex items-center gap-2 px-4 h-14 border-b border-gray-200 bg-white">
          <MobileSidebar />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gray-900 flex items-center justify-center shadow-sm shadow-gray-200">
              <img src="/logo-white.svg" alt="WWC Logo" className="w-4.5 h-4.5 object-contain" />
            </div>
            <span className="text-sm font-bold text-gray-900 tracking-wide">WEST WOOD</span>
          </div>
        </div>

        {/* Хедер (только на десктопе) */}
        <div className="hidden lg:block">
          <Header />
        </div>

        {/* Контент */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {renderContent()}
        </main>
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
