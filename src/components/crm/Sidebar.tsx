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
  Settings,
  LogOut,
} from 'lucide-react';
import { signOut } from 'next-auth/react';
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
  const { currentPage, setCurrentPage, sidebarCollapsed, toggleSidebar, setSelectedOrderId, tr, isAdmin, currentUser } = useCRM();

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'hidden lg:flex flex-col bg-[#426BB3] min-h-screen shrink-0 transition-all duration-300 ease-in-out relative overflow-visible text-white shadow-[4px_0_24px_-10px_rgba(0,0,0,0.1)]',
          sidebarCollapsed ? 'w-20' : 'w-64'
        )}
      >
        {/* Логотип + кнопка сворачивания */}
        <div
          className={cn(
            'flex items-center border-b border-white/10 shrink-0 transition-all duration-300',
            sidebarCollapsed ? 'flex-col justify-center gap-2 py-3' : 'h-16 px-5 justify-between'
          )}
        >
          {/* Логотип */}
          <div className={cn('flex items-center gap-3', sidebarCollapsed && 'gap-0')}>
            <div className="w-9 h-9 rounded-xl bg-gray-900 flex items-center justify-center shrink-0 shadow-sm shadow-gray-200">
              <img src="/logo-white.svg" alt="WWC Logo" className="w-6 h-6 object-contain" />
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-bold tracking-wide text-white leading-tight">
                  WEST WOOD
                </span>
                <span className="text-[10px] text-blue-100/70 tracking-widest uppercase">
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
              'text-blue-100/80 hover:text-white hover:bg-white/10 transition-all shrink-0',
              sidebarCollapsed
                ? 'h-8 w-8 rounded-xl border border-white/10 bg-black/20 hover:bg-white/10'
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
                onClick={() => { setCurrentPage(item.id); setSelectedOrderId(null); }}
                className={cn(
                  'w-full flex items-center rounded-xl text-sm font-medium transition-all duration-200',
                  sidebarCollapsed
                    ? 'justify-center h-10 w-10 mx-auto'
                    : 'gap-3 px-3 py-2.5',
                  isActive
                    ? 'bg-white text-[#426BB3] shadow-md shadow-black/10'
                    : 'text-blue-100/80 hover:bg-white/10 hover:text-white'
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

          {/* Настройки — только для Admin */}
          {isAdmin && (() => {
            const isActive = currentPage === 'settings';
            const label = tr('settings');
            const settingsButton = (
              <button
                onClick={() => { setCurrentPage('settings'); setSelectedOrderId(null); }}
                className={cn(
                  'w-full flex items-center rounded-xl text-sm font-medium transition-all duration-200',
                  sidebarCollapsed
                    ? 'justify-center h-10 w-10 mx-auto'
                    : 'gap-3 px-3 py-2.5',
                  isActive
                    ? 'bg-white text-[#426BB3] shadow-md shadow-black/10'
                    : 'text-blue-100/80 hover:bg-white/10 hover:text-white'
                )}
              >
                <Settings className={cn('shrink-0', sidebarCollapsed ? 'w-5 h-5' : 'w-4.5 h-4.5')} />
                {!sidebarCollapsed && <span>{label}</span>}
              </button>
            );
            if (sidebarCollapsed) {
              return (
                <Tooltip>
                  <TooltipTrigger asChild>{settingsButton}</TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">{label}</TooltipContent>
                </Tooltip>
              );
            }
            return settingsButton;
          })()}
        </nav>

        {/* Подвал сайдбара */}
        <div
          className={cn(
            'border-t border-white/10 py-4 shrink-0 transition-all duration-300 space-y-3',
            sidebarCollapsed ? 'px-3 text-center' : 'px-5'
          )}
        >
          {/* Имя пользователя + Выход */}
          {currentUser && (
            <div className={cn('flex items-center', sidebarCollapsed ? 'justify-center' : 'gap-2')}>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{currentUser.firstName} {currentUser.lastName}</p>
                  <p className="text-[10px] text-blue-100/70 truncate">{currentUser.role === 'ADMIN' ? 'Администратор' : currentUser.role === 'MANAGER' ? 'Менеджер' : 'Рабочий'}</p>
                </div>
              )}
              {sidebarCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => signOut({ callbackUrl: '/login' })}
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-blue-100/80 hover:text-white hover:bg-red-500/80 transition-all"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Выход</TooltipContent>
                </Tooltip>
              ) : (
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-blue-100/80 hover:text-white hover:bg-red-500/80 transition-all shrink-0"
                  title="Выйти"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
          {sidebarCollapsed ? (
            <p className="text-[9px] text-blue-100/50">v1.0</p>
          ) : (
            <p className="text-[10px] text-blue-100/50">
              v1.0.0 • {tr('furniture_manufacturing')}
            </p>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
