'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useCRM } from '@/lib/crm-context';
import { formatUAH, formatWeekStr, generateYearWeeks, getCurrentWeekValue, dateToWeekValue } from '@/lib/crm-utils';
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
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================
// PaymentCalendar — Глобальный платёжный календарь (Премиум)
// Показывает все недели года с auto-scroll на текущую.
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

export const PaymentCalendar = React.memo(function PaymentCalendar() {
  const { orders, tr, lang } = useCRM();
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentWeekRef = useRef<HTMLTableCellElement>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const mobileCurrentRef = useRef<HTMLDivElement>(null);

  const [selectedOrderId, setSelectedOrderId] = useState('all');
  const [mobileSelectedWeek, setMobileSelectedWeek] = useState<string | null>(null);
  const [drilldown, setDrilldown] = useState<DrilldownState>({
    open: false, label: '', monthLabel: '', amount: 0, isIncome: true, items: [],
  });

  // --- Все недели года ---
  const allWeeks = useMemo(() => generateYearWeeks(lang), [lang]);
  const currentWeekValue = useMemo(() => getCurrentWeekValue(), []);

  // --- Агрегация строк по неделям ---
  const rows = useMemo(() => {
    const map = new Map<string, { id: string, label: string, isIncome: boolean, byMonth: Record<string, number>, breakdown: Record<string, DrilldownItem[]> }>();
    let idCounter = 0;

    for (const order of orders) {
      if (selectedOrderId !== 'all' && order.id !== selectedOrderId) continue;

      for (const item of order.budgetItems) {
        if (!item.tranches) continue;
        for (const trItem of item.tranches) {
          if (trItem.amount <= 0) continue;

          // Определяем week-value: если есть plannedDate — вычисляем из неё, иначе legacy month
          let weekValue = trItem.month;
          if (trItem.plannedDate) {
            const computed = dateToWeekValue(trItem.plannedDate);
            if (computed) weekValue = computed;
          }

          const key = `${item.isIncome ? 'in' : 'out'}::${item.name}`;
          if (!map.has(key)) {
            map.set(key, { id: `row-${idCounter++}`, label: item.name, isIncome: !!item.isIncome, byMonth: {}, breakdown: {} });
          }
          const row = map.get(key)!;
          if (!row.byMonth[weekValue]) row.byMonth[weekValue] = 0;
          row.byMonth[weekValue] += trItem.amount;

          if (!row.breakdown[weekValue]) row.breakdown[weekValue] = [];
          row.breakdown[weekValue].push({ orderId: order.externalId || order.id.slice(0, 8), orderName: order.name, amount: trItem.amount });
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
  const weekValues = useMemo(() => allWeeks.map(w => w.value), [allWeeks]);

  const totals = useMemo(() => {
    const totalIncome: Record<string, number> = {};
    const totalExpense: Record<string, number> = {};
    const balance: Record<string, number> = {};
    const incomeBreakdown: Record<string, DrilldownItem[]> = {};
    const expenseBreakdown: Record<string, DrilldownItem[]> = {};

    weekValues.forEach(m => {
      totalIncome[m] = 0;
      totalExpense[m] = 0;
      incomeBreakdown[m] = [];
      expenseBreakdown[m] = [];
    });

    incomeRows.forEach(r => {
      weekValues.forEach(m => {
        if (r.byMonth[m]) totalIncome[m] += r.byMonth[m];
        if (r.breakdown[m]) incomeBreakdown[m].push(...r.breakdown[m]);
      });
    });
    expenseRows.forEach(r => {
      weekValues.forEach(m => {
        if (r.byMonth[m]) totalExpense[m] += r.byMonth[m];
        if (r.breakdown[m]) expenseBreakdown[m].push(...r.breakdown[m]);
      });
    });

    let running = 0;
    weekValues.forEach(m => {
      running += totalIncome[m] - totalExpense[m];
      balance[m] = running;
    });

    return { totalIncome, totalExpense, balance, incomeBreakdown, expenseBreakdown };
  }, [incomeRows, expenseRows, weekValues]);

  // --- Макс значение для sparkline ---
  const maxBarValue = useMemo(() => {
    let max = 1;
    weekValues.forEach(m => {
      max = Math.max(max, totals.totalIncome[m] || 0, totals.totalExpense[m] || 0);
    });
    return max;
  }, [totals, weekValues]);

  // --- Auto-scroll на текущую неделю ---
  useEffect(() => {
    if (currentWeekRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const target = currentWeekRef.current;
      const containerWidth = container.clientWidth;
      const targetLeft = target.offsetLeft;
      const targetWidth = target.offsetWidth;
      container.scrollLeft = targetLeft - containerWidth / 2 + targetWidth / 2;
    }
    // Mobile: auto-scroll + select current week by default
    if (mobileCurrentRef.current && mobileScrollRef.current) {
      const container = mobileScrollRef.current;
      const target = mobileCurrentRef.current;
      container.scrollLeft = target.offsetLeft - container.clientWidth / 2 + target.offsetWidth / 2;
    }
    setMobileSelectedWeek(currentWeekValue);
  }, [allWeeks, currentWeekValue]);

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

  const hasData = weekValues.some(
    m => totals.totalIncome[m] > 0 || totals.totalExpense[m] > 0
  );

  // Определяем текущий week index для подсвечивания
  const currentWeekIndex = weekValues.indexOf(currentWeekValue);

  // Данные выбранной недели для мобильной детализации
  const mobileWeekData = useMemo(() => {
    if (!mobileSelectedWeek) return null;
    const w = allWeeks.find(wk => wk.value === mobileSelectedWeek);
    if (!w) return null;
    const income = totals.totalIncome[mobileSelectedWeek] || 0;
    const expense = totals.totalExpense[mobileSelectedWeek] || 0;
    const balance = totals.balance[mobileSelectedWeek] || 0;
    const incomeDetails = incomeRows
      .filter(r => (r.byMonth[mobileSelectedWeek] || 0) > 0)
      .map(r => ({ label: r.label, amount: r.byMonth[mobileSelectedWeek] || 0 }));
    const expenseDetails = expenseRows
      .filter(r => (r.byMonth[mobileSelectedWeek] || 0) > 0)
      .map(r => ({ label: r.label, amount: r.byMonth[mobileSelectedWeek] || 0 }));
    return { week: w, income, expense, balance, incomeDetails, expenseDetails };
  }, [mobileSelectedWeek, allWeeks, totals, incomeRows, expenseRows]);

  // Классы для первой «липкой» колонки — адаптивные
  const stickyColClass = "sticky left-0 z-10 w-[140px] min-w-[140px] max-w-[140px] lg:w-[220px] lg:min-w-[220px] lg:max-w-[220px]";


  return (
    <div className="space-y-4">
      <Card className="bg-white shadow-sm hover:shadow-md transition-all duration-200 border-none ring-1 ring-gray-100 overflow-hidden">
        <CardHeader className="pb-3 border-b border-gray-100/80 bg-gradient-to-r from-white to-gray-50/30 px-3 lg:px-6">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="flex items-center gap-2 lg:gap-2.5 text-sm lg:text-base font-semibold text-gray-800">
              <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-sm shrink-0">
                <CalendarRange className="w-3.5 h-3.5 lg:w-4.5 lg:h-4.5 text-white" />
              </div>
              <span className="hidden sm:inline">Платёжный Календарь</span>
              <span className="sm:hidden">Календарь</span>
              <span className="text-[10px] lg:text-xs font-normal text-gray-400 ml-0.5">{new Date().getFullYear()}</span>
            </CardTitle>

            <div className="flex items-center gap-2 flex-wrap">
              <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                <SelectTrigger className="w-full lg:w-[240px] h-9 text-xs border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-colors rounded-lg">
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
                Нет запланированных финансовых движений.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Добавьте расходы и назначьте даты в бюджете тендера
              </p>
            </div>
          ) : (
            <>
              {/* ============================================================ */}
              {/* МОБИЛЬНЫЙ ИНТЕРФЕЙС: свайп-карточки недель + детализация     */}
              {/* ============================================================ */}
              <div className="lg:hidden">
                {/* --- Лента карточек недель --- */}
                <div ref={mobileScrollRef} className="flex gap-2.5 overflow-x-auto px-3 py-3 custom-scrollbar scroll-smooth">
                  {allWeeks.map((w, i) => {
                    const isPast = i < currentWeekIndex;
                    const isCurrent = w.value === currentWeekValue;
                    const isSelected = w.value === mobileSelectedWeek;
                    const inc = totals.totalIncome[w.value] || 0;
                    const exp = totals.totalExpense[w.value] || 0;
                    const bal = totals.balance[w.value] || 0;
                    const hasActivity = inc > 0 || exp > 0;
                    const parts = w.value.split('::');
                    const weekNum = parseInt(parts[0]?.split('-W')[1] || '0');
                    const dates = parts[1] || '';

                    return (
                      <div
                        key={w.value}
                        ref={isCurrent ? mobileCurrentRef : undefined}
                        onClick={() => setMobileSelectedWeek(isSelected ? null : w.value)}
                        className={cn(
                          'flex-shrink-0 w-[140px] rounded-2xl border cursor-pointer transition-all duration-200 active:scale-95 select-none',
                          isSelected
                            ? 'border-indigo-400 bg-indigo-50 shadow-md shadow-indigo-100/50 ring-2 ring-indigo-300/40'
                            : isCurrent
                              ? 'border-indigo-200 bg-indigo-50/60'
                              : isPast
                                ? 'border-gray-100 bg-gray-50/60'
                                : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
                        )}
                      >
                        {/* Заголовок карточки */}
                        <div className={cn(
                          'flex items-center justify-between px-3 pt-2.5 pb-1.5 rounded-t-2xl',
                          isCurrent ? 'border-b border-indigo-100' : 'border-b border-gray-50'
                        )}>
                          <div>
                            <span className={cn(
                              'text-[10px] font-bold uppercase tracking-widest',
                              isCurrent ? 'text-indigo-500' : isPast ? 'text-gray-300' : 'text-gray-400'
                            )}>
                              Нед {weekNum}
                            </span>
                            {isCurrent && (
                              <span className="ml-1 text-[8px] font-black text-white bg-indigo-500 px-1.5 py-[1px] rounded-full uppercase">
                                сейчас
                              </span>
                            )}
                          </div>
                          {isSelected
                            ? <ChevronUp className="w-3.5 h-3.5 text-indigo-400" />
                            : <ChevronDown className={cn('w-3.5 h-3.5', isCurrent ? 'text-indigo-300' : 'text-gray-300')} />}
                        </div>

                        {/* Даты */}
                        <div className="px-3 pt-1.5">
                          <p className={cn('text-[10px]', isPast ? 'text-gray-300' : 'text-gray-400')}>
                            {dates}
                          </p>
                        </div>

                        {/* Числа */}
                        <div className="px-3 pt-2 pb-2.5 flex flex-col gap-1">
                          {hasActivity ? (
                            <>
                              {inc > 0 && (
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-bold text-emerald-500/70 uppercase">Приход</span>
                                  <span className="text-[11px] font-black text-emerald-600">{formatUAH(inc)}</span>
                                </div>
                              )}
                              {exp > 0 && (
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-bold text-red-400/70 uppercase">Расход</span>
                                  <span className="text-[11px] font-black text-red-600">{formatUAH(exp)}</span>
                                </div>
                              )}
                              {/* Balance mini-bar */}
                              <div className="mt-1 flex items-center gap-1.5">
                                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className={cn('h-full rounded-full', bal < 0 ? 'bg-red-400' : 'bg-emerald-400')}
                                    style={{ width: `${Math.min(100, Math.abs(bal) / (maxBarValue || 1) * 100)}%` }}
                                  />
                                </div>
                                <span className={cn('text-[9px] font-black', bal < 0 ? 'text-red-500' : 'text-emerald-600')}>
                                  {bal < 0 ? '−' : '+'}{formatUAH(Math.abs(bal)).replace('₴','').trim()}₴
                                </span>
                              </div>
                            </>
                          ) : (
                            <p className="text-[10px] text-gray-300 py-1">— нет данных</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* --- Детализация выбранной недели (элемент из Варианта А) --- */}
                {mobileWeekData && (
                  <div className="mx-3 mb-3 rounded-2xl border border-indigo-100 bg-white overflow-hidden shadow-sm animate-in slide-in-from-top-2 duration-200">
                    {/* Хедер детализации */}
                    <div className="flex items-center justify-between px-4 py-3 bg-indigo-50/60 border-b border-indigo-100">
                      <div>
                        <p className="text-sm font-bold text-indigo-800">
                          Неделя {parseInt(mobileWeekData.week.value.split('::')[0]?.split('-W')[1] || '0')}
                        </p>
                        <p className="text-[11px] text-indigo-500">{mobileWeekData.week.value.split('::')[1] || ''}</p>
                      </div>
                      <div className="flex gap-3 text-right">
                        <div>
                          <p className="text-[9px] font-bold text-emerald-500/70 uppercase">Баланс</p>
                          <p className={cn('text-base font-black', mobileWeekData.balance < 0 ? 'text-red-600' : 'text-emerald-700')}>
                            {formatUAH(mobileWeekData.balance)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Поступления */}
                    {mobileWeekData.incomeDetails.length > 0 && (
                      <div className="px-4 py-3 border-b border-gray-50">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                          <TrendingUp className="w-3 h-3" /> Поступления · {formatUAH(mobileWeekData.income)}
                        </p>
                        <div className="flex flex-col gap-1.5">
                          {mobileWeekData.incomeDetails.map((d, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                              <span className="text-xs text-gray-600 truncate pr-2">{d.label}</span>
                              <span className="text-xs font-bold text-emerald-700 shrink-0">{formatUAH(d.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Расходы */}
                    {mobileWeekData.expenseDetails.length > 0 && (
                      <div className="px-4 py-3">
                        <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                          <TrendingDown className="w-3 h-3" /> Расходы · {formatUAH(mobileWeekData.expense)}
                        </p>
                        <div className="flex flex-col gap-1.5">
                          {mobileWeekData.expenseDetails.map((d, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                              <span className="text-xs text-gray-600 truncate pr-2">{d.label}</span>
                              <span className="text-xs font-bold text-red-600 shrink-0">{formatUAH(d.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {mobileWeekData.incomeDetails.length === 0 && mobileWeekData.expenseDetails.length === 0 && (
                      <div className="px-4 py-5 text-center text-[12px] text-gray-400">
                        Нет данных по этой неделе
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ============================================================ */}
              {/* ДЕСКТОП: Стандартная таблица (без изменений)                 */}
              {/* ============================================================ */}
              <div ref={scrollRef} className="hidden lg:block overflow-x-auto custom-scrollbar scroll-smooth">
                <table className="w-full border-collapse relative" style={{ minWidth: `${140 + allWeeks.length * 100}px` }}>
                
                  {/* === SPARKLINE BAR CHART === */}
                  <thead>
                    <tr>
                      <th className={cn("bg-white border-b border-gray-100 px-2 lg:px-3 py-2", stickyColClass)}>
                        <div className="flex items-center gap-1 text-[9px] lg:text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          <Zap className="w-3 h-3" />
                          <span>Cash Flow</span>
                        </div>
                      </th>
                      {allWeeks.map((w, i) => {
                        const inc = totals.totalIncome[w.value] || 0;
                        const exp = totals.totalExpense[w.value] || 0;
                        const incH = Math.round((inc / maxBarValue) * 32);
                        const expH = Math.round((exp / maxBarValue) * 32);
                        const isCurrent = w.value === currentWeekValue;
                        const isPast = i < currentWeekIndex;

                        return (
                          <th
                            key={`spark-${w.value}`}
                            className={cn(
                              "border-b border-gray-100 px-0.5 lg:px-1 py-2 min-w-[80px] lg:min-w-[120px] transition-colors",
                              isCurrent ? 'bg-indigo-50/60' : isPast ? 'bg-gray-50/40' : 'bg-white'
                            )}
                          >
                            <div className="flex items-end justify-center gap-[3px] h-[36px]">
                              <div
                                className="w-[14px] rounded-t-sm bg-gradient-to-t from-emerald-400 to-emerald-300 transition-all"
                                style={{ height: `${Math.max(incH, inc > 0 ? 3 : 0)}px` }}
                                title={`Доход: ${formatUAH(inc)}`}
                              />
                              <div
                                className="w-[14px] rounded-t-sm bg-gradient-to-t from-red-400 to-red-300 transition-all"
                                style={{ height: `${Math.max(expH, exp > 0 ? 3 : 0)}px` }}
                                title={`Расход: ${formatUAH(exp)}`}
                              />
                            </div>
                          </th>
                        );
                      })}
                    </tr>

                    {/* === WEEK HEADERS === */}
                    <tr className="border-b border-gray-200">
                      <th className={cn("bg-white text-left text-[9px] lg:text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 lg:px-4 py-2.5 z-20 border-r border-gray-100", stickyColClass)}>
                        {tr('article')}
                      </th>
                      {allWeeks.map((w, i) => {
                        const isCurrent = w.value === currentWeekValue;
                        const isPast = i < currentWeekIndex;
                        const parts = w.value.split('::');
                        const weekNum = parts[0]?.split('-W')[1];
                        const dates = parts[1] || '';

                        return (
                          <th
                            key={w.value}
                            ref={isCurrent ? currentWeekRef : undefined}
                            className={cn(
                              "text-center px-1 lg:px-2 py-2 lg:py-2.5 min-w-[80px] lg:min-w-[120px] transition-colors relative",
                              isCurrent ? 'bg-indigo-50/80' : isPast ? 'bg-gray-50/50' : 'bg-white'
                            )}
                          >
                            {isCurrent && (
                              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-0.5">
                                <span className="text-[8px] font-black text-white bg-indigo-500 px-2 py-[1px] rounded-full uppercase tracking-widest shadow-sm">
                                  сейчас
                                </span>
                              </div>
                            )}
                            <div className={cn(
                              "text-[10px] lg:text-xs font-bold tracking-tight",
                              isCurrent ? 'text-indigo-700' : isPast ? 'text-gray-400' : 'text-gray-600'
                            )}>
                              Нед {parseInt(weekNum || '0')}
                            </div>
                            <div className={cn(
                              "text-[10px] font-medium mt-0.5",
                              isCurrent ? 'text-indigo-500' : isPast ? 'text-gray-300' : 'text-gray-400'
                            )}>
                              {dates}
                            </div>
                            {isCurrent && (
                              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-500 rounded-t" />
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>

                  <tbody>
                    {/* === Поступления === */}
                    <tr className="bg-emerald-50/60">
                      <td className={cn("bg-emerald-50 text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-4 py-2 border-r border-emerald-100/50", stickyColClass)}>
                        <div className="flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5" />
                          {tr('income')}
                        </div>
                      </td>
                      <td className="bg-emerald-50/40" colSpan={allWeeks.length}></td>
                    </tr>

                    {incomeRows.map((row) => (
                      <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors duration-100">
                        <td className={cn("bg-white px-2 lg:px-4 py-2 text-xs lg:text-sm font-medium text-gray-700 border-r border-gray-50", stickyColClass)}>
                          <span className="truncate block max-w-[120px] lg:max-w-[200px]">{row.label}</span>
                        </td>
                        {allWeeks.map((w, i) => {
                          const val = row.byMonth[w.value] || 0;
                          const isCurrent = w.value === currentWeekValue;
                          const isPast = i < currentWeekIndex;
                          return (
                            <td
                              key={w.value}
                              onClick={() => openDrilldown(row.label, w.label, true, row.breakdown[w.value])}
                              className={cn(
                                'px-2 py-2 text-xs text-right font-semibold transition-all duration-100',
                                isCurrent ? 'bg-indigo-50/30' : isPast ? 'bg-gray-50/20' : '',
                                val > 0
                                  ? 'text-emerald-600 cursor-pointer hover:bg-emerald-50 hover:underline decoration-emerald-200 decoration-dotted underline-offset-4 rounded-sm'
                                  : 'text-gray-200 font-normal'
                              )}
                            >
                              {val > 0 ? formatUAH(val) : '–'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    {/* Итого поступления */}
                    <tr className="bg-emerald-100/30 border-b border-emerald-200/40">
                      <td className={cn("bg-emerald-50/70 px-4 py-2 text-xs font-bold text-emerald-800 border-r border-emerald-100/50", stickyColClass)}>
                        {tr('total_income')}
                      </td>
                      {allWeeks.map((w, i) => {
                        const val = totals.totalIncome[w.value];
                        const isCurrent = w.value === currentWeekValue;
                        const isPast = i < currentWeekIndex;
                        return (
                          <td
                            key={w.value}
                            onClick={() => openDrilldown(tr('total_income'), w.label, true, totals.incomeBreakdown[w.value])}
                            className={cn(
                              'px-2 py-2 text-xs text-right font-bold transition-all duration-100',
                              isCurrent ? 'bg-indigo-50/40' : isPast ? 'bg-gray-50/20' : 'bg-emerald-50/20',
                              val > 0
                                ? 'text-emerald-800 cursor-pointer hover:bg-emerald-100/60 hover:underline decoration-emerald-300 decoration-dotted underline-offset-4 rounded-sm'
                                : 'text-emerald-300/50'
                            )}
                          >
                            {val > 0 ? formatUAH(val) : '–'}
                          </td>
                        );
                      })}
                    </tr>

                    {/* === Расходы === */}
                    <tr className="bg-red-50/60">
                      <td className={cn("bg-red-50 text-[10px] font-bold text-red-700 uppercase tracking-widest px-4 py-2 border-r border-red-100/50", stickyColClass)}>
                        <div className="flex items-center gap-1.5">
                          <TrendingDown className="w-3.5 h-3.5" />
                          {tr('expenses')}
                        </div>
                      </td>
                      <td className="bg-red-50/40" colSpan={allWeeks.length}></td>
                    </tr>

                    {expenseRows.map((row) => (
                      <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors duration-100">
                        <td className={cn("bg-white px-2 lg:px-4 py-2 text-xs lg:text-sm font-medium text-gray-700 border-r border-gray-50", stickyColClass)}>
                          <span className="truncate block max-w-[120px] lg:max-w-[200px]">{row.label}</span>
                        </td>
                        {allWeeks.map((w, i) => {
                          const val = row.byMonth[w.value] || 0;
                          const isCurrent = w.value === currentWeekValue;
                          const isPast = i < currentWeekIndex;
                          return (
                            <td
                              key={w.value}
                              onClick={() => openDrilldown(row.label, w.label, false, row.breakdown[w.value])}
                              className={cn(
                                'px-2 py-2 text-xs text-right font-medium transition-all duration-100',
                                isCurrent ? 'bg-indigo-50/30' : isPast ? 'bg-gray-50/20' : '',
                                val > 0
                                  ? 'text-red-600 cursor-pointer hover:bg-red-50 hover:underline decoration-red-200 decoration-dotted underline-offset-4 rounded-sm font-semibold'
                                  : 'text-gray-200 font-normal'
                              )}
                            >
                              {val > 0 ? formatUAH(val) : '–'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    {/* Итого расходы */}
                    <tr className="bg-red-100/30 border-b border-red-200/40">
                      <td className={cn("bg-red-50/60 px-4 py-2 text-xs font-bold text-red-800 border-r border-red-100/50", stickyColClass)}>
                        {tr('total_expenses')}
                      </td>
                      {allWeeks.map((w, i) => {
                        const val = totals.totalExpense[w.value];
                        const isCurrent = w.value === currentWeekValue;
                        const isPast = i < currentWeekIndex;
                        return (
                          <td
                            key={w.value}
                            onClick={() => openDrilldown(tr('total_expenses'), w.label, false, totals.expenseBreakdown[w.value])}
                            className={cn(
                              'px-2 py-2 text-xs text-right font-bold transition-all duration-100',
                              isCurrent ? 'bg-indigo-50/40' : isPast ? 'bg-gray-50/20' : 'bg-red-50/20',
                              val > 0
                                ? 'text-red-800 cursor-pointer hover:bg-red-100/60 hover:underline decoration-red-300 decoration-dotted underline-offset-4 rounded-sm'
                                : 'text-red-300/50'
                            )}
                          >
                            {val > 0 ? formatUAH(val) : '–'}
                          </td>
                        );
                      })}
                    </tr>

                    {/* === БАЛАНС === */}
                    <tr className="border-t-2 border-gray-200">
                      <td className={cn("bg-gray-50 px-4 py-3 border-r border-gray-200", stickyColClass)}>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                          <AlertTriangle className="w-3.5 h-3.5 text-gray-400" />
                          {tr('balance')}
                        </div>
                      </td>
                      {allWeeks.map((w, i) => {
                        const bal = totals.balance[w.value] || 0;
                        const isNegative = bal < 0;
                        const isCurrent = w.value === currentWeekValue;
                        const isPast = i < currentWeekIndex;
                        const hasActivity = (totals.totalIncome[w.value] || 0) > 0 || (totals.totalExpense[w.value] || 0) > 0;
                        
                        return (
                          <td
                            key={w.value}
                            className={cn(
                              'px-2 py-3 text-right transition-colors border-l border-gray-100/50',
                              isCurrent ? 'bg-indigo-50/50' : isPast ? 'bg-gray-50/30' : '',
                              isNegative && hasActivity ? 'bg-red-50/60' : !isNegative && hasActivity ? 'bg-emerald-50/40' : ''
                            )}
                          >
                            {hasActivity || bal !== 0 ? (
                              <>
                                <span className={cn(
                                  'text-sm font-black tracking-tight block',
                                  isNegative ? 'text-red-600' : 'text-emerald-600'
                                )}>
                                  {formatUAH(bal)}
                                </span>
                                {isNegative && (
                                  <span className="text-[8px] font-bold text-red-500 bg-red-100/80 px-1.5 py-0.5 rounded uppercase tracking-widest mt-0.5 inline-block">
                                    {tr('cash_gap')}
                                  </span>
                                )}
                                {/* Balance bar */}
                                <div className="mt-1 h-[3px] w-full rounded-full bg-gray-100 overflow-hidden">
                                  <div
                                    className={cn("h-full rounded-full transition-all", isNegative ? "bg-red-400" : "bg-emerald-400")}
                                    style={{ width: `${Math.min(100, Math.abs(bal) / (maxBarValue || 1) * 100)}%` }}
                                  />
                                </div>
                              </>
                            ) : (
                              <span className="text-gray-200 text-xs">–</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}

        </CardContent>
      </Card>

      {/* ===== МОДАЛКА ДЕТАЛИЗАЦИИ ===== */}
      <Dialog open={drilldown.open} onOpenChange={(open) => !open && closeDrilldown()}>
        <DialogContent className="sm:max-w-[560px] p-0 gap-0 overflow-hidden border-none shadow-2xl rounded-2xl mx-3">
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
});
