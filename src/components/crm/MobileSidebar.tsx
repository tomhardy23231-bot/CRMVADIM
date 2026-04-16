'use client';

import React from 'react';
import { useCRM } from '@/lib/crm-context';
import type { PageId } from '@/lib/crm-types';
import {
  LayoutDashboard,
  ClipboardList,
  CalendarClock,
  TreePine,
  Menu,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================
// MobileSidebar — Мобильное меню (Sheet, светлая тема)
// ============================================================

const navItems: { id: PageId; labelKey: string; icon: React.ElementType }[] = [
  { id: 'dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
  { id: 'orders', labelKey: 'orders', icon: ClipboardList },
  { id: 'payment-calendar', labelKey: 'payment_calendar', icon: CalendarClock },
];

export function MobileSidebar() {
  const { currentPage, setCurrentPage, tr } = useCRM();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="w-5 h-5" />
          <span className="sr-only">Открыть меню</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0 bg-white border-gray-200">
        <SheetTitle className="sr-only">Навигация</SheetTitle>
        {/* Логотип */}
        <div className="px-5 py-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-900 flex items-center justify-center shadow-sm shadow-gray-200">
              <img src="/logo-white.svg" alt="WWC Logo" className="w-6 h-6 object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-wide text-gray-900 leading-tight">
                WEST WOOD
              </span>
              <span className="text-[10px] text-gray-400 tracking-widest uppercase">
                Company 2012
              </span>
            </div>
          </div>
        </div>

        {/* Навигация */}
        <nav className="px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                )}
              >
                <Icon className="w-4.5 h-4.5" />
                {tr(item.labelKey)}
              </button>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
