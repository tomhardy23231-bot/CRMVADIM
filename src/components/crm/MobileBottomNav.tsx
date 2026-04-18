'use client';

import React from 'react';
import { useCRM } from '@/lib/crm-context';
import type { PageId } from '@/lib/crm-types';
import {
  LayoutDashboard,
  ClipboardList,
  CalendarClock,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================
// MobileBottomNav — iOS-style bottom tab bar navigation
// Designed for iPhone: safe areas, large touch targets, subtle animations
// ============================================================

const navItems: { id: PageId; labelKey: string; icon: React.ElementType }[] = [
  { id: 'dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
  { id: 'orders', labelKey: 'orders', icon: ClipboardList },
  { id: 'payment-calendar', labelKey: 'payment_calendar', icon: CalendarClock },
];

export function MobileBottomNav() {
  const { currentPage, setCurrentPage, setSelectedOrderId, tr, isAdmin } = useCRM();

  const allItems = isAdmin
    ? [...navItems, { id: 'settings' as PageId, labelKey: 'settings', icon: Settings }]
    : navItems;

  const handleNavigate = (pageId: PageId) => {
    setCurrentPage(pageId);
    setSelectedOrderId(null);
  };

  return (
    <nav className="lg:hidden mobile-bottom-nav mobile-safe-bottom">
      <div className="flex items-stretch justify-around px-2 pt-1.5 pb-1">
        {allItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          const label = tr(item.labelKey);

          return (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.id)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 py-1.5 px-3 rounded-xl transition-all duration-200 min-w-[64px] relative',
                isActive
                  ? 'text-[#426BB3]'
                  : 'text-gray-400 active:text-gray-600'
              )}
            >
              {/* Иконка активного свечения */}
              {isActive && (
                <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#426BB3] rounded-full shadow-[0_0_8px_rgba(66,107,179,0.4)] animate-in fade-in duration-300" />
              )}
              <div className={cn(
                'relative p-1.5 rounded-xl transition-all duration-200',
                isActive
                  ? 'bg-[#426BB3]/10 scale-105'
                  : ''
              )}>
                <Icon className={cn(
                  'w-5 h-5 transition-all duration-200',
                  isActive ? 'stroke-[2.5]' : 'stroke-[1.5]'
                )} />
              </div>
              <span className={cn(
                'text-[10px] font-medium transition-all duration-200 leading-tight',
                isActive ? 'font-semibold' : ''
              )}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
