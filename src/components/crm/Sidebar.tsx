'use client';

import React from 'react';
import { useCRM } from '@/lib/crm-context';
import type { PageId } from '@/lib/crm-types';
import {
  LayoutDashboard,
  ClipboardList,
  CalendarClock,
  TreePine,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================
// Sidebar — Светлый, сворачиваемый сайдбар с тултипами
// ============================================================

const navItems: { id: PageId; labelKey: string; icon: React.ElementType }[] = [
  { id: 'dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
  { id: 'orders', labelKey: 'orders', icon: ClipboardList },
  { id: 'payment-calendar', labelKey: 'payment_calendar', icon: CalendarClock },
];

export function Sidebar() {
  const { currentPage, setCurrentPage, sidebarCollapsed, toggleSidebar, tr } = useCRM();

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'hidden lg:flex flex-col bg-white border-r border-gray-200 min-h-screen shrink-0 transition-all duration-300 ease-in-out relative overflow-visible',
          sidebarCollapsed ? 'w-20' : 'w-64'
        )}
      >
        {/* Логотип + кнопка сворачивания */}
        <div
          className={cn(
            'flex items-center border-b border-gray-100 shrink-0 transition-all duration-300',
            sidebarCollapsed ? 'flex-col justify-center gap-2 py-3' : 'h-16 px-5 justify-between'
          )}
        >
          {/* Логотип */}
          <div className={cn('flex items-center gap-3', sidebarCollapsed && 'gap-0')}>
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0 shadow-sm shadow-emerald-200">
              <TreePine className="w-5 h-5 text-white" />
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-bold tracking-wide text-gray-900 leading-tight">
                  WEST WOOD
                </span>
                <span className="text-[10px] text-gray-400 tracking-widest uppercase">
                  Company 2012
                </span>
              </div>
            )}
          </div>

          {/* Кнопка сворачивания/разворачивания — всегда видна */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className={cn(
              'text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all shrink-0',
              sidebarCollapsed
                ? 'h-8 w-8 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-gray-300'
                : 'h-8 w-8'
            )}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Навигация */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            const label = tr(item.labelKey);

            const button = (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={cn(
                  'w-full flex items-center rounded-xl text-sm font-medium transition-all duration-200',
                  sidebarCollapsed
                    ? 'justify-center h-10 w-10 mx-auto'
                    : 'gap-3 px-3 py-2.5',
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 hover:bg-emerald-700 hover:shadow-lg'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                )}
              >
                <Icon className={cn('shrink-0', sidebarCollapsed ? 'w-5 h-5' : 'w-4.5 h-4.5')} />
                {!sidebarCollapsed && <span>{label}</span>}
              </button>
            );

            // В свёрнутом режиме показываем тултип
            if (sidebarCollapsed) {
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    {button}
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <React.Fragment key={item.id}>{button}</React.Fragment>;
          })}
        </nav>

        {/* Подвал сайдбара */}
        <div
          className={cn(
            'border-t border-gray-100 py-4 shrink-0 transition-all duration-300',
            sidebarCollapsed ? 'px-3 text-center' : 'px-5'
          )}
        >
          {sidebarCollapsed ? (
            <p className="text-[9px] text-gray-300">v1.0</p>
          ) : (
            <p className="text-[10px] text-gray-400">
              v1.0.0 • {tr('furniture_manufacturing')}
            </p>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
