'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useCRM } from '@/lib/crm-context';
import { formatUAH, formatWeekStr, generateWeekOptions } from '@/lib/crm-utils';
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
} from '@/components/ui/table';
import {
  CalendarRange,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Filter,
  Receipt,
  Inbox,
  XIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================
// PaymentCalendar — Динамический глобальный платёжный календарь
// Показывает следующие 12 недель (понедельный Cash Flow).
// Имеет «липкую» первую колонку (Premium UX).
// ============================================================

interface DrilldownItem {
  orderId: string;
  orderName: string;
  amount: number;
}

interface DrilldownState {
  open: boolean;
  label: string;
  monthLabel: string;
  amount: number;
  isIncome: boolean;
  items: DrilldownItem[];
}

export function PaymentCalendar() {
  const { orders, tr, lang } = useCRM();

  const [selectedOrderId, setSelectedOrderId] = useState('all');
  const [drilldown, setDrilldown] = useState<DrilldownState>({
    open: false, label: '', monthLabel: '', amount: 0, isIncome: true, items: [],
  });

  // --- 12 недель (динамические из utils) ---
  const displayMonths = useMemo(() => {
    return generateWeekOptions(lang).map(opt => opt.value);
  }, [lang]);

  // --- Агрегация строк по неделям ---
  const rows = useMemo(() => {
      const map = new Map<string, { id: string, label: string, isIncome: boolean, byMonth: Record<string, number>, breakdown: Record<string, DrilldownItem[]> }>();
      let idCounter = 0;

      for (const order of orders) {
          if (selectedOrderId !== 'all' && order.id !== selectedOrderId) continue;
          
          for (const item of order.budgetItems) {
              if (!item.tranches) continue;
              for (const tr of item.tranches) {
                 if (tr.amount <= 0) continue;
                 
                 const key = `${item.isIncome ? 'in' : 'out'}::${item.name}`;
                 if (!map.has(key)) {
                    map.set(key, { id: `row-${idCounter++}`, label: item.name, isIncome: !!item.isIncome, byMonth: {}, breakdown: {} });
                 }
                 const row = map.get(key)!;
                 if (!row.byMonth[tr.month]) row.byMonth[tr.month] = 0;
                 row.byMonth[tr.month] += tr.amount;
                 
                 if (!row.breakdown[tr.month]) row.breakdown[tr.month] = [];
                 row.breakdown[tr.month].push({ orderId: order.externalId || order.id.slice(0, 8), orderName: order.name, amount: tr.amount });
              }
          }
      }
      
      const sorted = Array.from(map.values()).sort((a, b) => {
          if (a.isIncome !== b.isIncome) return a.isIncome ? -1 : 1;
          return a.label.localeCompare(b.label);
      });

      return sorted;
  }, [orders, selectedOrderId]);

  const incomeRows = rows.filter(r => r.isIncome);
  const expenseRows = rows.filter(r => !r.isIncome);

  // --- Итоги ---
  const totals = useMemo(() => {
    const totalIncome: Record<string, number> = {};
    const totalExpense: Record<string, number> = {};
    const balance: Record<string, number> = {};
    const incomeBreakdown: Record<string, DrilldownItem[]> = {};
    const expenseBreakdown: Record<string, DrilldownItem[]> = {};

    displayMonths.forEach(m => {
        totalIncome[m] = 0;
        totalExpense[m] = 0;
        incomeBreakdown[m] = [];
        expenseBreakdown[m] = [];
    });

    incomeRows.forEach(r => {
        displayMonths.forEach(m => {
            if (r.byMonth[m]) totalIncome[m] += r.byMonth[m];
            if (r.breakdown[m]) incomeBreakdown[m].push(...r.breakdown[m]);
        });
    });
    expenseRows.forEach(r => {
        displayMonths.forEach(m => {
            if (r.byMonth[m]) totalExpense[m] += r.byMonth[m];
            if (r.breakdown[m]) expenseBreakdown[m].push(...r.breakdown[m]);
        });
    });

    let running = 0;
    displayMonths.forEach(m => {
        running += totalIncome[m] - totalExpense[m];
        balance[m] = running;
    });

    return { totalIncome, totalExpense, balance, incomeBreakdown, expenseBreakdown };
  }, [incomeRows, expenseRows, displayMonths]);

  const openDrilldown = useCallback(
    (label: string, monthLabel: string, isIncome: boolean, items: DrilldownItem[] | undefined) => {
      const validItems = items || [];
      const amount = validItems.reduce((s, i) => s + i.amount, 0);
      if (amount <= 0) return;
      setDrilldown({ open: true, label, monthLabel, amount, isIncome, items: validItems });
    },
    []
  );

  const closeDrilldown = useCallback(() => {
    setDrilldown((prev) => ({ ...prev, open: false }));
  }, []);

  const hasData = displayMonths.some(
    m => totals.totalIncome[m] > 0 || totals.totalExpense[m] > 0
  );

  // Классы для первой «липкой» колонки
  const stickyColClass = "sticky left-0 z-10 w-[240px] max-w-[240px] shadow-[2px_0_4px_rgba(0,0,0,0.02)]";

  return (
    <div className="space-y-4">
      <Card className="bg-white shadow-sm hover:shadow-md transition-all duration-200 border-none ring-1 ring-gray-100">
        <CardHeader className="pb-3 border-b border-gray-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-800">
              <CalendarRange className="w-5 h-5 text-emerald-600" />
              Глобальный Платёжный Календарь
            </CardTitle>

            <div className="flex items-center gap-2 flex-wrap">
              <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                <SelectTrigger className="w-[240px] h-9 text-xs border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                  <Filter className="w-3.5 h-3.5 text-gray-400 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    {tr('all_orders')}
                  </SelectItem>
                  {orders.map((o) => (
                    <SelectItem key={o.id} value={o.id} className="text-xs">
                      <span className="font-mono font-semibold">{o.externalId || o.id.slice(0, 8)}</span>
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
            <div className="flex flex-col items-center justify-center py-20 bg-gradient-to-b from-transparent to-gray-50/30">
               <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center mb-4 relative">
                <Inbox className="w-8 h-8 text-gray-300" />
                <div className="absolute inset-0 bg-gradient-to-tr from-white/40 to-transparent rounded-2xl"></div>
              </div>
              <p className="text-sm font-medium text-gray-500">
                Нет запланированных финансовых движений на ближайшие 12 недель.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full min-w-[1200px] border-collapse relative">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className={cn("bg-white text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 z-20", stickyColClass)}>
                      {tr('article')}
                    </th>
                    {displayMonths.map((m) => (
                      <th key={m} className="text-right px-4 py-3 min-w-[140px] bg-white">
                        <div className="text-xs font-bold text-gray-700 uppercase whitespace-pre-wrap">{formatWeekStr(m, lang)}</div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {/* === Поступления === */}
                  <tr className="bg-emerald-50/70 border-b border-emerald-100/50">
                    <td className={cn("bg-emerald-50 text-xs font-bold text-emerald-800 uppercase tracking-wider px-4 py-3", stickyColClass)}>
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4" />
                        {tr('income')}
                      </div>
                    </td>
                    <td className="bg-emerald-50/70" colSpan={displayMonths.length}></td>
                  </tr>
                  
                  {incomeRows.map((row) => (
                    <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50/80 transition-colors duration-150">
                      <td className={cn("bg-white px-4 py-3 text-sm font-medium text-gray-800 border-r border-gray-50", stickyColClass)}>
                        <span className="truncate block max-w-[220px]">{row.label}</span>
                      </td>
                      {displayMonths.map((m) => {
                        const val = row.byMonth[m] || 0;
                        return (
                          <td
                            key={m}
                            onClick={() => openDrilldown(row.label, formatWeekStr(m, lang).replace('\n',''), true, row.breakdown[m])}
                            className={cn(
                              'px-4 py-3 text-sm text-right font-semibold transition-all duration-150',
                              val > 0
                                ? 'text-emerald-700 cursor-pointer hover:bg-emerald-50 hover:underline decoration-emerald-200 decoration-dotted underline-offset-4 rounded-sm'
                                : 'text-gray-300 font-medium'
                            )}
                          >
                            {val > 0 ? formatUAH(val) : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {/* Итого поступления */}
                  <tr className="bg-emerald-100/40 border-b border-emerald-200/60">
                    <td className={cn("bg-emerald-50/80 px-4 py-3 text-sm font-bold text-emerald-900 border-r border-emerald-100/50", stickyColClass)}>
                      {tr('total_income')}
                    </td>
                    {displayMonths.map((m) => {
                      const val = totals.totalIncome[m];
                      return (
                        <td
                          key={m}
                          onClick={() => openDrilldown(tr('total_income'), formatWeekStr(m, lang).replace('\n',''), true, totals.incomeBreakdown[m])}
                          className={cn(
                            'px-4 py-3 text-sm text-right font-bold transition-all duration-150 bg-emerald-100/40',
                            val > 0
                              ? 'text-emerald-900 cursor-pointer hover:bg-emerald-200/50 hover:underline decoration-emerald-400 decoration-dotted underline-offset-4 rounded-sm'
                              : 'text-emerald-700/40'
                          )}
                        >
                          {val > 0 ? formatUAH(val) : '—'}
                        </td>
                      );
                    })}
                  </tr>

                  {/* === Выплаты === */}
                  <tr className="bg-red-50/70 border-b border-red-100/50">
                    <td className={cn("bg-red-50 text-xs font-bold text-red-800 uppercase tracking-wider px-4 py-3", stickyColClass)}>
                       <div className="flex items-center gap-1.5">
                        <TrendingDown className="w-4 h-4" />
                        {tr('expenses')}
                      </div>
                    </td>
                    <td className="bg-red-50/70" colSpan={displayMonths.length}></td>
                  </tr>

                  {expenseRows.map((row) => (
                    <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50/80 transition-colors duration-150">
                      <td className={cn("bg-white px-4 py-3 text-sm font-medium text-gray-800 border-r border-gray-50", stickyColClass)}>
                         <span className="truncate block max-w-[220px]">{row.label}</span>
                      </td>
                      {displayMonths.map((m) => {
                         const val = row.byMonth[m] || 0;
                         return (
                          <td
                            key={m}
                            onClick={() => openDrilldown(row.label, formatWeekStr(m, lang).replace('\n',''), false, row.breakdown[m])}
                            className={cn(
                              'px-4 py-3 text-sm text-right font-medium transition-all duration-150',
                              val > 0
                                ? 'text-red-600 cursor-pointer hover:bg-red-50 hover:underline decoration-red-200 decoration-dotted underline-offset-4 rounded-sm font-semibold'
                                : 'text-gray-300'
                            )}
                          >
                            {val > 0 ? formatUAH(val) : '—'}
                          </td>
                         )
                      })}
                    </tr>
                  ))}

                  {/* Итого выплаты */}
                  <tr className="bg-red-100/40 border-b border-red-200/60">
                    <td className={cn("bg-red-50/60 px-4 py-3 text-sm font-bold text-red-900 border-r border-red-100/50", stickyColClass)}>
                      {tr('total_expenses')}
                    </td>
                    {displayMonths.map((m) => {
                       const val = totals.totalExpense[m];
                       return (
                        <td
                          key={m}
                          onClick={() => openDrilldown(tr('total_expenses'), formatWeekStr(m, lang).replace('\n',''), false, totals.expenseBreakdown[m])}
                          className={cn(
                            'px-4 py-3 text-sm text-right font-bold transition-all duration-150 bg-red-100/40',
                            val > 0
                              ? 'text-red-900 cursor-pointer hover:bg-red-200/50 hover:underline decoration-red-400 decoration-dotted underline-offset-4 rounded-sm'
                              : 'text-red-700/40'
                          )}
                        >
                          {val > 0 ? formatUAH(val) : '—'}
                        </td>
                      )
                    })}
                  </tr>

                  {/* === БАЛАНС === */}
                  <tr className="border-t-[3px] border-gray-300 bg-gray-100/80">
                    <td className={cn("bg-gray-100 px-4 py-4 border-r border-gray-200", stickyColClass)}>
                      <div className="flex items-center gap-1.5 text-sm font-bold text-gray-800">
                        <AlertTriangle className="w-4 h-4 text-gray-500" />
                        {tr('balance')}
                      </div>
                    </td>
                    {displayMonths.map((m) => {
                      const isNegative = totals.balance[m] < 0;
                      return (
                        <td
                          key={m}
                          className={cn(
                            'px-4 py-4 text-sm text-right transition-colors border-l border-white/50',
                            isNegative ? 'bg-red-100/80' : 'bg-emerald-50/80'
                          )}
                        >
                          <span className={cn('text-lg font-black tracking-tight', isNegative ? 'text-red-700' : 'text-emerald-700')}>
                            {formatUAH(totals.balance[m])}
                          </span>
                          {isNegative && (
                            <div className="flex items-center justify-end gap-1 mt-1">
                              <span className="text-[10px] font-bold text-red-600 bg-red-200/50 px-1.5 py-0.5 rounded uppercase tracking-widest">
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

      {/* ===== МОДАЛКА ДЕТАЛИЗАЦИИ ===== */}
      <Dialog open={drilldown.open} onOpenChange={(open) => !open && closeDrilldown()}>
        <DialogContent className="sm:max-w-[560px] p-0 gap-0 overflow-hidden border-none shadow-2xl rounded-2xl">
          <div
            className={cn(
              'px-6 pt-6 pb-5 relative overflow-hidden',
              drilldown.isIncome
                ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-b border-emerald-200'
                : 'bg-gradient-to-br from-red-50 to-red-100 border-b border-red-200'
            )}
          >
            <div className="absolute -right-4 -top-4 opacity-10">
               <Receipt className="w-32 h-32" />
            </div>
            <DialogHeader className="relative z-10">
              <DialogTitle className="flex items-center gap-3 text-lg text-gray-900">
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center shadow-sm',
                    drilldown.isIncome
                      ? 'bg-gradient-to-b from-emerald-400 to-emerald-500 text-white border border-emerald-300'
                      : 'bg-gradient-to-b from-red-400 to-red-500 text-white border border-red-300'
                  )}
                >
                  <Receipt className="w-5 h-5" />
                </div>
                <span>
                  {drilldown.label}
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs font-medium text-gray-600 ml-[52px] flex items-center gap-2">
                <span className="bg-white/60 px-2 py-0.5 rounded-md">{drilldown.monthLabel}</span>
                <span className="text-gray-300">•</span>
                <span className="text-gray-700 font-bold">{formatUAH(drilldown.amount)}</span>
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="max-h-[340px] overflow-y-auto px-6 py-4 bg-white custom-scrollbar-sm">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-100 hover:bg-transparent">
                  <TableHead className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-0">
                    {tr('drilldown_order')}
                  </TableHead>
                  <TableHead className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right pr-0">
                    {tr('drilldown_amount')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drilldown.items.map((item, idx) => (
                  <TableRow key={`${item.orderId}-${idx}`} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <TableCell className="py-3 pl-0">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-mono font-bold text-gray-800">
                          {item.orderId}
                        </span>
                        <span className="text-xs text-gray-500 truncate max-w-[280px]">
                          {item.orderName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-right pr-0">
                      <span className="text-sm font-bold text-gray-900">
                        {formatUAH(item.amount)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex justify-end">
            <Button variant="outline" size="sm" onClick={closeDrilldown} className="text-xs px-4 h-8 rounded-lg">
              <XIcon className="w-3.5 h-3.5 mr-1" />
              {tr('close')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
