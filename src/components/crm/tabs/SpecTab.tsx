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
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Database className="w-4.5 h-4.5 text-gray-500" />
          {tr('material')} (из 1С)
          <span className="text-xs font-normal text-gray-400 ml-1">— {tr('spec_readonly')}</span>
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
        )}

        {/* Итого */}
        {order.specItems.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 border-t flex justify-end gap-6">
            <span className="text-sm font-semibold text-gray-700">
              {tr('total_materials_cost')} (Продажа): {formatUAH(totalAmount)}
            </span>
            {hasCostData && (
              <span className="text-sm font-semibold text-red-700">
                Закупка: {formatUAH(totalCost)}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
