'use client';

import React, { useState, useMemo } from 'react';
import { useCRM } from '@/lib/crm-context';
import { formatUAH, calcMargin } from '@/lib/crm-utils';
import { Download, Plus, Loader2, Search, Eye, PackageOpen, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ============================================================
// OrdersList — Страница списка заказов с сортировкой и модалкой импорта
// ============================================================

const statusColors: Record<string, string> = {
  'Новый': 'bg-blue-100 text-blue-700',
  'В производстве': 'bg-amber-100 text-amber-700',
  'Сборка': 'bg-purple-100 text-purple-700',
  'Отгружен': 'bg-emerald-100 text-emerald-700',
};

type SortKey = 'amount' | 'deadline';
type SortDirection = 'asc' | 'desc';

/** Иконка сортировки для заголовка таблицы */
function SortIcon({ sortConfig, columnKey }: { sortConfig: { key: SortKey; direction: SortDirection } | null; columnKey: SortKey }) {
  if (!sortConfig || sortConfig.key !== columnKey) {
    return <ArrowUpDown className="w-3 h-3 text-gray-300" />;
  }
  return sortConfig.direction === 'asc'
    ? <ArrowUp className="w-3 h-3 text-emerald-600" />
    : <ArrowDown className="w-3 h-3 text-emerald-600" />;
}

interface OrdersListProps {
  onSelectOrder: (orderId: string) => void;
}

export function OrdersList({ onSelectOrder }: OrdersListProps) {
  const { orders, addOrder, tr } = useCRM();
  const [search, setSearch] = useState('');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importId, setImportId] = useState('');
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>(null);

  // Фильтрация по поиску
  const filtered = useMemo(() => {
    let result = orders.filter(
      (o) =>
        o.id.toLowerCase().includes(search.toLowerCase()) ||
        o.name.toLowerCase().includes(search.toLowerCase())
    );

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
  }, [orders, search, sortConfig]);

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => {
      if (prev && prev.key === key) {
        return prev.direction === 'asc' ? { key, direction: 'desc' } : null;
      }
      return { key, direction: 'asc' };
    });
  };

  const handleImport = () => {
    if (!importId.trim()) return;
    setLoading(true);
    // Имитация загрузки из 1С (1 сек)
    setTimeout(() => {
      addOrder(importId.trim().toUpperCase());
      setLoading(false);
      setImportId('');
      setImportDialogOpen(false);
      toast.success(tr('toast_order_imported'));
    }, 1000);
  };

  return (
    <div className="space-y-4">
      {/* Шапка с поиском и кнопкой импорта */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={tr('search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <Download className="w-4 h-4 mr-2" />
              {tr('import_from_1c')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{tr('import_title')}</DialogTitle>
              <DialogDescription>
                {tr('import_description')}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder={tr('import_id_placeholder')}
                value={importId}
                onChange={(e) => setImportId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleImport()}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setImportDialogOpen(false)}
                disabled={loading}
              >
                {tr('cancel')}
              </Button>
              <Button
                onClick={handleImport}
                disabled={loading || !importId.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {tr('loading')}
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    {tr('download')}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Таблица заказов */}
      <Card className="bg-white shadow-sm">
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
                  const margin = calcMargin(order.orderAmount, order.plannedCost);
                  return (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer hover:bg-gray-50 transition-all duration-150 group"
                      onClick={() => onSelectOrder(order.id)}
                    >
                      <TableCell className="font-mono text-xs font-semibold text-gray-700">
                        {order.id}
                      </TableCell>
                      <TableCell className="text-sm text-gray-800 max-w-[300px] truncate">
                        {order.name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={statusColors[order.status] || 'bg-gray-100 text-gray-700'}
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-right font-medium text-gray-800">
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
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
