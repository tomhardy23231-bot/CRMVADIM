'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useCRM } from '@/lib/crm-context';
import { useAuth } from '@/lib/auth-context';
import { formatUAH, calcMargin, calcSmartHybridCost } from '@/lib/crm-utils';
import { Download, Loader2, Search, Eye, PackageOpen, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, Trash2, Filter, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ============================================================
// OrdersList — Страница списка заказов с сортировкой и модалкой импорта из 1С
// ============================================================

const statusColors: Record<string, string> = {
  'Проектирование': 'bg-slate-100 text-slate-700',
  'Закупка материалов': 'bg-cyan-100 text-cyan-700',
  'В производстве': 'bg-amber-100 text-amber-700',
  'Сборка': 'bg-purple-100 text-purple-700',
  'Доставка': 'bg-indigo-100 text-indigo-700',
  'Отгружен': 'bg-blue-100 text-blue-700',
  'Рекламации': 'bg-red-100 text-red-700',
  'Выполнен': 'bg-emerald-100 text-emerald-700',
  'Оплачен': 'bg-green-100 text-green-700',
};

const statusDotColors: Record<string, string> = {
  'Проектирование': 'bg-slate-500',
  'Закупка материалов': 'bg-cyan-500',
  'В производстве': 'bg-amber-500',
  'Сборка': 'bg-purple-500',
  'Доставка': 'bg-indigo-500',
  'Отгружен': 'bg-blue-500',
  'Рекламации': 'bg-red-500',
  'Выполнен': 'bg-emerald-500',
  'Оплачен': 'bg-green-500',
};

const statusFilterOptions = ['Все', 'Проектирование', 'Закупка материалов', 'В производстве', 'Сборка', 'Доставка', 'Отгружен', 'Рекламации', 'Выполнен', 'Оплачен'] as const;

type SortKey = 'amount' | 'deadline';
type SortDirection = 'asc' | 'desc';

const statusTranslateMap: Record<string, string> = {
  'Проектирование': 'status_design',
  'Закупка материалов': 'status_purchasing',
  'В производстве': 'status_production',
  'Сборка': 'status_assembly',
  'Доставка': 'status_delivery',
  'Отгружен': 'status_shipped',
  'Рекламации': 'status_claims',
  'Выполнен': 'status_completed',
  'Оплачен': 'status_paid',
};

/** Тип данных тендера из 1С */
interface OneCContractor {
  id: string;
  name: string;
}

/** Иконка сортировки */
function SortIcon({ sortConfig, columnKey }: { sortConfig: { key: SortKey; direction: SortDirection } | null; columnKey: SortKey }) {
  if (!sortConfig || sortConfig.key !== columnKey) return <ArrowUpDown className="w-3 h-3 text-gray-300" />;
  return sortConfig.direction === 'asc'
    ? <ArrowUp className="w-3 h-3 text-emerald-600" />
    : <ArrowDown className="w-3 h-3 text-emerald-600" />;
}

interface OrdersListProps {
  onSelectOrder: (orderId: string) => void;
  isArchive?: boolean;
}

// ============================================================
// Модалка импорта из 1С — показывает список тендеров
// ============================================================
function ImportDialog({ onImported }: { onImported: () => void }) {
  const { addOrder, orders: crmOrders, tr } = useCRM();
  const [open, setOpen] = useState(false);
  const [contractors, setContractors] = useState<OneCContractor[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Загружаем список из 1С при открытии
  const fetchFromOnec = async () => {
    setLoadingList(true);
    try {
      const res = await fetch('/api/1c/contractors/list');
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Ошибка загрузки');
      setContractors(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(`Не удалось загрузить список из 1С: ${err.message}`);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (open) {
      setSearchQuery('');
      fetchFromOnec();
    }
  }, [open]);

  // Фильтрация по поиску внутри модалки
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return contractors;
    const q = searchQuery.toLowerCase();
    return contractors.filter(
      (c) => c.name.toLowerCase().includes(q)
    );
  }, [contractors, searchQuery]);

  // Уже добавленные в CRM тендеры (по id)
  const alreadyImported = new Set(crmOrders.map((o) => o.id));

  const handleImport = async (contractor: OneCContractor) => {
    const isAlreadyImported = alreadyImported.has(contractor.id);
    setImportingId(contractor.id);
    try {
      // Идем за деталями
      const res = await fetch('/api/1c/contractor/search?name=' + encodeURIComponent(contractor.name));
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Ошибка загрузки деталей');
      
      await addOrder(data);
      if (isAlreadyImported) {
        toast.success(`Платежи по "${contractor.name}" синхронизированы!`);
      } else {
        toast.success(`Тендер ${contractor.name} імпортовано!`);
      }
      setOpen(false);
      onImported();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка импорта');
    } finally {
      setImportingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md h-9 text-xs lg:text-sm">
          <Download className="w-4 h-4 mr-1.5 lg:mr-2" />
          <span className="hidden sm:inline">{tr('import_from_1c')}</span>
          <span className="sm:hidden">Импорт 1С</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col mx-2">
        <DialogHeader>
          <DialogTitle>Импорт Тендера из 1С</DialogTitle>
          <DialogDescription>
            Выберите тендер из папки "Тендера Днепр" для загрузки аналитики
          </DialogDescription>
        </DialogHeader>

        {/* Поиск + обновить */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Поиск по названию тендера..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="icon" onClick={fetchFromOnec} disabled={loadingList}>
            <RefreshCw className={cn('w-4 h-4', loadingList && 'animate-spin')} />
          </Button>
        </div>

        {/* Список тендеров */}
        <div className="flex-1 overflow-y-auto border rounded-lg mobile-scroll">
          {loadingList ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span className="text-sm">Загружаем из 1С...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <PackageOpen className="w-8 h-8 text-gray-300 mb-2" />
              <p className="text-sm">Тендеры не найдены</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map((contractor) => {
                const imported = alreadyImported.has(contractor.id);
                const isLoading = importingId === contractor.id;
                return (
                  <div key={contractor.id} className={cn('flex items-center justify-between gap-3 px-4 py-3', imported && 'opacity-50')}>
                    <span className="text-sm font-semibold text-gray-800 truncate flex-1">{contractor.name}</span>
                    <Button
                      size="sm"
                      onClick={() => handleImport(contractor)}
                      disabled={imported || isLoading}
                      className={cn(
                        'text-xs h-8 px-3 shrink-0',
                        imported
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      )}
                    >
                      {isLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : imported ? (
                        'Добавлен'
                      ) : (
                        'Импорт'
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const OrdersList = React.memo(function OrdersList({ onSelectOrder, isArchive = false }: OrdersListProps) {
  const { orders, tr, removeOrder } = useCRM();
  const { hasPermission } = useAuth();
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('Все');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const canEditOrders = hasPermission('canEditOrders');
  const canImportFrom1C = hasPermission('canImportFrom1C');

  // Имя заказа, который удаляем (для отображения в диалоге)
  const deleteTargetName = deleteTargetId ? orders.find(o => o.id === deleteTargetId)?.name || '' : '';

  // Фильтрация по поиску + статусу
  const filtered = useMemo(() => {
    let result = orders.filter(
      (o) =>
        (o.id.toLowerCase().includes(search.toLowerCase()) ||
        o.name.toLowerCase().includes(search.toLowerCase())) &&
        !!o.isArchived === isArchive
    );

    // Фильтр по статусу
    if (statusFilter !== 'Все') {
      result = result.filter(o => o.status === statusFilter);
    }

    // Сортировка
    if (sortConfig) {
      result = [...result].sort((a, b) => {
        let cmp = 0;
        if (sortConfig.key === 'amount') {
          cmp = a.orderAmount - b.orderAmount;
        } else if (sortConfig.key === 'deadline') {
          cmp = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        }
        return sortConfig.direction === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [orders, search, sortConfig, statusFilter, isArchive]);

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => {
      if (prev && prev.key === key) {
        return prev.direction === 'asc' ? { key, direction: 'desc' } : null;
      }
      return { key, direction: 'asc' };
    });
  };

  const handleConfirmDelete = () => {
    if (deleteTargetId) {
      removeOrder(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  // Количество по статусам для бейджей
  const statusCounts = useMemo(() => {
    const scoped = orders.filter((o) => !!o.isArchived === isArchive);
    const counts: Record<string, number> = { 'Все': scoped.length };
    for (const o of scoped) {
      counts[o.status] = (counts[o.status] || 0) + 1;
    }
    return counts;
  }, [orders, isArchive]);

  return (
    <div className="space-y-3 lg:space-y-4">
      {/* Шапка с поиском и кнопкой импорта */}
      <div className="flex items-center gap-2 lg:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={tr('search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 lg:h-10"
          />
        </div>

        {!isArchive && canImportFrom1C && <ImportDialog onImported={() => {}} />}
      </div>

      {/* Фильтр по статусам — горизонтальный скролл на мобильном */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 mobile-hide-scrollbar -mx-3 px-3 lg:mx-0 lg:px-0 lg:flex-wrap">
        <Filter className="w-4 h-4 text-gray-400 shrink-0 hidden lg:block" />
        {statusFilterOptions.map((status) => {
          const isActive = statusFilter === status;
          const count = statusCounts[status] || 0;
          if (count === 0 && status !== 'Все') return null;
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                'inline-flex items-center gap-1 px-2.5 lg:px-3 py-1.5 rounded-full text-[11px] lg:text-xs font-medium transition-all duration-200 border shrink-0 whitespace-nowrap',
                isActive
                  ? status === 'Все'
                    ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                    : `${statusColors[status] || 'bg-gray-100 text-gray-700'} border-current shadow-sm`
                  : 'bg-white text-gray-500 border-gray-200 active:bg-gray-50'
              )}
            >
              {status === 'Все' ? status : tr(statusTranslateMap[status] || status)}
              <span className={cn(
                'text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center',
                isActive ? 'bg-white/20 text-current' : 'bg-gray-100 text-gray-500'
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ===== МОБИЛЬНОЕ представление — карточки ===== */}
      <div className="lg:hidden space-y-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
              <PackageOpen className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">{tr('no_orders')}</p>
            <p className="text-xs text-gray-400 mt-1">{tr('no_orders_desc')}</p>
          </div>
        ) : (
          filtered.map((order) => {
            const smartHybridCost = calcSmartHybridCost(order);
            const margin = calcMargin(order.orderAmount, smartHybridCost);
            return (
              <div
                key={order.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm active:shadow-none active:bg-gray-50 transition-all duration-150 overflow-hidden"
                onClick={() => onSelectOrder(order.id)}
              >
                <div className="p-3.5">
                  {/* Top row: ID + Status + Margin */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-gray-400">
                        {order.externalId || order.id.slice(0, 8)}
                      </span>
                      <Badge
                        variant="secondary"
                        className={cn('text-[10px] px-1.5 py-0', statusColors[order.status] || 'bg-gray-100 text-gray-700')}
                      >
                        {tr(statusTranslateMap[order.status] || order.status)}
                      </Badge>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>

                  {/* Название */}
                  <p className="text-sm font-semibold text-gray-800 leading-snug mb-2.5 line-clamp-2">
                    {order.name}
                  </p>

                  {/* Bottom row: Сумма + Маржа + Дедлайн */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-[9px] text-gray-400 uppercase tracking-wide">{tr('order_amount')}</p>
                        <p className={cn(
                          "text-sm font-bold",
                          order.isAmountManual ? "text-emerald-600" : "text-red-500"
                        )}>
                          {order.orderAmount > 0 ? formatUAH(order.orderAmount) : '—'}
                        </p>
                      </div>
                      <div className="w-px h-6 bg-gray-100" />
                      <div>
                        <p className="text-[9px] text-gray-400 uppercase tracking-wide">{tr('margin')}</p>
                        <p className={cn(
                          "text-sm font-bold",
                          margin >= 20 ? 'text-emerald-600' : margin >= 10 ? 'text-amber-600' : 'text-red-600'
                        )}>
                          {order.orderAmount > 0 ? `${margin}%` : '—'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-gray-400 uppercase tracking-wide">{tr('deadline')}</p>
                      <p className="text-xs font-medium text-gray-600">
                        {new Date(order.deadline).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ===== ДЕСКТОПНОЕ представление — таблица ===== */}
      <Card className="bg-white shadow-sm hidden lg:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-medium text-gray-500">{tr('id')}</TableHead>
                <TableHead className="text-xs font-medium text-gray-500">{tr('order_name')}</TableHead>
                <TableHead className="text-xs font-medium text-gray-500">{tr('status')}</TableHead>
                <TableHead
                  className="text-xs font-medium text-gray-500 text-right cursor-pointer select-none hover:text-gray-700 transition-colors"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    {tr('order_amount')}
                    <SortIcon sortConfig={sortConfig} columnKey="amount" />
                  </div>
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 text-right">{tr('margin')}</TableHead>
                <TableHead
                  className="text-xs font-medium text-gray-500 cursor-pointer select-none hover:text-gray-700 transition-colors"
                  onClick={() => handleSort('deadline')}
                >
                  <div className="flex items-center gap-1.5">
                    {tr('deadline')}
                    <SortIcon sortConfig={sortConfig} columnKey="deadline" />
                  </div>
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 text-center">{tr('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-0">
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                      <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                        <PackageOpen className="w-8 h-8 text-gray-300" />
                      </div>
                      <p className="text-sm font-medium text-gray-500">{tr('no_orders')}</p>
                      <p className="text-xs text-gray-400 mt-1">{tr('no_orders_desc')}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((order) => {
                  // Вычисляем гибридную себестоимость
                  const smartHybridCost = order.budgetItems.filter(b => !b.isIncome).reduce((sum, b) => {
                    if (b.name === 'Материалы (План)') {
                      return sum + (b.fact > 0 ? b.fact : b.plan);
                    }
                    const linkedPayments = (order.payments || []).filter(p => p.budgetItemId === b.id);
                    const paymentsSum = linkedPayments.reduce((acc, p) => acc + p.expense, 0);
                    return sum + (paymentsSum > 0 ? paymentsSum : b.plan);
                  }, 0);
                  
                  const margin = calcMargin(order.orderAmount, smartHybridCost);
                  return (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer hover:bg-gray-50 transition-all duration-150 group"
                      onClick={() => onSelectOrder(order.id)}
                    >
                      <TableCell className="font-mono text-xs font-semibold text-gray-700">
                        {order.externalId || order.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-800 max-w-[300px] truncate">
                        {order.name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={statusColors[order.status] || 'bg-gray-100 text-gray-700'}
                        >
                          {tr(statusTranslateMap[order.status] || order.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className={cn(
                        "text-sm text-right font-bold",
                        order.isAmountManual ? "text-emerald-600" : "text-red-500"
                      )}>
                        {order.orderAmount > 0 ? formatUAH(order.orderAmount) : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-right">
                        {order.orderAmount > 0 ? (
                          <span
                            className={
                              margin >= 20
                                ? 'text-emerald-600 font-semibold'
                                : margin >= 10
                                  ? 'text-amber-600 font-semibold'
                                  : 'text-red-600 font-semibold'
                            }
                          >
                            {margin}%
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(order.deadline).toLocaleDateString('ru-RU')}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-emerald-600 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectOrder(order.id);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {canEditOrders && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-400 hover:text-red-600 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTargetId(order.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* AlertDialog подтверждения удаления */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent className="mx-4 max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить тендер?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы собираетесь удалить тендер <strong>«{deleteTargetName}»</strong>. Это действие необратимо — все данные бюджета, спецификации и платежей будут потеряны.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});
