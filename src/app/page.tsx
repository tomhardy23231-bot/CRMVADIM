'use client';

import React, { useEffect } from 'react';
import { CRMProvider, useCRM } from '@/lib/crm-context';
import { Sidebar } from '@/components/crm/Sidebar';
import { MobileSidebar } from '@/components/crm/MobileSidebar';
import { Header } from '@/components/crm/Header';
import { Dashboard } from '@/components/crm/Dashboard';
import { OrdersList } from '@/components/crm/OrdersList';
import { OrderCard } from '@/components/crm/OrderCard';
import { PaymentCalendar } from '@/components/crm/PaymentCalendar';

// ============================================================
// CRMShell — Внутренняя оболочка: Sidebar + Header + Content
// Управляется через React State (currentPage + selectedOrderId)
// ============================================================

function CRMShell() {
  const { currentPage, selectedOrderId, setSelectedOrderId, setBreadcrumbs, lang, tr } = useCRM();

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
            <div className="w-7 h-7 rounded-md bg-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-200">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5.428 17.245A10.5 10.5 0 0018.572 6.755M18.572 6.755A10.5 10.5 0 005.428 17.245"
                />
              </svg>
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
// Page — Точка входа. Оборачиваем всё в CRMProvider
// ============================================================

export default function Home() {
  return (
    <CRMProvider>
      <CRMShell />
    </CRMProvider>
  );
}
