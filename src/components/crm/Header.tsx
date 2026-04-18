'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useCRM } from '@/lib/crm-context';
import {
  ChevronRight,
  RefreshCw,
  User,
  Search,
  X,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ============================================================
// Header — Верхняя панель с глобальным поиском, хлебными крошками, синхронизацией, аватаром
// Поддерживает isMobileCompact для использования в мобильном хедере
// ============================================================

interface HeaderProps {
  isMobileCompact?: boolean;
}

export function Header({ isMobileCompact = false }: HeaderProps) {
  const { lang, toggleLang, tr, orders, setSelectedOrderId, currentPage, selectedOrderId, currentUser } = useCRM();

  const breadcrumbs = useMemo(() => {
    if (selectedOrderId) {
      return [tr('orders'), `${tr('order_card')} ${selectedOrderId}`];
    }
    const map: Record<string, string[]> = {
      dashboard: [tr('dashboard')],
      orders: [tr('orders')],
      'payment-calendar': [tr('finance'), tr('payment_calendar')],
      settings: [tr('settings')],
    };
    return map[currentPage] || [tr('dashboard')];
  }, [selectedOrderId, currentPage, tr]);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
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
    setMobileSearchOpen(false);
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

  // ======= Мобильная компактная версия =======
  if (isMobileCompact) {
    return (
      <>
        {/* Поиск (мобильный) */}
        <button
          onClick={() => setMobileSearchOpen(true)}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors active:bg-gray-200"
        >
          <Search className="w-4.5 h-4.5" />
        </button>

        {/* Переключатель языка (компактный) */}
        <button
          onClick={toggleLang}
          className="h-7 px-2 text-[10px] font-bold rounded-md bg-gray-100 text-gray-600 active:bg-gray-200 transition-colors"
        >
          {lang === 'ru' ? 'RU' : 'UKR'}
        </button>

        {/* Синхронизация */}
        <button
          onClick={handleSync}
          disabled={syncing}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors disabled:opacity-50 active:bg-gray-200"
        >
          <RefreshCw className={cn('w-4 h-4', syncing && 'animate-spin text-emerald-600')} />
        </button>

        {/* Мобильный поиск — полноэкранная модалка */}
        {mobileSearchOpen && (
          <div className="fixed inset-0 z-[60] bg-white animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-3 px-4 h-14 border-b border-gray-100 mobile-safe-top">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder={tr('global_search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full h-10 pl-9 pr-4 text-base bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#426BB3] focus:ring-2 focus:ring-[#426BB3]/20 transition-all"
                />
              </div>
              <button
                onClick={() => { setMobileSearchOpen(false); setSearchQuery(''); }}
                className="h-10 px-3 text-sm font-medium text-gray-500 hover:text-gray-700 active:text-gray-900 transition-colors shrink-0"
              >
                Отмена
              </button>
            </div>
            <div className="overflow-y-auto mobile-scroll" style={{ maxHeight: 'calc(100vh - 56px)' }}>
              {searchQuery.trim() && searchResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <Search className="w-8 h-8 text-gray-200 mb-3" />
                  <p className="text-sm font-medium">{tr('no_results')}</p>
                </div>
              ) : (
                <div className="py-2">
                  {searchResults.map((order) => (
                    <button
                      key={order.id}
                      onClick={() => handleSelectResult(order.id)}
                      className="w-full text-left px-4 py-3.5 active:bg-gray-50 transition-colors flex items-center gap-3 border-b border-gray-50"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                        <Search className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
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
                        <p className="text-sm text-gray-500 truncate mt-0.5">
                          {order.name}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0 font-medium">
                        {order.orderAmount > 0
                          ? `${(order.orderAmount / 1000).toFixed(0)}k ₴`
                          : '—'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </>
    );
  }

  // ======= Десктопная версия =======
  return (
    <header className="h-12 border-b border-gray-200/80 bg-white/80 backdrop-blur-md px-4 lg:px-6 flex items-center justify-between shrink-0 sticky top-0 z-50">
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

      {/* Центр: Глобальный поиск (скрываем внутри карточки заказа) */}
      {!selectedOrderId && (
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
      )}

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
            {currentUser ? `${currentUser.firstName[0]}${currentUser.lastName[0]}` : <User className="w-4 h-4" />}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm text-gray-700 font-medium hidden md:inline">
          {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : tr('manager')}
        </span>
      </div>
    </header>
  );
}
