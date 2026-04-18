'use client';

import React from 'react';
import type { Order } from '@/lib/crm-types';
import { useCRM } from '@/lib/crm-context';
import { formatUAH } from '@/lib/crm-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, FileSpreadsheet } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ============================================================
// SpecTab — Вкладка «Данные из 1С»: спецификация материалов (только чтение)
// ============================================================

interface SpecTabProps {
  order: Order;
}

export function SpecTab({ order }: SpecTabProps) {
  const { tr } = useCRM();
  const totalAmount = order.specItems.reduce((sum, s) => sum + s.total, 0);
  const totalCost = order.specItems.reduce((sum, s) => sum + (s.cost || 0), 0);
  const hasCostData = order.specItems.some(s => s.cost !== undefined);

  return (
    <Card className="bg-white shadow-sm hover:shadow-md transition-all duration-200">
      <CardHeader className="pb-3 px-3 lg:px-6">
        <CardTitle className="flex items-center gap-2 text-sm lg:text-base font-semibold">
          <Database className="w-4 h-4 lg:w-4.5 lg:h-4.5 text-gray-500" />
          {tr('material')} (из 1С)
          <span className="text-[10px] lg:text-xs font-normal text-gray-400 ml-1">— {tr('spec_readonly')}</span>
        </CardTitle>
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
            {/* ===== МОБИЛЬНОЕ представление — карточки ===== */}
            <div className="lg:hidden space-y-2 px-3 pb-3">
              {order.specItems.map((item, i) => (
                <div key={item.id} className="border border-gray-100 rounded-xl bg-gray-50/30 overflow-hidden">
                  <div className="p-3">
                    {/* Row 1: index + material name */}
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-[10px] font-mono font-bold text-gray-400 bg-gray-100 w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-sm font-medium text-gray-800 leading-snug">{item.material}</p>
                    </div>
                    
                    {/* Row 2: details grid */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-[9px] text-gray-400 uppercase tracking-wide">{tr('quantity')}</p>
                        <p className="text-sm font-semibold text-gray-700">
                          {item.quantity.toLocaleString('ru-RU')} <span className="text-[10px] font-normal text-gray-400">{item.unit}</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-400 uppercase tracking-wide">{tr('price_per_unit')}</p>
                        <p className="text-xs font-medium text-gray-600">{formatUAH(item.pricePerUnit)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-400 uppercase tracking-wide">Сумма</p>
                        <p className="text-sm font-bold text-gray-800">{formatUAH(item.total)}</p>
                      </div>
                    </div>

                    {/* Cost data if available */}
                    {hasCostData && item.cost !== undefined && item.cost !== 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-gray-400 uppercase tracking-wide">Себест-ть (1С)</span>
                          <span className="text-sm font-semibold text-red-700">{formatUAH(item.cost)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* ===== ДЕСКТОПНОЕ представление — таблица ===== */}
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
          <div className="px-3 lg:px-6 py-3 bg-gray-50 border-t flex flex-col gap-1 lg:flex-row lg:justify-end lg:gap-6">
            <span className="text-xs lg:text-sm font-semibold text-gray-700">
              {tr('total_materials_cost')} (Продажа): {formatUAH(totalAmount)}
            </span>
            {hasCostData && (
              <span className="text-xs lg:text-sm font-semibold text-red-700">
                Закупка: {formatUAH(totalCost)}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
