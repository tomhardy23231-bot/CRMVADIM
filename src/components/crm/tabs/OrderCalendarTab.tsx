'use client';

import React, { useState, useMemo } from 'react';
import type { Order } from '@/lib/crm-types';
import { useCRM } from '@/lib/crm-context';
import { formatUAH } from '@/lib/crm-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarRange, TrendingUp, TrendingDown, AlertTriangle, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================
// OrderCalendarTab — Локальный платёжный календарь для одного заказа
// Фичи: выбор месяца, микро-экономика проекта по неделям
// ============================================================

type WeekKey = 'week1' | 'week2' | 'week3' | 'week4';

const monthDefinitions = [
  {
    value: '2026-05',
    labelRu: 'Май 2026',
    labelUkr: 'Травень 2026',
    multiplier: 1.0,
    weeks: [
      { key: 'week1' as WeekKey, label: 'Неделя 1', date: '01.05 — 07.05' },
      { key: 'week2' as WeekKey, label: 'Неделя 2', date: '08.05 — 14.05' },
      { key: 'week3' as WeekKey, label: 'Неделя 3', date: '15.05 — 21.05' },
      { key: 'week4' as WeekKey, label: 'Неделя 4', date: '22.05 — 28.05' },
    ],
  },
  {
    value: '2026-06',
    labelRu: 'Июнь 2026',
    labelUkr: 'Червень 2026',
    multiplier: 0.65,
    weeks: [
      { key: 'week1' as WeekKey, label: 'Неделя 1', date: '01.06 — 07.06' },
      { key: 'week2' as WeekKey, label: 'Неделя 2', date: '08.06 — 14.06' },
      { key: 'week3' as WeekKey, label: 'Неделя 3', date: '15.06 — 21.06' },
      { key: 'week4' as WeekKey, label: 'Неделя 4', date: '22.06 — 28.06' },
    ],
  },
  {
    value: '2026-07',
    labelRu: 'Июль 2026',
    labelUkr: 'Липень 2026',
    multiplier: 0.3,
    weeks: [
      { key: 'week1' as WeekKey, label: 'Неделя 1', date: '01.07 — 07.07' },
      { key: 'week2' as WeekKey, label: 'Неделя 2', date: '08.07 — 14.07' },
      { key: 'week3' as WeekKey, label: 'Неделя 3', date: '15.07 — 21.07' },
      { key: 'week4' as WeekKey, label: 'Неделя 4', date: '22.07 — 28.07' },
    ],
  },
];

interface OrderCalendarTabProps {
  order: Order;
}

export function OrderCalendarTab({ order }: OrderCalendarTabProps) {
  const { tr, lang } = useCRM();
  const [selectedMonth, setSelectedMonth] = useState('2026-05');

  const monthDef = monthDefinitions.find((m) => m.value === selectedMonth) || monthDefinitions[0];
  const weeks = monthDef.weeks;
  const monthLabel = lang === 'ukr' ? monthDef.labelUkr : monthDef.labelRu;
  const multiplier = monthDef.multiplier;

  // --- Данные заказа ---
  const data = useMemo(() => {
    const advancePayment = Math.round(order.orderAmount * 0.3);
    const finalPayment = Math.round(order.orderAmount * 0.7);
    const totalIncome: Record<WeekKey, number> = { week1: 0, week2: 0, week3: 0, week4: 0 };
    totalIncome.week1 = advancePayment;
    totalIncome.week4 = finalPayment;

    const totalExpense: Record<WeekKey, number> = { week1: 0, week2: 0, week3: 0, week4: 0 };

    // Собираем расходы из траншей всех бюджетных статей
    order.budgetItems.forEach((item) => {
      if (item.tranches) {
        item.tranches.forEach((tr) => {
          const weekKey = `week${tr.week}` as WeekKey;
          if (weekKey in totalExpense) {
            totalExpense[weekKey] += tr.amount;
          }
        });
      }
    });

    // Добавляем себестоимость материалов
    const materialCost = order.plannedCost;
    totalExpense.week1 += Math.round(materialCost * 0.5);
    totalExpense.week2 += Math.round(materialCost * 0.5);

    // Масштабирование
    if (multiplier !== 1.0) {
      (Object.keys(totalIncome) as WeekKey[]).forEach((w) => {
        totalIncome[w] = Math.round(totalIncome[w] * multiplier);
        totalExpense[w] = Math.round(totalExpense[w] * multiplier);
      });
    }

    // Кумулятивный баланс
    const balance: Record<WeekKey, number> = { week1: 0, week2: 0, week3: 0, week4: 0 };
    let running = 0;
    (Object.keys(balance) as WeekKey[]).forEach((w) => {
      running += totalIncome[w] - totalExpense[w];
      balance[w] = running;
    });

    return { totalIncome, totalExpense, balance };
  }, [order, multiplier]);

  const hasAnyData = weeks.some(
    (w) => data.totalIncome[w.key] > 0 || data.totalExpense[w.key] > 0
  );

  return (
    <Card className="bg-white shadow-sm hover:shadow-md transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <CalendarRange className="w-4.5 h-4.5 text-gray-500" />
            {tr('tab_calendar')} — {order.id}
          </CardTitle>

          {/* Выбор месяца */}
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[160px] h-9 text-xs border-gray-200">
              <CalendarRange className="w-3.5 h-3.5 text-gray-400 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthDefinitions.map((m) => (
                <SelectItem key={m.value} value={m.value} className="text-xs">
                  {lang === 'ukr' ? m.labelUkr : m.labelRu}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {!hasAnyData ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
              <Inbox className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">{tr('no_data_for_month')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 w-[220px]">
                    {tr('article')}
                  </th>
                  {weeks.map((w) => (
                    <th key={w.key} className="text-right px-4 py-3 min-w-[120px]">
                      <div className="text-xs font-semibold text-gray-700">{w.label}</div>
                      <div className="text-[10px] text-gray-400">{w.date}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Поступления */}
                <tr className="bg-emerald-50/50">
                  <td colSpan={5} className="px-4 py-2 text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      {tr('income')}
                    </div>
                  </td>
                </tr>
                <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5 text-sm text-gray-700">Аванс (30%)</td>
                  {weeks.map((w) => (
                    <td key={w.key} className="px-4 py-2.5 text-sm text-right text-emerald-700 font-medium">
                      {data.totalIncome[w.key] > 0 ? formatUAH(data.totalIncome[w.key]) : '—'}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5 text-sm text-gray-700">Окончательная оплата (70%)</td>
                  {weeks.map((w) => (
                    <td key={w.key} className="px-4 py-2.5 text-sm text-right text-emerald-700 font-medium">
                      {w.key === 'week4' && data.totalIncome.week4 > 0
                        ? formatUAH(data.totalIncome.week4)
                        : '—'}
                    </td>
                  ))}
                </tr>
                <tr className="bg-emerald-50/80 border-b border-emerald-200">
                  <td className="px-4 py-2.5 text-sm font-bold text-emerald-800">{tr('total_income')}</td>
                  {weeks.map((w) => (
                    <td key={w.key} className="px-4 py-2.5 text-sm text-right font-bold text-emerald-800">
                      {data.totalIncome[w.key] > 0 ? formatUAH(data.totalIncome[w.key]) : '—'}
                    </td>
                  ))}
                </tr>

                {/* Выплаты */}
                <tr className="bg-red-50/50">
                  <td colSpan={5} className="px-4 py-2 text-xs font-bold text-red-700 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <TrendingDown className="w-3.5 h-3.5" />
                      {tr('expenses')}
                    </div>
                  </td>
                </tr>
                <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5 text-sm text-gray-700">Материалы (себестоимость)</td>
                  {weeks.map((w) => (
                    <td key={w.key} className="px-4 py-2.5 text-sm text-right text-red-600 font-medium">
                      {data.totalExpense[w.key] > 0 ? formatUAH(data.totalExpense[w.key]) : '—'}
                    </td>
                  ))}
                </tr>
                <tr className="bg-red-50/80 border-b border-red-200">
                  <td className="px-4 py-2.5 text-sm font-bold text-red-800">{tr('total_expenses')}</td>
                  {weeks.map((w) => (
                    <td key={w.key} className="px-4 py-2.5 text-sm text-right font-bold text-red-800">
                      {data.totalExpense[w.key] > 0 ? formatUAH(data.totalExpense[w.key]) : '—'}
                    </td>
                  ))}
                </tr>

                {/* Баланс */}
                <tr className="border-b-2 border-gray-300">
                  <td colSpan={5} className="px-4 py-2 text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-100">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {tr('cumulative_balance')}
                    </div>
                  </td>
                </tr>
                <tr className="border-b-2 border-gray-300">
                  <td className="px-4 py-4 text-sm font-bold text-gray-700">{tr('balance')}</td>
                  {weeks.map((w) => {
                    const isNeg = data.balance[w.key] < 0;
                    return (
                      <td
                        key={w.key}
                        className={cn(
                          'px-4 py-4 text-sm text-right transition-colors',
                          isNeg ? 'bg-red-100' : 'bg-emerald-50/50'
                        )}
                      >
                        <span className={cn('text-lg font-bold', isNeg ? 'text-red-700' : 'text-emerald-700')}>
                          {formatUAH(data.balance[w.key])}
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
