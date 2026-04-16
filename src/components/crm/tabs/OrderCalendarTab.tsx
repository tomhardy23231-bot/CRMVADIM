'use client';

import React, { useMemo } from 'react';
import type { Order } from '@/lib/crm-types';
import { useCRM } from '@/lib/crm-context';
import { formatUAH, formatWeekStr } from '@/lib/crm-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarRange, TrendingUp, TrendingDown, AlertTriangle, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderCalendarTabProps {
  order: Order;
}

export function OrderCalendarTab({ order }: OrderCalendarTabProps) {
  const { tr, lang } = useCRM();

  // Собираем все периоды (недели), в которых есть транши
  const projectWeeks = useMemo(() => {
    const weeks = new Set<string>();
    
    order.budgetItems.forEach(item => {
      item.tranches?.forEach(t => weeks.add(t.month));
    });

    // Сортируем
    return Array.from(weeks).sort();
  }, [order]);

  // Данные заказа: считаем доходы и расходы из плановых траншей
  const data = useMemo(() => {
    const totalIncome: Record<string, number> = {};
    const totalExpense: Record<string, number> = {};
    projectWeeks.forEach(w => {
      totalIncome[w] = 0;
      totalExpense[w] = 0;
    });

    order.budgetItems.forEach((item) => {
      if (item.tranches) {
        item.tranches.forEach((tr) => {
          if (item.isIncome) {
             totalIncome[tr.month] = (totalIncome[tr.month] || 0) + tr.amount;
          } else {
             totalExpense[tr.month] = (totalExpense[tr.month] || 0) + tr.amount;
          }
        });
      }
    });

    // Кумулятивный баланс
    const balance: Record<string, number> = {};
    let running = 0;
    projectWeeks.forEach((w) => {
      running += totalIncome[w] - totalExpense[w];
      balance[w] = running;
    });

    return { totalIncome, totalExpense, balance };
  }, [order, projectWeeks]);

  const hasAnyData = projectWeeks.length > 0;

  return (
    <Card className="bg-white shadow-sm hover:shadow-md transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <CalendarRange className="w-4.5 h-4.5 text-gray-500" />
            {tr('tab_calendar')} — {order.id}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {!hasAnyData ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
              <Inbox className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">Нет добавленных траншей для построения календаря.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 w-[220px]">
                    {tr('article')}
                  </th>
                  {projectWeeks.map((w) => (
                    <th key={w} className="text-right px-4 py-3 min-w-[120px]">
                      <div className="text-xs font-semibold text-gray-700 whitespace-pre-wrap">{formatWeekStr(w, lang)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Поступления */}
                <tr className="bg-emerald-50/50">
                  <td colSpan={projectWeeks.length + 1} className="px-4 py-2 text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      {tr('income')} (План)
                    </div>
                  </td>
                </tr>
                {order.budgetItems.filter(b => b.isIncome && b.hasTranches).map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 text-sm text-gray-700">{item.name}</td>
                    {projectWeeks.map((w) => {
                        const trAmount = item.tranches?.find(t => t.month === w)?.amount || 0;
                        return (
                          <td key={w} className="px-4 py-2.5 text-sm text-right text-emerald-700 font-medium">
                            {trAmount > 0 ? formatUAH(trAmount) : '—'}
                          </td>
                        );
                    })}
                  </tr>
                ))}
                <tr className="bg-emerald-50/80 border-b border-emerald-200">
                  <td className="px-4 py-2.5 text-sm font-bold text-emerald-800">{tr('total_income')}</td>
                  {projectWeeks.map((w) => (
                    <td key={w} className="px-4 py-2.5 text-sm text-right font-bold text-emerald-800">
                      {data.totalIncome[w] > 0 ? formatUAH(data.totalIncome[w]) : '—'}
                    </td>
                  ))}
                </tr>

                {/* Выплаты */}
                <tr className="bg-red-50/50">
                  <td colSpan={projectWeeks.length + 1} className="px-4 py-2 text-xs font-bold text-red-700 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <TrendingDown className="w-3.5 h-3.5" />
                      {tr('expenses')} (План)
                    </div>
                  </td>
                </tr>
                {order.budgetItems.filter(b => !b.isIncome && b.hasTranches).map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 text-sm text-gray-700">{item.name}</td>
                    {projectWeeks.map((w) => {
                        const trAmount = item.tranches?.find(t => t.month === w)?.amount || 0;
                        return (
                          <td key={w} className="px-4 py-2.5 text-sm text-right text-red-600 font-medium">
                            {trAmount > 0 ? formatUAH(trAmount) : '—'}
                          </td>
                        );
                    })}
                  </tr>
                ))}
                <tr className="bg-red-50/80 border-b border-red-200">
                  <td className="px-4 py-2.5 text-sm font-bold text-red-800">{tr('total_expenses')}</td>
                  {projectWeeks.map((w) => (
                    <td key={w} className="px-4 py-2.5 text-sm text-right font-bold text-red-800">
                      {data.totalExpense[w] > 0 ? formatUAH(data.totalExpense[w]) : '—'}
                    </td>
                  ))}
                </tr>

                {/* Баланс */}
                <tr className="border-b-2 border-gray-300">
                  <td colSpan={projectWeeks.length + 1} className="px-4 py-2 text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-100">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {tr('cumulative_balance')}
                    </div>
                  </td>
                </tr>
                <tr className="border-b-2 border-gray-300">
                  <td className="px-4 py-4 text-sm font-bold text-gray-700">{tr('balance')}</td>
                  {projectWeeks.map((w) => {
                    const isNeg = data.balance[w] < 0;
                    return (
                      <td
                        key={w}
                        className={cn(
                          'px-4 py-4 text-sm text-right transition-colors',
                          isNeg ? 'bg-red-100' : 'bg-emerald-50/50'
                        )}
                      >
                        <span className={cn('text-lg font-bold', isNeg ? 'text-red-700' : 'text-emerald-700')}>
                          {formatUAH(data.balance[w])}
                        </span>
                        {isNeg && (
                          <div className="flex items-center justify-end gap-1 mt-0.5">
                            <AlertTriangle className="w-3 h-3 text-red-500" />
                            <span className="text-[10px] font-semibold text-red-600">{tr('cash_gap')}</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
