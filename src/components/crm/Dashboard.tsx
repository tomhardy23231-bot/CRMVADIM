'use client';

import React, { useMemo } from 'react';
import { useCRM } from '@/lib/crm-context';
import { formatUAH } from '@/lib/crm-utils';
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
} from 'lucide-react';
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
} from 'recharts';

// ============================================================
// Dashboard — Динамический дашборд с метриками из orders
// Никакого хардкода: все данные вычисляются на лету.
// ============================================================

/** Цветовой маппинг статусов */
const statusColors: Record<string, string> = {
  'Новый': 'bg-blue-100 text-blue-700',
  'У производстве': 'bg-amber-100 text-amber-700',
  'Сборка': 'bg-purple-100 text-purple-700',
  'Отгружен': 'bg-emerald-100 text-emerald-700',
};

/** Цвета для PieChart */
const CHART_COLORS = ['#3b82f6', '#f59e0b', '#a855f7', '#10b981'];

/** Dummy-активность для дашборда */
const activityData = [
  { id: 1, text: 'Изменён статус заказа TNDR-001 на "В производстве"', time: '10 мин назад', icon: CircleDot, color: 'text-amber-500 bg-amber-50' },
  { id: 2, text: 'Добавлен транш в бюджет заказа TNDR-003', time: '1 час назад', icon: Package, color: 'text-emerald-500 bg-emerald-50' },
  { id: 3, text: 'Импортирован заказ ORD-042 из 1С', time: '2 часа назад', icon: Inbox, color: 'text-blue-500 bg-blue-50' },
  { id: 4, text: 'Обновлена спецификация TNDR-001 (5 позиций)', time: '3 часа назад', icon: Activity, color: 'text-purple-500 bg-purple-50' },
  { id: 5, text: 'Завершена оплата заказа TNDR-004', time: '5 часов назад', icon: Wallet, color: 'text-emerald-500 bg-emerald-50' },
];

export function Dashboard() {
  const { orders, setCurrentPage, setSelectedOrderId, tr } = useCRM();

  // --- Динамические метрики ---
  const metrics = useMemo(() => {
    const activeOrders = orders.filter((o) => o.status !== 'Отгружен');
    const activeCount = activeOrders.length;

    // Ожидаемая прибыль: сумма (orderAmount - plannedCost - sum(budgetItems.plan)) всех активных
    let expectedProfit = 0;
    for (const o of activeOrders) {
      const budgetPlanSum = o.budgetItems.reduce((s, b) => s + b.plan, 0);
      expectedProfit += o.orderAmount - o.plannedCost - budgetPlanSum;
    }

    // Выплаты на этой неделе (неделя 1 текущего месяца из календаря)
    // Берём материалы 50% + транши на неделе 1
    let weekPayments = 0;
    for (const o of activeOrders) {
      // Материалы 50% на Неделе 1
      weekPayments += Math.round(o.plannedCost * 0.5);
      // Транши на Неделе 1
      for (const b of o.budgetItems) {
        if (b.tranches) {
          for (const tr of b.tranches) {
            if (tr.week === 1) {
              weekPayments += tr.amount;
            }
          }
        }
      }
    }

    return { activeCount, expectedProfit, weekPayments };
  }, [orders]);

  // --- Кассовый разрыв из данных календаря (неделя 1 — неделя 4) ---
  const activeOrdersForCashGap = orders.filter((o) => o.status !== 'Отгружен');
  const cashGapAlert = (() => {
    const weekData: { income: number; expense: number }[] = [
      { income: 0, expense: 0 },
      { income: 0, expense: 0 },
      { income: 0, expense: 0 },
      { income: 0, expense: 0 },
    ];

    for (const o of activeOrdersForCashGap) {
      // Поступления
      const advance = Math.round(o.orderAmount * 0.3);
      const finalPmt = Math.round(o.orderAmount * 0.7);
      weekData[0].income += advance;
      weekData[3].income += finalPmt;

      // Выплаты: материалы 50/50 на неделях 1 и 2
      const matHalf = Math.round(o.plannedCost * 0.5);
      weekData[0].expense += matHalf;
      weekData[1].expense += matHalf;

      // Транши
      for (const b of o.budgetItems) {
        if (b.tranches) {
          for (const tr of b.tranches) {
            const wk = Math.min(tr.week, 4) - 1;
            if (wk >= 0 && wk < 4) {
              weekData[wk].expense += tr.amount;
            }
          }
        }
      }
    }

    // Кумулятивный баланс
    let running = 0;
    const weekLabels = ['Неделя 1', 'Неделя 2', 'Неделя 3', 'Неделя 4'];
    const dateRanges = ['01.05 — 07.05', '08.05 — 14.05', '15.05 — 21.05', '22.05 — 28.05'];

    for (let i = 0; i < 4; i++) {
      running += weekData[i].income - weekData[i].expense;
      if (running < 0) {
        return {
          week: weekLabels[i],
          dateRange: dateRanges[i],
          deficit: running,
        };
      }
    }

    return null;
  })();

  // Фильтруем «горящие» отгрузки (дедлайн ближайшие 2 недели)
  const today = new Date();
  const twoWeeksLater = new Date(today);
  twoWeeksLater.setDate(today.getDate() + 14);

  const hotShipments = orders.filter((o) => {
    const dl = new Date(o.deadline);
    return dl <= twoWeeksLater && o.status !== 'Отгружен';
  });

  // Данные для PieChart — распределение по статусам
  const statusCounts = (() => {
    const map: Record<string, number> = {};
    orders.forEach((o) => {
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
      {cashGapAlert && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-800">
                {tr('cash_gap_alert')}: {cashGapAlert.week} ({cashGapAlert.dateRange})
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
      )}

      {/* --- Карточки метрик --- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {tr('active_orders')}
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {metrics.activeCount}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {tr('expected_profit')}
                </p>
                <p className={cn(
                  'text-3xl font-bold mt-1',
                  metrics.expectedProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                )}>
                  {formatUAH(metrics.expectedProfit)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {tr('week_payments')}
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {formatUAH(metrics.weekPayments)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-amber-600" />
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
              <ResponsiveContainer width="100%" height="100%">
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
              {activityData.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.id} className="flex items-start gap-3 group">
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
}
