'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useCRM } from '@/lib/crm-context';
import { formatUAH } from '@/lib/crm-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import {
  CalendarRange,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Filter,
  Receipt,
  Inbox,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================
// PaymentCalendar — Динамический платёжный календарь
// Все данные вычисляются из orders[].calendarRows больше нет.
// Фичи: выбор месяца, фильтр по заказу, модалка реальной детализации
// ============================================================

type WeekKey = 'week1' | 'week2' | 'week3' | 'week4';
const ALL_WEEKS: WeekKey[] = ['week1', 'week2', 'week3', 'week4'];

// --- Определения месяцев (заголовки недель) ---
const monthDefinitions = [
  {
    value: '2026-05',
    labelRu: 'Май 2026',
    labelUkr: 'Травень 2026',
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
    weeks: [
      { key: 'week1' as WeekKey, label: 'Неделя 1', date: '01.07 — 07.07' },
      { key: 'week2' as WeekKey, label: 'Неделя 2', date: '08.07 — 14.07' },
      { key: 'week3' as WeekKey, label: 'Неделя 3', date: '15.07 — 21.07' },
      { key: 'week4' as WeekKey, label: 'Неделя 4', date: '22.07 — 28.07' },
    ],
  },
];

// --- Внутренние типы для вычисляемых данных ---

/** Необработанная запись: один денежный поток от одного заказа */
interface RawEntry {
  label: string;
  weekKey: WeekKey;
  amount: number;
  isIncome: boolean;
  orderId: string;
  orderName: string;
}

/** Вычисленная строка календаря с разбивкой по заказам для drill-down */
interface ComputedRow {
  id: string;
  label: string;
  week1: number;
  week2: number;
  week3: number;
  week4: number;
  isIncome: boolean;
  /** Разбивка каждой ячейки по заказам (для модалки детализации) */
  breakdown: Record<WeekKey, { orderId: string; orderName: string; amount: number }[]>;
}

/** Элемент таблицы детализации (drill-down) */
interface DrilldownItem {
  orderId: string;
  orderName: string;
  amount: number;
}

// --- Состояние модалки ---
interface DrilldownState {
  open: boolean;
  label: string;
  weekLabel: string;
  amount: number;
  isIncome: boolean;
  items: DrilldownItem[];
}

// ============================================================
// Хук: динамическое вычисление строк календаря из orders
// ============================================================
function useComputedCalendar(
  orders: { id: string; name: string; orderAmount: number; plannedCost: number; budgetItems: { name: string; tranches?: { week: number; amount: number }[] }[] }[],
  selectedOrderId: string,
  trLabel: (key: string) => string,
) {
  return useMemo(() => {
    // Шаг 1: собираем все сырые записи из заказов
    const entries: RawEntry[] = [];

    for (const order of orders) {
      // Фильтруем по заказу если нужно
      if (selectedOrderId !== 'all' && order.id !== selectedOrderId) continue;

      // --- ПОСТУПЛЕНИЯ ---
      // Аванс 30% на Неделю 1
      const advance = Math.round(order.orderAmount * 0.3);
      if (advance > 0) {
        entries.push({
          label: trLabel('income_advances'),
          weekKey: 'week1',
          amount: advance,
          isIncome: true,
          orderId: order.id,
          orderName: order.name,
        });
      }

      // Остаток 70% на Неделю 4
      const finalPayment = Math.round(order.orderAmount * 0.7);
      if (finalPayment > 0) {
        entries.push({
          label: trLabel('income_finals'),
          weekKey: 'week4',
          amount: finalPayment,
          isIncome: true,
          orderId: order.id,
          orderName: order.name,
        });
      }

      // --- ВЫПЛАТЫ ---
      // Материалы: plannedCost 50% Неделя 1, 50% Неделя 2
      const matHalf = Math.round(order.plannedCost * 0.5);
      if (matHalf > 0) {
        entries.push({
          label: trLabel('materials_expense'),
          weekKey: 'week1',
          amount: matHalf,
          isIncome: false,
          orderId: order.id,
          orderName: order.name,
        });
        entries.push({
          label: trLabel('materials_expense'),
          weekKey: 'week2',
          amount: matHalf,
          isIncome: false,
          orderId: order.id,
          orderName: order.name,
        });
      }

      // Транши из бюджетных статей
      for (const item of order.budgetItems) {
        if (!item.tranches || item.tranches.length === 0) continue;
        for (const tr of item.tranches) {
          const wk = `week${Math.min(tr.week, 4)}` as WeekKey;
          if (tr.amount > 0) {
            entries.push({
              label: item.name,
              weekKey: wk,
              amount: tr.amount,
              isIncome: false,
              orderId: order.id,
              orderName: order.name,
            });
          }
        }
      }
    }

    // Шаг 2: группируем по (label, isIncome) → ComputedRow
    const rowMap = new Map<string, ComputedRow>();
    let rowCounter = 0;

    for (const entry of entries) {
      const mapKey = `${entry.isIncome ? 'in' : 'out'}::${entry.label}`;
      let row = rowMap.get(mapKey);

      if (!row) {
        row = {
          id: `cal-${rowCounter++}`,
          label: entry.label,
          week1: 0,
          week2: 0,
          week3: 0,
          week4: 0,
          isIncome: entry.isIncome,
          breakdown: { week1: [], week2: [], week3: [], week4: [] },
        };
        rowMap.set(mapKey, row);
      }

      row[entry.weekKey] += entry.amount;
      row.breakdown[entry.weekKey].push({
        orderId: entry.orderId,
        orderName: entry.orderName,
        amount: entry.amount,
      });
    }

    // Устойчивый порядок: доходы сначала (Авансы, Окончательные), потом расходы
    const incomeOrder = [trLabel('income_advances'), trLabel('income_finals')];
    const sortedRows = Array.from(rowMap.values()).sort((a, b) => {
      if (a.isIncome !== b.isIncome) return a.isIncome ? -1 : 1;
      if (a.isIncome) {
        return incomeOrder.indexOf(a.label) - incomeOrder.indexOf(b.label);
      }
      return a.label.localeCompare(b.label);
    });

    return sortedRows;
  }, [orders, selectedOrderId, trLabel]);
}

// ============================================================
// Компонент PaymentCalendar
// ============================================================

export function PaymentCalendar() {
  const { orders, tr, lang } = useCRM();

  // --- State ---
  const [selectedMonth, setSelectedMonth] = useState('2026-05');
  const [selectedOrderId, setSelectedOrderId] = useState('all');
  const [drilldown, setDrilldown] = useState<DrilldownState>({
    open: false,
    label: '',
    weekLabel: '',
    amount: 0,
    isIncome: true,
    items: [],
  });

  // --- Текущий месяц ---
  const monthDef = monthDefinitions.find((m) => m.value === selectedMonth) || monthDefinitions[0];
  const weeks = monthDef.weeks;
  const monthLabel = lang === 'ukr' ? monthDef.labelUkr : monthDef.labelRu;

  // --- Динамическое вычисление строк ---
  const rows = useComputedCalendar(orders, selectedOrderId, tr);
  const incomeRows = rows.filter((r) => r.isIncome);
  const expenseRows = rows.filter((r) => !r.isIncome);

  // --- Итоги по неделям ---
  const totals = useMemo(() => {
    const totalIncome: Record<WeekKey, number> = { week1: 0, week2: 0, week3: 0, week4: 0 };
    const totalExpense: Record<WeekKey, number> = { week1: 0, week2: 0, week3: 0, week4: 0 };
    const balance: Record<WeekKey, number> = { week1: 0, week2: 0, week3: 0, week4: 0 };
    const incomeBreakdown: Record<WeekKey, { orderId: string; orderName: string; amount: number }[]> = {
      week1: [], week2: [], week3: [], week4: [],
    };
    const expenseBreakdown: Record<WeekKey, { orderId: string; orderName: string; amount: number }[]> = {
      week1: [], week2: [], week3: [], week4: [],
    };

    incomeRows.forEach((r) => {
      ALL_WEEKS.forEach((w) => {
        totalIncome[w] += r[w];
        incomeBreakdown[w].push(...r.breakdown[w]);
      });
    });
    expenseRows.forEach((r) => {
      ALL_WEEKS.forEach((w) => {
        totalExpense[w] += r[w];
        expenseBreakdown[w].push(...r.breakdown[w]);
      });
    });

    let running = 0;
    weeks.forEach((w) => {
      running += totalIncome[w.key] - totalExpense[w.key];
      balance[w.key] = running;
    });

    return { totalIncome, totalExpense, balance, incomeBreakdown, expenseBreakdown };
  }, [incomeRows, expenseRows, weeks]);

  // --- Drilldown с реальными данными ---
  const openDrilldown = useCallback(
    (label: string, weekLabel: string, weekKey: WeekKey, isIncome: boolean, items: DrilldownItem[]) => {
      const amount = items.reduce((s, i) => s + i.amount, 0);
      if (amount <= 0) return;
      setDrilldown({ open: true, label, weekLabel, amount, isIncome, items });
    },
    []
  );

  const closeDrilldown = useCallback(() => {
    setDrilldown((prev) => ({ ...prev, open: false }));
  }, []);

  const hasData = rows.length > 0 && rows.some(
    (r) => r.week1 > 0 || r.week2 > 0 || r.week3 > 0 || r.week4 > 0
  );

  return (
    <div className="space-y-4">
      <Card className="bg-white shadow-sm hover:shadow-md transition-all duration-200">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <CalendarRange className="w-4.5 h-4.5 text-gray-500" />
              {tr('calendar_title')} — {monthLabel}
            </CardTitle>

            {/* Фильтры */}
            <div className="flex items-center gap-2 flex-wrap">
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

              <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                <SelectTrigger className="w-[220px] h-9 text-xs border-gray-200">
                  <Filter className="w-3.5 h-3.5 text-gray-400 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    {tr('all_orders')}
                  </SelectItem>
                  {orders.map((o) => (
                    <SelectItem key={o.id} value={o.id} className="text-xs">
                      <span className="font-mono font-semibold">{o.id}</span>
                      <span className="mx-1.5 text-gray-300">·</span>
                      <span className="truncate max-w-[160px]">{o.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {!hasData ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                <Inbox className="w-7 h-7 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">
                {selectedOrderId !== 'all' ? tr('no_data_for_filter') : tr('no_data_for_month')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                {/* Заголовки */}
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 w-[240px]">
                      {tr('article')}
                    </th>
                    {weeks.map((w) => (
                      <th key={w.key} className="text-right px-4 py-3 min-w-[130px]">
                        <div className="text-xs font-semibold text-gray-700">{w.label}</div>
                        <div className="text-[10px] text-gray-400 font-normal">{w.date}</div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {/* === Поступления === */}
                  <tr className="bg-emerald-50/50">
                    <td colSpan={5} className="px-4 py-2 text-xs font-bold text-emerald-700 uppercase tracking-wider">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5" />
                        {tr('income')}
                      </div>
                    </td>
                  </tr>
                  {incomeRows.map((row) => (
                    <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-4 py-2.5 text-sm text-gray-700">{row.label}</td>
                      {weeks.map((w) => (
                        <td
                          key={w.key}
                          onClick={() => openDrilldown(row.label, w.label, w.key, true, row.breakdown[w.key])}
                          className={cn(
                            'px-4 py-2.5 text-sm text-right font-medium transition-all duration-150',
                            row[w.key] > 0
                              ? 'text-emerald-700 cursor-pointer hover:bg-emerald-50 hover:underline decoration-emerald-400 decoration-dotted underline-offset-4 rounded-sm'
                              : 'text-gray-300'
                          )}
                        >
                          {row[w.key] > 0 ? formatUAH(row[w.key]) : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}

                  {/* Итого поступления */}
                  <tr className="bg-emerald-50/80 border-b border-emerald-200">
                    <td className="px-4 py-2.5 text-sm font-bold text-emerald-800">
                      {tr('total_income')}
                    </td>
                    {weeks.map((w) => (
                      <td
                        key={w.key}
                        onClick={() => openDrilldown(tr('total_income'), w.label, w.key, true, totals.incomeBreakdown[w.key])}
                        className={cn(
                          'px-4 py-2.5 text-sm text-right font-bold transition-all duration-150',
                          totals.totalIncome[w.key] > 0
                            ? 'text-emerald-800 cursor-pointer hover:bg-emerald-100/60 hover:underline decoration-emerald-500 decoration-dotted underline-offset-4 rounded-sm'
                            : 'text-gray-300'
                        )}
                      >
                        {totals.totalIncome[w.key] > 0 ? formatUAH(totals.totalIncome[w.key]) : '—'}
                      </td>
                    ))}
                  </tr>

                  {/* === Выплаты === */}
                  <tr className="bg-red-50/50">
                    <td colSpan={5} className="px-4 py-2 text-xs font-bold text-red-700 uppercase tracking-wider">
                      <div className="flex items-center gap-1.5">
                        <TrendingDown className="w-3.5 h-3.5" />
                        {tr('expenses')}
                      </div>
                    </td>
                  </tr>
                  {expenseRows.map((row) => (
                    <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-4 py-2.5 text-sm text-gray-700">{row.label}</td>
                      {weeks.map((w) => (
                        <td
                          key={w.key}
                          onClick={() => openDrilldown(row.label, w.label, w.key, false, row.breakdown[w.key])}
                          className={cn(
                            'px-4 py-2.5 text-sm text-right font-medium transition-all duration-150',
                            row[w.key] > 0
                              ? 'text-red-600 cursor-pointer hover:bg-red-50 hover:underline decoration-red-400 decoration-dotted underline-offset-4 rounded-sm'
                              : 'text-gray-300'
                          )}
                        >
                          {row[w.key] > 0 ? formatUAH(row[w.key]) : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}

                  {/* Итого выплаты */}
                  <tr className="bg-red-50/80 border-b border-red-200">
                    <td className="px-4 py-2.5 text-sm font-bold text-red-800">
                      {tr('total_expenses')}
                    </td>
                    {weeks.map((w) => (
                      <td
                        key={w.key}
                        onClick={() => openDrilldown(tr('total_expenses'), w.label, w.key, false, totals.expenseBreakdown[w.key])}
                        className={cn(
                          'px-4 py-2.5 text-sm text-right font-bold transition-all duration-150',
                          totals.totalExpense[w.key] > 0
                            ? 'text-red-800 cursor-pointer hover:bg-red-100/60 hover:underline decoration-red-500 decoration-dotted underline-offset-4 rounded-sm'
                            : 'text-gray-300'
                        )}
                      >
                        {totals.totalExpense[w.key] > 0 ? formatUAH(totals.totalExpense[w.key]) : '—'}
                      </td>
                    ))}
                  </tr>

                  {/* === БАЛАНС (кумулятивный) === */}
                  <tr className="border-b-2 border-gray-300">
                    <td colSpan={5} className="px-4 py-2 text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-100">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {tr('cumulative_balance')}
                      </div>
                    </td>
                  </tr>
                  <tr className="border-b-2 border-gray-300">
                    <td className="px-4 py-4 text-sm font-bold text-gray-700">
                      {tr('balance')}
                    </td>
                    {weeks.map((w) => {
                      const isNegative = totals.balance[w.key] < 0;
                      return (
                        <td
                          key={w.key}
                          className={cn(
                            'px-4 py-4 text-sm text-right transition-colors',
                            isNegative ? 'bg-red-100' : 'bg-emerald-50/50'
                          )}
                        >
                          <span className={cn('text-lg font-bold', isNegative ? 'text-red-700' : 'text-emerald-700')}>
                            {formatUAH(totals.balance[w.key])}
                          </span>
                          {isNegative && (
                            <div className="flex items-center justify-end gap-1 mt-0.5">
                              <AlertTriangle className="w-3 h-3 text-red-500" />
                              <span className="text-[10px] font-semibold text-red-600">
                                {tr('cash_gap')}
                              </span>
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

      {/* ===== МОДАЛКА ДЕТАЛИЗАЦИИ (реальные данные из orders) ===== */}
      <Dialog open={drilldown.open} onOpenChange={(open) => !open && closeDrilldown()}>
        <DialogContent className="sm:max-w-[560px] p-0 gap-0 overflow-hidden">
          <div
            className={cn(
              'px-6 pt-6 pb-4',
              drilldown.isIncome
                ? 'bg-gradient-to-r from-emerald-50 to-emerald-100/50 border-b border-emerald-200'
                : 'bg-gradient-to-r from-red-50 to-red-100/50 border-b border-red-200'
            )}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-base">
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center',
                    drilldown.isIncome
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-red-100 text-red-600'
                  )}
                >
                  <Receipt className="w-4 h-4" />
                </div>
                <span>
                  {tr('detail_title')}: {drilldown.label}
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 ml-[42px]">
                {drilldown.weekLabel} · {formatUAH(drilldown.amount)}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 py-4">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-100 hover:bg-transparent">
                  <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {tr('drilldown_order')}
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                    {tr('drilldown_amount')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drilldown.items.map((item, idx) => (
                  <TableRow key={`${item.orderId}-${idx}`} className="border-gray-50">
                    <TableCell className="py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-mono font-semibold text-gray-900">
                          {item.orderId}
                        </span>
                        <span className="text-[11px] text-gray-500 truncate max-w-[300px]">
                          {item.orderName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatUAH(item.amount)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="bg-gray-50/80 border-t-2 border-gray-200 hover:bg-transparent">
                  <TableCell className="py-3">
                    <span className="text-sm font-bold text-gray-700">{tr('drilldown_total')}</span>
                  </TableCell>
                  <TableCell className="py-3 text-right">
                    <span className="text-sm font-bold text-gray-900">
                      {formatUAH(drilldown.items.reduce((s, i) => s + i.amount, 0))}
                    </span>
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
            <Button variant="outline" size="sm" onClick={closeDrilldown} className="text-xs">
              Закрыть
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
