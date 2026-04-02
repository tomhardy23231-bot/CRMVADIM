'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useCRM } from '@/lib/crm-context';
import {
  ChevronRight,
  RefreshCw,
  User,
  Search,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ============================================================
// Header — Верхняя панель с глобальным поиском, хлебными крошками, синхронизацией, аватаром
// ============================================================

export function Header() {
  const { breadcrumbs, lang, toggleLang, tr, orders, setSelectedOrderId, setCurrentPage } = useCRM();
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Фильтрация заказов по поиску
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return orders.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        o.name.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [searchQuery, orders]);

  // Закрытие поиска при клике вне
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectResult = (orderId: string) => {
    setSelectedOrderId(orderId);
    setSearchQuery('');
    setSearchOpen(false);
  };

  const handleSync = () => {
    setSyncing(true);
    // Имитация синхронизации
    setTimeout(() => {
      setSyncing(false);
      toast.success(tr('toast_synced'));
    }, 1500);
  };

  const statusColors: Record<string, string> = {
    'Новый': 'bg-blue-100 text-blue-700',
    'В производстве': 'bg-amber-100 text-amber-700',
    'Сборка': 'bg-purple-100 text-purple-700',
    'Отгружен': 'bg-emerald-100 text-emerald-700',
  };

  return (
    <header className="h-14 border-b border-gray-200 bg-white px-4 lg:px-6 flex items-center justify-between shrink-0">
      {/* Левая часть: Хлебные крошки */}
      <div className="flex items-center gap-1.5 text-sm">
        {breadcrumbs.map((item, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            )}
            <span
              className={cn(
                i === breadcrumbs.length - 1
                  ? 'text-gray-900 font-medium'
                  : 'text-gray-500'
              )}
            >
              {item}
            </span>
          </React.Fragment>
        ))}
      </div>

      {/* Центр: Глобальный поиск */}
      <div className="hidden md:flex relative flex-1 max-w-md mx-6" ref={searchRef}>
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <Input
            placeholder={tr('global_search')}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => searchQuery.trim() && setSearchOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchResults.length === 1) {
                handleSelectResult(searchResults[0].id);
              }
              if (e.key === 'Escape') {
                setSearchOpen(false);
              }
            }}
            className="pl-9 h-9 text-sm bg-gray-50 border-gray-200 focus:bg-white"
          />
        </div>

        {/* Выпадающие результаты поиска */}
        {searchOpen && searchQuery.trim() && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
            {searchResults.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-gray-400">{tr('no_results')}</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto py-1">
                {searchResults.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => handleSelectResult(order.id)}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors flex items-center gap-3 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 group-hover:bg-emerald-50 transition-colors">
                      <Search className="w-3.5 h-3.5 text-gray-400 group-hover:text-emerald-600 transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-gray-700">
                          {order.id}
                        </span>
                        <Badge
                          variant="secondary"
                          className={cn('text-[10px] px-1.5 py-0', statusColors[order.status] || '')}
                        >
                          {order.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {order.name}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0 group-hover:text-emerald-600 transition-colors">
                      {order.orderAmount > 0
                        ? `${(order.orderAmount / 1000).toFixed(0)}k ₴`
                        : '—'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Правая часть */}
      <div className="flex items-center gap-3">
        {/* Синхронизация с 1С */}
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
          title="Синхронизировать с 1С"
        >
          <span className="hidden sm:inline">{tr('synced_with_1c')}: 15:45</span>
          <RefreshCw
            className={cn(
              'w-3.5 h-3.5 text-gray-400',
              syncing && 'animate-spin text-emerald-600'
            )}
          />
        </button>

        {/* Переключатель языка */}
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLang}
            className={cn(
              'h-7 px-2.5 text-xs font-medium rounded-md transition-all duration-200',
              lang === 'ru'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            RU
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLang}
            className={cn(
              'h-7 px-2.5 text-xs font-medium rounded-md transition-all duration-200',
              lang === 'ukr'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            UKR
          </Button>
        </div>

        {/* Аватарка пользователя */}
        <Avatar className="h-8 w-8 border border-gray-200">
          <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">
            <User className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
        <span className="text-sm text-gray-700 font-medium hidden md:inline">
          {tr('manager')}
        </span>
      </div>
    </header>
  );
}
