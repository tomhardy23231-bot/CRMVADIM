'use client';

import React, { useMemo } from 'react';
import { useCRM } from '@/lib/crm-context';
import { formatUAH, formatWeekStr, generateWeekOptions, calcMargin } from '@/lib/crm-utils';
import {
  AlertTriangle,
  TrendingUp,
  ClipboardList,
  Wallet,
  Flame,
  ArrowRight,
  Calendar,
  Package,
  Clock,
  CircleDot,
  Inbox,
  Activity,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

// ============================================================
// Dashboard — Динамический дашборд с метриками из orders
// Никакого хардкода: все данные вычисляются на лету.
// ============================================================

/** Цветовой маппинг статусов */
const statusColors: Record<string, string> = {
  'Новый': 'bg-blue-100 text-blue-700',
  'В производстве': 'bg-amber-100 text-amber-700',
  'Сборка': 'bg-purple-100 text-purple-700',
  'Отгружен': 'bg-emerald-100 text-emerald-700',
};

/** Цвета для PieChart */
const CHART_COLORS = ['#3b82f6', '#f59e0b', '#a855f7', '#10b981'];

export const Dashboard = React.memo(function Dashboard() {
  const { orders, setCurrentPage, setSelectedOrderId, tr, lang } = useCRM();
  const { hasPermission } = useAuth();
  
  const canViewFinance = hasPermission('canViewDashboardFinance') || hasPermission('canViewProfit');

  // --- Динамические метрики ---
  const metrics = useMemo(() => {
    const activeOrders = orders.filter((o) => !o.isArchived && o.status !== 'Отгружен');
    const activeOrdersForCashGap = orders.filter((o) => !o.isArchived && o.status !== 'Отгружен');
    const activeCount = activeOrders.length;

    // Ожидаемая прибыль: orderAmount - все плановые расходы
    let expectedProfit = 0;
    for (const o of activeOrders) {
      const budgetExpenseSum = o.budgetItems.filter(b => !b.isIncome).reduce((s, b) => s + b.plan, 0);
      expectedProfit += o.orderAmount - budgetExpenseSum;
    }

    // Выплаты в текущем месяце
    const currentMonthStr = new Date().toISOString().slice(0, 7); // Формат: 2026-04
    const currentMonthDot = '.' + String(new Date().getMonth() + 1).padStart(2, '0'); // Формат: .04

    const getTrancheMonth = (tr: any) => {
      if (tr.plannedDate) return tr.plannedDate.slice(0, 7);
      if (tr.month && tr.month.includes('::')) {
        const year = tr.month.split('-')[0];
        const dates = tr.month.split('::')[1];
        if (dates) {
          const firstDateParts = dates.split('-')[0].split('.');
          if (firstDateParts.length >= 2) {
            return `${year}-${firstDateParts[1]}`;
          }
        }
      }
      return tr.month || '';
    };

    let monthPayments = 0;
    let expectedReceipts = 0;

    for (const o of activeOrdersForCashGap) {
      for (const b of o.budgetItems) {
        if (!b.isIncome && b.tranches) {
          for (const tr of b.tranches) {
            // Поддерживаем и старые транши (2026-04), и новые (2026-W15::06.04-12.04)
            if (tr.month === currentMonthStr || (tr.month.includes('::') && tr.month.includes(currentMonthDot))) {
              monthPayments += tr.amount;
            }
          }
        }
        
        // --- Ожидаемые поступления ---
        if (b.isIncome) {
          const linkedPayments = o.payments?.filter(p => p.budgetItemId === b.id) || [];
          const calculatedFact = linkedPayments.length > 0 
            ? linkedPayments.reduce((sum, p) => sum + p.income, 0) 
            : (b.fact || 0);
          
          expectedReceipts += Math.max(0, b.plan - calculatedFact);
        }
      }
    }

    return { activeCount, expectedProfit, monthPayments, expectedReceipts };
  }, [orders]);

  // --- Кассовый разрыв (прогноз на 12 недель) ---
  const cashGapAlert = (() => {
    const activeOrdersForCashGap = orders.filter((o) => !o.isArchived && o.status !== 'Отгружен');
    const displayWeeks = generateWeekOptions(lang).map(o => o.value);

    const weekData: Record<string, { income: number; expense: number }> = {};
    displayWeeks.forEach(w => weekData[w] = { income: 0, expense: 0 });

    for (const o of activeOrdersForCashGap) {
      for (const b of o.budgetItems) {
        if (b.tranches) {
          for (const tr of b.tranches) {
            if (weekData[tr.month]) {
               if (b.isIncome) weekData[tr.month].income += tr.amount;
               else weekData[tr.month].expense += tr.amount;
            }
          }
        }
      }
    }

    // Кумулятивный баланс
    let running = 0;
    for (const w of displayWeeks) {
      running += weekData[w].income - weekData[w].expense;
      if (running < 0) {
        return {
          weekStr: w,
          deficit: running,
        };
      }
    }

    return null;
  })();

  // --- Динамическая лента активности ---
  const activityItems = useMemo(() => {
    const items: { id: string; icon: any; color: string; text: string; time: string; orderId: string; sortDate: Date }[] = [];
    const now = new Date();

    for (const o of orders.filter(o => !o.isArchived)) {
      const createdAt = new Date(o.createdAt);
      const diffDays = Math.floor((now.getTime() - createdAt.getTime()) / 86400000);
      const timeStr = diffDays === 0 ? 'Сегодня' : diffDays === 1 ? 'Вчера' : `${diffDays} д. назад`;

      // Новые заказы (созданные за последние 30 дней)
      if (diffDays <= 30) {
        items.push({
          id: `new-${o.id}`,
          icon: ClipboardList,
          color: 'bg-blue-100 text-blue-600',
          text: `Тендер «${o.name}» добавлен в систему`,
          time: timeStr,
          orderId: o.id,
          sortDate: createdAt,
        });
      }

      // Горящие дедлайны (в пределах 7 дней)
      const dl = new Date(o.deadline);
      const deadlineDiff = Math.floor((dl.getTime() - now.getTime()) / 86400000);
      if (deadlineDiff >= 0 && deadlineDiff <= 7 && o.status !== 'Отгружен') {
        items.push({
          id: `deadline-${o.id}`,
          icon: Flame,
          color: 'bg-orange-100 text-orange-600',
          text: `Дедлайн «${o.name}» через ${deadlineDiff === 0 ? 'СЕГОДНЯ!' : `${deadlineDiff} дн.`}`,
          time: dl.toLocaleDateString('ru-RU'),
          orderId: o.id,
          sortDate: dl,
        });
      }

      // Завершённые этапы
      if (o.isProductionStarted && o.status === 'В производстве') {
        items.push({
          id: `prod-${o.id}`,
          icon: CircleDot,
          color: 'bg-amber-100 text-amber-600',
          text: `Производство запущено: «${o.name}»`,
          time: timeStr,
          orderId: o.id,
          sortDate: createdAt,
        });
      }
      if (o.isShipped) {
        items.push({
          id: `shipped-${o.id}`,
          icon: Package,
          color: 'bg-emerald-100 text-emerald-600',
          text: `Тендер «${o.name}» отгружен ✓`,
          time: timeStr,
          orderId: o.id,
          sortDate: createdAt,
        });
      }

      // Оплаты получены
      const totalIncome = (o.payments || []).reduce((sum, p) => sum + p.income, 0);
      if (totalIncome > 0) {
        items.push({
          id: `pay-${o.id}`,
          icon: Wallet,
          color: 'bg-green-100 text-green-600',
          text: `Получено ${formatUAH(totalIncome)} по «${o.name}»`,
          time: timeStr,
          orderId: o.id,
          sortDate: createdAt,
        });
      }
    }

    // Сортируем по дате (новые первые) и берём 8 самых свежих
    return items
      .sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime())
      .slice(0, 8);
  }, [orders]);

  // Фильтруем «горящие» отгрузки (дедлайн ближайшие 2 недели)
  const today = new Date();
  const twoWeeksLater = new Date(today);
  twoWeeksLater.setDate(today.getDate() + 14);

  const hotShipments = orders.filter((o) => {
    if (o.isArchived) return false;
    const dl = new Date(o.deadline);
    return dl <= twoWeeksLater && o.status !== 'Отгружен';
  });

  // Данные для PieChart — распределение по статусам
  const statusCounts = (() => {
    const map: Record<string, number> = {};
    orders.filter(o => !o.isArchived).forEach((o) => {
      map[o.status] = (map[o.status] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  })();

  const handleSolveCashGap = () => {
    setCurrentPage('payment-calendar');
  };

  return (
    <div className="space-y-6">
      {/* --- Критический Алерт о кассовом разрыве --- */}
      {canViewFinance && cashGapAlert && (
        <>
          {/* МОБИЛКА: Компактный баннер в одну строку */}
          <div className="lg:hidden flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 animate-in fade-in duration-500">
            <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-red-800 leading-tight truncate">
                {tr('cash_gap_alert')}: <span className="text-red-600">{formatWeekStr(cashGapAlert.weekStr, lang as 'ru' | 'ukr').replace('\n', ' ')}</span>
              </p>
              <p className="text-[10px] text-red-500 font-semibold">
                {tr('deficit')}: {formatUAH(cashGapAlert.deficit)}
              </p>
            </div>
            <button
              onClick={handleSolveCashGap}
              className="shrink-0 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-lg active:bg-red-700 transition-colors flex items-center gap-1"
            >
              Решить <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* ДЕСКТОП: Полный алерт */}
          <div className="hidden lg:flex bg-red-50 border border-red-200 rounded-xl p-4 items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-red-800">
                  {tr('cash_gap_alert')}: {formatWeekStr(cashGapAlert.weekStr, lang as 'ru' | 'ukr').replace('\n', ' ')}
                </p>
                <p className="text-sm text-red-600 mt-0.5">
                  {tr('deficit')}: <span className="font-bold">{formatUAH(cashGapAlert.deficit)}</span>
                </p>
              </div>
            </div>
            <Button
              onClick={handleSolveCashGap}
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white shrink-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              {tr('solve_problem')}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </>
      )}

      {/* === МОБИЛКА: Компактные метрики === */}
      <div className="lg:hidden flex flex-col gap-2">
        {/* Строка 1: Счётчик + 2 финансовых блока */}
        <div className="flex items-stretch gap-2">
          {/* Активные заказы: квадратик-счётчик */}
          <div className="flex flex-col items-center justify-center w-[70px] shrink-0 bg-white border border-gray-100 rounded-xl shadow-sm py-2.5 px-1">
            <ClipboardList className="w-4 h-4 text-gray-400 mb-1" />
            <span className="text-2xl font-black text-gray-800 leading-none">{metrics.activeCount}</span>
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mt-1 text-center leading-tight">{tr('active_orders')}</span>
          </div>

          {/* Ожидаемая прибыль + Выплаты в 2 строки */}
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            {/* Ожидаемая прибыль */}
            <div className="flex items-center gap-2.5 bg-emerald-50/70 border border-emerald-100 rounded-xl px-3 py-2 flex-1">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold text-emerald-600/70 uppercase tracking-wide leading-none">{tr('expected_profit')}</p>
                <p className={cn('text-base font-black tracking-tight leading-tight mt-0.5', metrics.expectedProfit >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                  {canViewFinance ? formatUAH(metrics.expectedProfit) : '*** ₴'}
                </p>
              </div>
            </div>

            {/* Ожидаемые поступления */}
            <div className="flex items-center gap-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl px-3 py-2 flex-1">
              <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
                <Inbox className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold text-indigo-500/70 uppercase tracking-wide leading-none">{tr('expected_receipts') || 'Ожидаемые поступления'}</p>
                <p className="text-base font-black text-indigo-900 tracking-tight leading-tight mt-0.5">
                  {canViewFinance ? formatUAH(metrics.expectedReceipts) : '*** ₴'}
                </p>
              </div>
            </div>

            {/* Выплаты месяца */}
            <div className="flex items-center gap-2.5 bg-blue-50/70 border border-blue-100 rounded-xl px-3 py-2 flex-1">
              <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold text-blue-500/70 uppercase tracking-wide leading-none">{tr('month_payments') || 'Выплаты месяца'}</p>
                <p className="text-base font-black text-blue-900 tracking-tight leading-tight mt-0.5">
                  {canViewFinance ? formatUAH(metrics.monthPayments) : '*** ₴'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* === ДЕСКТОП: Карточки метрик === */}
      <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-white to-gray-50/50 border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-1">
                  {tr('active_orders')}
                </p>
                <p className="text-4xl font-black text-gray-800 mt-2 pl-1 tracking-tight group-hover:text-emerald-700 transition-colors">
                  {metrics.activeCount}
                </p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-gray-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                <ClipboardList className="w-6 h-6 text-gray-600 group-hover:text-emerald-600 transition-colors" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50/50 to-white border-emerald-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-emerald-600/70 uppercase tracking-widest pl-1">
                  {tr('expected_profit')}
                </p>
                <p className={cn(
                  'text-4xl font-black mt-2 pl-1 tracking-tight',
                  metrics.expectedProfit >= 0 ? 'text-emerald-700' : 'text-red-600'
                )}>
                  {canViewFinance ? formatUAH(metrics.expectedProfit) : (
                    <span className="flex items-center gap-2"><Lock className="w-6 h-6 text-emerald-600/50" /> *** ₴</span>
                  )}
                </p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-500 shadow-[0_4px_12px_rgba(16,185,129,0.3)] border border-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50/50 to-white border-indigo-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-indigo-500/70 uppercase tracking-widest pl-1">
                  {tr('expected_receipts') || 'Ожидаемые поступления'}
                </p>
                <p className="text-4xl font-black text-indigo-900 mt-2 pl-1 tracking-tight group-hover:text-indigo-700 transition-colors">
                  {canViewFinance ? formatUAH(metrics.expectedReceipts) : (
                    <span className="flex items-center gap-2"><Lock className="w-6 h-6 text-indigo-900/50" /> *** ₴</span>
                  )}
                </p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-indigo-400 to-indigo-500 shadow-[0_4px_12px_rgba(99,102,241,0.3)] border border-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Inbox className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50/50 to-white border-blue-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-blue-500/70 uppercase tracking-widest pl-1">
                  {tr('month_payments') || 'Выплаты месяца'}
                </p>
                <p className="text-4xl font-black text-blue-900 mt-2 pl-1 tracking-tight">
                  {canViewFinance ? formatUAH(metrics.monthPayments) : (
                    <span className="flex items-center gap-2"><Lock className="w-6 h-6 text-blue-900/50" /> *** ₴</span>
                  )}
                </p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-blue-400 to-blue-500 shadow-[0_4px_12px_rgba(59,130,246,0.3)] border border-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Wallet className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- Воронка заказов (PieChart) + Недавняя активность --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Воронка */}
        <Card className="bg-white shadow-sm hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Package className="w-4.5 h-4.5 text-gray-500" />
              {tr('order_funnel')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                <PieChart>
                  <Pie
                    data={statusCounts}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {statusCounts.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span className="text-xs text-gray-600">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Недавняя активность */}
        <Card className="bg-white shadow-sm hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Activity className="w-4.5 h-4.5 text-gray-500" />
              {tr('recent_activity')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {activityItems.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                  <Activity className="w-8 h-8 text-gray-200 mb-2" />
                  <p className="text-sm font-medium">Пока нет активности</p>
                </div>
              )}
              {activityItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 group cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-1.5 rounded-lg transition-colors"
                    onClick={() => setSelectedOrderId(item.orderId)}
                  >
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5', item.color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 leading-snug">{item.text}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {item.time}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- График маржинальности по заказам --- */}
      {orders.length > 0 && canViewFinance && (
        <Card className="bg-white shadow-sm hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <TrendingUp className="w-4.5 h-4.5 text-emerald-500" />
              {tr('margin_chart') || 'Маржинальность по заказам'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3 lg:pb-6">
            {/* --- ДЕСКТОП: Графики --- */}
            <div className="hidden lg:block">
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                  <BarChart
                    data={orders.filter(o => !o.isArchived).map(o => {
                      const expenseBudget = o.budgetItems.filter(b => !b.isIncome).reduce((s, b) => s + b.plan, 0);
                      const margin = calcMargin(o.orderAmount, expenseBudget);
                      return {
                        name: o.name.length > 18 ? o.name.slice(0, 18) + '…' : o.name,
                        margin,
                        fill: margin >= 20 ? '#10b981' : margin >= 10 ? '#f59e0b' : '#ef4444',
                      };
                    })}
                    margin={{ top: 5, right: 20, left: 0, bottom: 50 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      angle={-35}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      unit="%"
                      domain={[0, 'auto']}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                        fontSize: '12px',
                      }}
                      formatter={(value: number) => [`${value}%`, 'Маржа']}
                    />
                    <Bar
                      dataKey="margin"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                    >
                      {orders.filter(o => !o.isArchived).map((o, index) => {
                        const expenseBudget = o.budgetItems.filter(b => !b.isIncome).reduce((s, b) => s + b.plan, 0);
                        const margin = calcMargin(o.orderAmount, expenseBudget);
                        const color = margin >= 20 ? '#10b981' : margin >= 10 ? '#f59e0b' : '#ef4444';
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-4 mt-2 text-[11px] text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> ≥ 20% — здоровая</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> 10-20% — средняя</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> &lt; 10% — низкая</span>
              </div>
            </div>

            {/* --- МОБИЛЬНЫЙ: Прогресс-бары --- */}
            <div className="lg:hidden flex flex-col gap-3.5 mt-2 px-1 max-h-[350px] overflow-y-auto custom-scrollbar">
              {orders.filter(o => !o.isArchived)
                .map(o => {
                  const expenseBudget = o.budgetItems.filter(b => !b.isIncome).reduce((s, b) => s + b.plan, 0);
                  const margin = calcMargin(o.orderAmount, expenseBudget);
                  return { id: o.id, name: o.name, margin };
                })
                .sort((a, b) => b.margin - a.margin)
                .map((item) => {
                  const m = item.margin;
                  const colorClass = m >= 20 ? 'bg-emerald-500' : m >= 10 ? 'bg-amber-500' : 'bg-red-500';
                  const bgClass = m >= 20 ? 'bg-emerald-50/80' : m >= 10 ? 'bg-amber-50/80' : 'bg-red-50/80';
                  const textClass = m >= 20 ? 'text-emerald-700' : m >= 10 ? 'text-amber-700' : 'text-red-700';
                  const borderClass = m >= 20 ? 'border-emerald-200' : m >= 10 ? 'border-amber-200' : 'border-red-200';

                  return (
                    <div key={item.id} className="flex flex-col gap-1.5 cursor-pointer active:scale-[0.98] transition-transform" onClick={() => setSelectedOrderId(item.id)}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-800 pr-3 line-clamp-1">{item.name}</span>
                        <span className={cn("text-[11px] font-black px-2 py-0.5 rounded-md border shrink-0", bgClass, textClass, borderClass)}>
                          {m}%
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-gray-100/80 rounded-full overflow-hidden border border-black/5">
                        <div className={cn("h-full rounded-full transition-all duration-700 ease-out", colorClass)} style={{ width: `${Math.min(Math.max(m, 0), 100)}%` }} />
                      </div>
                    </div>
                  );
                })}

              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-2 text-[10px] text-gray-500 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                <span className="flex items-center gap-1 font-medium"><span className="w-2 h-2 rounded-full bg-emerald-500" /> ≥ 20% (хорошо)</span>
                <span className="flex items-center gap-1 font-medium"><span className="w-2 h-2 rounded-full bg-amber-500" /> 10-20% (норма)</span>
                <span className="flex items-center gap-1 font-medium"><span className="w-2 h-2 rounded-full bg-red-500" /> &lt; 10% (мало)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* --- Горящие отгрузки --- */}
      <Card className="bg-white shadow-sm hover:shadow-md transition-all duration-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Flame className="w-4.5 h-4.5 text-orange-500" />
            {tr('hot_shipments')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {hotShipments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                <Flame className="w-7 h-7 text-gray-300" />
              </div>
              <p className="text-sm font-medium">{tr('no_hot_shipments')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-medium text-gray-500">ID</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">{tr('order_name')}</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">{tr('status')}</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">{tr('deadline')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hotShipments.map((order) => (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer hover:bg-gray-50 transition-all duration-150"
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    <TableCell className="font-mono text-xs font-semibold text-gray-700">
                      {order.id}
                    </TableCell>
                    <TableCell className="text-sm text-gray-800 max-w-[280px] truncate">
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
                    <TableCell className="text-sm text-gray-600 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      {new Date(order.deadline).toLocaleDateString('ru-RU')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
});
