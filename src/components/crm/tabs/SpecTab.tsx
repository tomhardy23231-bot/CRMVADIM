'use client';

import React, { useState, useMemo } from 'react';
import type { Order } from '@/lib/crm-types';
import { useCRM } from '@/lib/crm-context';
import { formatUAH } from '@/lib/crm-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, FileSpreadsheet, Search, X } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

// ============================================================
// SpecTab — Вкладка «Данные из 1С»: спецификация материалов
// ============================================================

interface SpecTabProps {
  order: Order;
}

export function SpecTab({ order }: SpecTabProps) {
  const { tr } = useCRM();
  const [search, setSearch] = useState('');

  const totalAmount = order.specItems.reduce((sum, s) => sum + s.total, 0);
  const totalCost = order.specItems.reduce((sum, s) => sum + (s.cost || 0), 0);
  const hasCostData = order.specItems.some(s => s.cost !== undefined);

  const filtered = useMemo(() => {
    if (!search.trim()) return order.specItems;
    const q = search.toLowerCase();
    return order.specItems.filter(s => s.material.toLowerCase().includes(q));
  }, [order.specItems, search]);

  return (
    <Card className="bg-white shadow-sm hover:shadow-md transition-all duration-200">
      <CardHeader className="pb-2 px-3 lg:px-6">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm lg:text-base font-semibold">
            <Database className="w-4 h-4 text-gray-500 shrink-0" />
            {tr('material')} (из 1С)
            <span className="text-[10px] font-normal text-gray-400 ml-1 hidden sm:inline">— {tr('spec_readonly')}</span>
            {order.specItems.length > 0 && (
              <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-full ml-1">
                {filtered.length}{search ? `/${order.specItems.length}` : ''}
              </span>
            )}
          </CardTitle>
        </div>

        {/* Поиск — только мобилка */}
        {order.specItems.length > 5 && (
          <div className="lg:hidden mt-2 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Поиск материала..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {order.specItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
              <FileSpreadsheet className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">{tr('no_spec')}</p>
            <p className="text-xs text-gray-400 mt-1">{tr('no_spec_desc')}</p>
          </div>
        ) : (
          <>
            {/* ===== МОБИЛЬНЫЙ: Компактный список строк ===== */}
            <div className="lg:hidden">
              {/* Заголовок колонок */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border-b border-gray-100">
                <span className="w-5 shrink-0" />
                <span className="flex-1 text-[9px] font-bold text-gray-400 uppercase tracking-wide">Материал</span>
                <span className="w-[60px] text-right text-[9px] font-bold text-gray-400 uppercase tracking-wide shrink-0">Кол-во</span>
                <span className="w-[72px] text-right text-[9px] font-bold text-gray-400 uppercase tracking-wide shrink-0">Сумма</span>
              </div>

              {/* Строки */}
              <div className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs text-gray-400">Ничего не найдено</div>
                ) : (
                  filtered.map((item, i) => {
                    const globalIndex = order.specItems.indexOf(item);
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 transition-colors active:bg-gray-50',
                          i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'
                        )}
                      >
                        {/* Номер */}
                        <span className="w-5 shrink-0 text-[10px] font-mono text-gray-300 text-center leading-none">
                          {globalIndex + 1}
                        </span>

                        {/* Название + единица */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 leading-tight line-clamp-2">{item.material}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] text-gray-400">{item.unit}</span>
                            {hasCostData && item.cost !== undefined && item.cost !== 0 && (
                              <span className="text-[9px] text-red-500 font-medium">
                                Закупка: {formatUAH(item.cost)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Количество */}
                        <span className="w-[60px] text-right text-xs font-semibold text-gray-600 shrink-0 leading-tight">
                          {item.quantity % 1 === 0
                            ? item.quantity.toLocaleString('ru-RU')
                            : item.quantity.toLocaleString('ru-RU', { maximumFractionDigits: 2 })
                          }
                        </span>

                        {/* Сумма */}
                        <span className="w-[72px] text-right text-xs font-bold text-gray-800 shrink-0">
                          {formatUAH(item.total)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ===== ДЕСКТОП: таблица (без изменений) ===== */}
            <div className="hidden lg:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-medium text-gray-500">№</TableHead>
                    <TableHead className="text-xs font-medium text-gray-500">{tr('material')}</TableHead>
                    <TableHead className="text-xs font-medium text-gray-500 text-center">{tr('unit')}</TableHead>
                    <TableHead className="text-xs font-medium text-gray-500 text-right">{tr('quantity')}</TableHead>
                    <TableHead className="text-xs font-medium text-gray-500 text-right">{tr('price_per_unit')}</TableHead>
                    <TableHead className="text-xs font-medium text-gray-500 text-right">Сумма (Продажа)</TableHead>
                    {hasCostData && (
                      <TableHead className="text-xs font-medium text-gray-500 text-right">Себест-ть (1С)</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.specItems.map((item, i) => (
                    <TableRow key={item.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <TableCell className="text-sm text-gray-500 font-mono">{i + 1}</TableCell>
                      <TableCell className="text-sm text-gray-800">{item.material}</TableCell>
                      <TableCell className="text-sm text-gray-500 text-center">{item.unit}</TableCell>
                      <TableCell className="text-sm text-gray-700 text-right font-medium">
                        {item.quantity.toLocaleString('ru-RU')}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700 text-right">
                        {formatUAH(item.pricePerUnit)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-800 text-right font-semibold">
                        {formatUAH(item.total)}
                      </TableCell>
                      {hasCostData && (
                        <TableCell className="text-sm text-red-700 text-right font-semibold opacity-90">
                          {(item.cost !== undefined && item.cost !== 0) ? formatUAH(item.cost) : '—'}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {/* Итого */}
        {order.specItems.length > 0 && (
          <div className="px-3 lg:px-6 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between lg:justify-end gap-4">
            <span className="text-xs font-bold text-gray-600">
              Продажа: <span className="text-gray-900">{formatUAH(totalAmount)}</span>
            </span>
            {hasCostData && (
              <span className="text-xs font-bold text-red-600">
                Закупка: <span>{formatUAH(totalCost)}</span>
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
