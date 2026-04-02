'use client';

import React from 'react';
import { useCRM } from '@/lib/crm-context';
import type { Order, OrderStatus } from '@/lib/crm-types';
import { formatUAH, calcMargin } from '@/lib/crm-utils';
import { ArrowLeft, Check, PackageX } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { SpecTab } from './tabs/SpecTab';
import { TimelineTab } from './tabs/TimelineTab';
import { BudgetTab } from './tabs/BudgetTab';
import { OrderCalendarTab } from './tabs/OrderCalendarTab';

// ============================================================
// OrderCard — Карточка заказа с прогресс-баром, статусом, 4 вкладками
// ============================================================

const statusSteps: OrderStatus[] = ['Новый', 'В производстве', 'Сборка', 'Отгружен'];

const statusBadgeStyles: Record<string, string> = {
  'Новый': 'bg-blue-100 text-blue-700 border-blue-200',
  'В производстве': 'bg-amber-100 text-amber-700 border-amber-200',
  'Сборка': 'bg-purple-100 text-purple-700 border-purple-200',
  'Отгружен': 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const statusDotColors: Record<string, string> = {
  'Новый': 'bg-blue-500',
  'В производстве': 'bg-amber-500',
  'Сборка': 'bg-purple-500',
  'Отгружен': 'bg-emerald-500',
};

interface OrderCardProps {
  orderId: string;
  onBack: () => void;
}

export function OrderCard({ orderId, onBack }: OrderCardProps) {
  const { orders, updateOrderStatus, tr } = useCRM();
  const order = orders.find((o) => o.id === orderId);

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
          <PackageX className="w-8 h-8 text-gray-300" />
        </div>
        <p className="text-lg font-medium text-gray-500">{tr('order_not_found')}</p>
        <Button variant="outline" onClick={onBack} className="mt-4 transition-all duration-200 hover:-translate-y-0.5">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {tr('back_to_orders')}
        </Button>
      </div>
    );
  }

  // Прогресс статуса
  const currentStepIndex = statusSteps.indexOf(order.status);
  const progressPercent = (currentStepIndex / (statusSteps.length - 1)) * 100;

  // Финансовые расчёты
  const totalBudget = order.budgetItems.reduce((sum, b) => sum + b.plan, 0);
  const totalFactBudget = order.budgetItems.reduce((sum, b) => sum + b.fact, 0);
  const totalCost = order.plannedCost + totalBudget;
  const totalFactCost = order.plannedCost + totalFactBudget;
  const plannedMargin = calcMargin(order.orderAmount, totalCost);
  const actualMargin = calcMargin(order.orderAmount, totalFactCost);

  // Обработчик смены статуса
  const handleStatusChange = (newStatus: OrderStatus) => {
    updateOrderStatus(order.id, newStatus);
    toast.success(`${tr('toast_status_changed')} "${newStatus}"`);
  };

  return (
    <div className="space-y-5">
      {/* Кнопка «Назад» */}
      <Button variant="ghost" onClick={onBack} className="text-gray-500 hover:text-gray-800 -ml-2 transition-all duration-200">
        <ArrowLeft className="w-4 h-4 mr-1.5" />
        {tr('back_to_orders')}
      </Button>

      {/* Шапка заказа */}
      <Card className="bg-white shadow-sm hover:shadow-md transition-all duration-200">
        <CardContent className="p-5 space-y-5">
          {/* Заголовок + статус (выпадающий список) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                  {order.id}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="cursor-pointer">
                      <Badge variant="outline" className={cn('cursor-pointer transition-all duration-150 hover:shadow-sm', statusBadgeStyles[order.status])}>
                        {order.status}
                      </Badge>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    {statusSteps.map((s) => (
                      <DropdownMenuItem
                        key={s}
                        onClick={() => handleStatusChange(s)}
                        className={cn(
                          'flex items-center gap-2 cursor-pointer',
                          s === order.status && 'bg-gray-50'
                        )}
                      >
                        <span className={cn('w-2 h-2 rounded-full', statusDotColors[s])} />
                        {s}
                        {s === order.status && (
                          <Check className="w-3.5 h-3.5 text-gray-400 ml-auto" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <h1 className="text-lg font-semibold text-gray-900">{order.name}</h1>
            </div>
          </div>

          {/* Прогресс-бар статусов — кликабельные кружочки */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              {statusSteps.map((step, i) => (
                <React.Fragment key={step}>
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <button
                      onClick={() => handleStatusChange(step)}
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 border-2 outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2',
                        i <= currentStepIndex
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-200 hover:bg-emerald-700 hover:shadow-md hover:scale-110 cursor-pointer'
                          : 'bg-white text-gray-400 border-gray-300 hover:border-emerald-400 hover:text-emerald-600 hover:shadow-sm cursor-pointer'
                      )}
                      title={`${tr('toast_status_changed')} «${step}»`}
                    >
                      {i < currentStepIndex ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <span>{i + 1}</span>
                      )}
                    </button>
                    <span
                      className={cn(
                        'text-[10px] font-medium text-center leading-tight transition-colors duration-300',
                        i <= currentStepIndex ? 'text-emerald-700' : 'text-gray-400'
                      )}
                    >
                      {step}
                    </span>
                  </div>
                </React.Fragment>
              ))}
            </div>
            <Progress value={progressPercent} className="h-1.5" />
          </div>

          <Separator />

          {/* Финансовая сводка */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-gray-50">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{tr('order_amount')}</p>
              <p className="text-xl font-bold text-gray-900">{formatUAH(order.orderAmount)}</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{tr('planned_margin')}</p>
              <p
                className={cn(
                  'text-xl font-bold',
                  plannedMargin >= 20 ? 'text-emerald-600' : plannedMargin >= 10 ? 'text-amber-600' : 'text-red-600'
                )}
              >
                {plannedMargin}%
              </p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{tr('actual_margin')}</p>
              <p
                className={cn(
                  'text-xl font-bold',
                  actualMargin >= 20 ? 'text-emerald-600' : actualMargin >= 10 ? 'text-amber-600' : 'text-red-600'
                )}
              >
                {totalFactBudget > 0 ? `${actualMargin}%` : '—'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{tr('cost')}</p>
              <p className="text-xl font-bold text-gray-900">{formatUAH(totalCost)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Вкладки */}
      <Tabs defaultValue="spec" className="w-full">
        <TabsList className="bg-white border border-gray-200 p-0.5 h-10">
          <TabsTrigger
            value="spec"
            className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-md px-4 text-sm"
          >
            {tr('tab_spec')}
          </TabsTrigger>
          <TabsTrigger
            value="timeline"
            className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-md px-4 text-sm"
          >
            {tr('tab_timeline')}
          </TabsTrigger>
          <TabsTrigger
            value="budget"
            className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-md px-4 text-sm"
          >
            {tr('tab_budget')}
          </TabsTrigger>
          <TabsTrigger
            value="order-calendar"
            className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-md px-4 text-sm"
          >
            {tr('tab_calendar')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="spec" className="mt-4">
          <SpecTab order={order} />
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <TimelineTab order={order} />
        </TabsContent>

        <TabsContent value="budget" className="mt-4">
          <BudgetTab order={order} />
        </TabsContent>

        <TabsContent value="order-calendar" className="mt-4">
          <OrderCalendarTab order={order} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
