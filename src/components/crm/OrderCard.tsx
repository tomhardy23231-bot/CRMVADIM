'use client';

import React from 'react';
import { useCRM } from '@/lib/crm-context';
import type { Order, OrderStatus } from '@/lib/crm-types';
import { formatUAH, calcMargin, calcSmartHybridCost, formatDateShort } from '@/lib/crm-utils';
import { ArrowLeft, Check, PackageX, Receipt, Pencil, CalendarDays, X, ChevronDown } from 'lucide-react';
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
import { Payments1CTab } from './tabs/Payments1CTab';

// ============================================================
// OrderCard — Карточка заказа с прогресс-баром, статусом, 4 вкладками
// ============================================================

const statusSteps: OrderStatus[] = [
  'Проектирование',
  'Закупка материалов',
  'В производстве',
  'Сборка',
  'Доставка',
  'Отгружен',
  'Рекламации',
  'Выполнен',
  'Оплачен'
];

const statusBadgeStyles: Record<string, string> = {
  'Проектирование': 'bg-slate-100 text-slate-700 border-slate-200',
  'Закупка материалов': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  'В производстве': 'bg-amber-100 text-amber-700 border-amber-200',
  'Сборка': 'bg-purple-100 text-purple-700 border-purple-200',
  'Доставка': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Отгружен': 'bg-blue-100 text-blue-700 border-blue-200',
  'Рекламации': 'bg-red-100 text-red-700 border-red-200',
  'Выполнен': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Оплачен': 'bg-green-100 text-green-700 border-green-200',
};

const statusDotColors: Record<string, string> = {
  'Проектирование': 'bg-slate-500',
  'Закупка материалов': 'bg-cyan-500',
  'В производстве': 'bg-amber-500',
  'Сборка': 'bg-purple-500',
  'Доставка': 'bg-indigo-500',
  'Отгружен': 'bg-blue-500',
  'Рекламации': 'bg-red-500',
  'Выполнен': 'bg-emerald-500',
  'Оплачен': 'bg-green-500',
};

const statusTranslateMap: Record<string, string> = {
  'Проектирование': 'status_design',
  'Закупка материалов': 'status_purchasing',
  'В производстве': 'status_production',
  'Сборка': 'status_assembly',
  'Доставка': 'status_delivery',
  'Отгружен': 'status_shipped',
  'Рекламации': 'status_claims',
  'Выполнен': 'status_completed',
  'Оплачен': 'status_paid',
};

interface OrderCardProps {
  orderId: string;
  onBack: () => void;
}

export function OrderCard({ orderId, onBack }: OrderCardProps) {
  const { orders, updateOrderStatus, updateOrderAmount, updateOrderPaymentDate, tr } = useCRM();
  const order = orders.find((o) => o.id === orderId);

  const [isEditingAmount, setIsEditingAmount] = React.useState(false);
  const [amountValue, setAmountValue] = React.useState(order?.orderAmount || 0);
  const [isEditingPaymentDate, setIsEditingPaymentDate] = React.useState(false);
  const [paymentDateValue, setPaymentDateValue] = React.useState(order?.expectedPaymentDate || '');

  React.useEffect(() => {
    if (order && !isEditingAmount) {
      setAmountValue(order.orderAmount);
    }
    if (order && !isEditingPaymentDate) {
      setPaymentDateValue(order.expectedPaymentDate || '');
    }
  }, [order, isEditingAmount, isEditingPaymentDate]);

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
  const totalExpenseBudget = order.budgetItems.filter(b => !b.isIncome).reduce((sum, b) => sum + b.plan, 0);
  
  const totalFactExpense = order.budgetItems.filter(b => !b.isIncome).reduce((sum, b) => {
    if (b.name === 'Материалы (План)') {
      return sum + b.fact;
    }
    const linkedPayments = (order.payments || []).filter(p => p.budgetItemId === b.id);
    const paymentsSum = linkedPayments.reduce((acc, p) => acc + p.expense, 0);
    return sum + paymentsSum;
  }, 0);
  
  const totalCost = calcSmartHybridCost(order);
  const totalFactCost = totalFactExpense;
  
  const plannedMargin = calcMargin(order.orderAmount, totalExpenseBudget);
  const actualMargin = calcMargin(order.orderAmount, totalCost);

  // Обработчик смены статуса
  const handleStatusChange = (newStatus: OrderStatus) => {
    updateOrderStatus(order.id, newStatus);
    toast.success(`${tr('toast_status_changed')} "${newStatus}"`);
  };

  return (
    <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-[1fr_320px] lg:gap-6 lg:items-start">
      {/* === LEFT COLUMN (Основной контент) === */}
      <div className="space-y-3 lg:space-y-4 min-w-0">
        
        {/* Кнопка «Назад» */}
        <Button variant="ghost" onClick={onBack} className="h-8 px-3 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md shadow-sm transition-all duration-200 w-fit group">
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5 group-hover:-translate-x-0.5 transition-transform" />
          {tr('back_to_orders')}
        </Button>

        <Card className="bg-white/80 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-200 border-gray-200/60">
          <CardContent className="p-3">

            {/* ===== МОБИЛЬНЫЙ: Ультракомпактный хедер ===== */}
            <div className="lg:hidden space-y-2">

              {/* Строка 1: Название + статус */}
              <div className="flex items-center justify-between gap-2">
                <h1 className="text-sm font-bold text-gray-900 leading-tight truncate flex-1 min-w-0">{order.name}</h1>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="cursor-pointer flex items-center gap-0.5 shrink-0">
                      <Badge variant="outline" className={cn('cursor-pointer text-[10px] py-0 px-2 h-5 font-semibold', statusBadgeStyles[order.status])}>
                        {tr(statusTranslateMap[order.status] || order.status)}
                      </Badge>
                      <ChevronDown className="w-3 h-3 text-gray-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {statusSteps.map((s) => (
                      <DropdownMenuItem
                        key={s}
                        onClick={() => handleStatusChange(s)}
                        className={cn('flex items-center gap-2 cursor-pointer', s === order.status && 'bg-gray-50')}
                      >
                        <span className={cn('w-2 h-2 rounded-full', statusDotColors[s])} />
                        {tr(statusTranslateMap[s] || s)}
                        {s === order.status && <Check className="w-3.5 h-3.5 text-gray-400 ml-auto" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Строка 2: Прогресс-бар (тонкий, без лейбла — счётчик встроен) */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#426BB3] to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-[9px] font-bold text-gray-400 shrink-0">{currentStepIndex + 1}/{statusSteps.length}</span>
              </div>

              {/* Строка 3: Финансы — 4 чипа в одну строку */}
              <div className="flex items-stretch gap-1.5 pt-1 border-t border-gray-100">
                {/* Сумма — занимает больше места */}
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] text-gray-400 uppercase tracking-wide leading-none mb-0.5">Сумма</p>
                  <div className="flex items-center gap-1">
                    {isEditingAmount ? (
                      <div className="flex items-center gap-1 w-full">
                        <input
                          type="number"
                          className="w-full bg-white border border-emerald-400 rounded px-1.5 py-0.5 text-xs font-bold text-gray-900 outline-none"
                          value={amountValue || ''}
                          onChange={(e) => setAmountValue(Number(e.target.value))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { updateOrderAmount(order.id, amountValue); setIsEditingAmount(false); }
                            else if (e.key === 'Escape') { setAmountValue(order.orderAmount); setIsEditingAmount(false); }
                          }}
                          autoFocus
                        />
                        <button onClick={() => { updateOrderAmount(order.id, amountValue); setIsEditingAmount(false); }}
                          className="p-0.5 px-1 bg-emerald-500 text-white rounded shrink-0">
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => setIsEditingAmount(true)}
                          className={cn("text-sm font-black leading-none truncate", order.isAmountManual ? "text-emerald-600" : "text-red-500")}
                        >
                          {formatUAH(order.orderAmount)}
                        </button>
                      </>
                    )}
                  </div>
                  {/* Дата оплаты */}
                  {!isEditingAmount && (
                    <div className="mt-0.5">
                      {isEditingPaymentDate ? (
                        <div className="flex items-center gap-1">
                          <input type="date"
                            className="bg-white border border-indigo-400 rounded px-1 py-0.5 text-[10px] text-gray-700 outline-none w-full"
                            value={paymentDateValue}
                            onChange={(e) => setPaymentDateValue(e.target.value)}
                            autoFocus
                          />
                          <button onClick={() => { updateOrderPaymentDate(order.id, paymentDateValue || null); setIsEditingPaymentDate(false); }}
                            className="p-0.5 px-1 bg-indigo-500 text-white rounded shrink-0">
                            <Check className="w-2.5 h-2.5" />
                          </button>
                          {order.expectedPaymentDate && (
                            <button onClick={() => { updateOrderPaymentDate(order.id, null); setPaymentDateValue(''); setIsEditingPaymentDate(false); }}
                              className="p-0.5 px-1 bg-red-100 text-red-600 rounded shrink-0">
                              <X className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => setIsEditingPaymentDate(true)}
                          className={cn(
                            'flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded',
                            order.expectedPaymentDate
                              ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                              : 'text-gray-400 border border-dashed border-gray-200'
                          )}
                        >
                          <CalendarDays className="w-2.5 h-2.5" />
                          {order.expectedPaymentDate ? formatDateShort(order.expectedPaymentDate) : '+ Дата'}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Разделитель */}
                <div className="w-px bg-gray-100 self-stretch" />

                {/* Плановая маржа */}
                <div className="shrink-0 text-center px-1">
                  <p className="text-[9px] text-gray-400 leading-none mb-0.5 whitespace-nowrap">План.М</p>
                  <p className={cn('text-sm font-black', plannedMargin >= 20 ? 'text-emerald-600' : plannedMargin >= 10 ? 'text-amber-600' : 'text-red-600')}>
                    {plannedMargin}%
                  </p>
                </div>

                {/* Разделитель */}
                <div className="w-px bg-gray-100 self-stretch" />

                {/* Факт маржа */}
                <div className="shrink-0 text-center px-1">
                  <p className="text-[9px] text-gray-400 leading-none mb-0.5 whitespace-nowrap">Факт.М</p>
                  <p className={cn('text-sm font-black', actualMargin >= 20 ? 'text-emerald-600' : actualMargin >= 10 ? 'text-amber-600' : 'text-red-600')}>
                    {totalFactCost > 0 ? `${actualMargin}%` : '—'}
                  </p>
                </div>

                {/* Разделитель */}
                <div className="w-px bg-gray-100 self-stretch" />

                {/* Себестоимость */}
                <div className="shrink-0 text-right px-1">
                  <p className="text-[9px] text-gray-400 leading-none mb-0.5">СС</p>
                  <p className="text-sm font-black text-gray-700">{formatUAH(totalCost)}</p>
                </div>
              </div>
            </div>

            {/* ===== ДЕСКТОП: Без изменений ===== */}
            <div className="hidden lg:block space-y-3">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    ID: {order.externalId || order.id.slice(0, 8)}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="cursor-pointer flex items-center gap-1">
                        <Badge variant="outline" className={cn('cursor-pointer transition-all duration-150 hover:shadow-sm', statusBadgeStyles[order.status])}>
                          {tr(statusTranslateMap[order.status] || order.status)}
                        </Badge>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      {statusSteps.map((s) => (
                        <DropdownMenuItem key={s} onClick={() => handleStatusChange(s)}
                          className={cn('flex items-center gap-2 cursor-pointer', s === order.status && 'bg-gray-50')}>
                          <span className={cn('w-2 h-2 rounded-full', statusDotColors[s])} />
                          {tr(statusTranslateMap[s] || s)}
                          {s === order.status && <Check className="w-3.5 h-3.5 text-gray-400 ml-auto" />}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <h1 className="text-base font-semibold text-gray-900 leading-tight">{order.name}</h1>
              </div>

              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-gray-100">
                {/* Сумма заказа */}
                <div className="p-2 group border border-transparent hover:border-gray-200 transition-colors rounded-lg">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">{tr('order_amount')}</p>
                    {!isEditingAmount && (
                      <button onClick={() => setIsEditingAmount(true)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white hover:bg-gray-200 rounded text-gray-500 shadow-sm">
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {isEditingAmount ? (
                    <div className="flex items-center gap-1.5">
                      <input type="number"
                        className="w-full bg-white border border-emerald-400 rounded px-2 py-1 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-emerald-400/50"
                        value={amountValue || ''} onChange={(e) => setAmountValue(Number(e.target.value))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { updateOrderAmount(order.id, amountValue); setIsEditingAmount(false); }
                          else if (e.key === 'Escape') { setAmountValue(order.orderAmount); setIsEditingAmount(false); }
                        }} autoFocus />
                      <button onClick={() => { updateOrderAmount(order.id, amountValue); setIsEditingAmount(false); }}
                        className="p-1 px-1.5 bg-emerald-500 text-white rounded hover:bg-emerald-600 shadow-sm shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className={cn("text-base font-bold", order.isAmountManual ? "text-emerald-600" : "text-red-500")}>
                        {formatUAH(order.orderAmount)}
                      </p>
                      <div className="mt-1">
                        {isEditingPaymentDate ? (
                          <div className="flex items-center gap-1">
                            <input type="date"
                              className="bg-white border border-indigo-400 rounded px-1.5 py-0.5 text-xs font-medium text-gray-700 outline-none focus:ring-2 focus:ring-indigo-400/50 w-full"
                              value={paymentDateValue} onChange={(e) => setPaymentDateValue(e.target.value)} autoFocus />
                            <button onClick={() => { updateOrderPaymentDate(order.id, paymentDateValue || null); setIsEditingPaymentDate(false); }}
                              className="p-0.5 px-1 bg-indigo-500 text-white rounded hover:bg-indigo-600 shadow-sm shrink-0">
                              <Check className="w-3 h-3" />
                            </button>
                            {order.expectedPaymentDate && (
                              <button onClick={() => { updateOrderPaymentDate(order.id, null); setPaymentDateValue(''); setIsEditingPaymentDate(false); }}
                                className="p-0.5 px-1 bg-red-100 text-red-600 rounded hover:bg-red-200 shadow-sm shrink-0" title="Убрать дату">
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <button onClick={() => setIsEditingPaymentDate(true)}
                            className={cn('flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded transition-all duration-150',
                              order.expectedPaymentDate
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-gray-50 text-gray-400 border border-dashed border-gray-300')}>
                            <CalendarDays className="w-3 h-3" />
                            {order.expectedPaymentDate ? formatDateShort(order.expectedPaymentDate) : '+ Дата оплаты'}
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className="p-2">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide leading-none mb-1">{tr('planned_margin')}</p>
                  <p className={cn('text-base font-bold', plannedMargin >= 20 ? 'text-emerald-600' : plannedMargin >= 10 ? 'text-amber-600' : 'text-red-600')}>
                    {plannedMargin}%
                  </p>
                </div>

                <div className="p-2">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide leading-none mb-1">{tr('actual_margin')}</p>
                  <p className={cn('text-base font-bold', actualMargin >= 20 ? 'text-emerald-600' : actualMargin >= 10 ? 'text-amber-600' : 'text-red-600')}>
                    {totalFactCost > 0 ? `${actualMargin}%` : '—'}
                  </p>
                </div>

                <div className="p-2">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide leading-none mb-1">{tr('cost')}</p>
                  <p className="text-base font-bold text-gray-900">{formatUAH(totalCost)}</p>
                </div>
              </div>
            </div>

          </CardContent>
        </Card>

      {/* Вкладки — scrollable на мобильном */}
      <Tabs defaultValue="spec" className="w-full">
        <div className="overflow-x-auto mobile-hide-scrollbar -mx-3 px-3 lg:mx-0 lg:px-0">
          <TabsList className="bg-white border border-gray-200 p-0.5 h-9 lg:h-8 w-max lg:w-auto">
            <TabsTrigger
              value="spec"
              className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-md px-3 text-xs whitespace-nowrap"
            >
              {tr('tab_spec')}
            </TabsTrigger>
            <TabsTrigger
              value="budget"
              className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-md px-3 text-xs whitespace-nowrap"
            >
              {tr('tab_budget')}
            </TabsTrigger>
            <TabsTrigger
              value="payments"
              className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-md px-3 text-xs font-semibold flex items-center gap-1 whitespace-nowrap"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Оплаты План-Факт</span>
              <span className="sm:hidden">Оплаты</span>
            </TabsTrigger>
            <TabsTrigger
              value="order-calendar"
              className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-md px-3 text-xs whitespace-nowrap"
            >
              {tr('tab_calendar')}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="spec" className="mt-3 lg:mt-4">
          <SpecTab order={order} />
        </TabsContent>

        <TabsContent value="budget" className="mt-3 lg:mt-4">
          <BudgetTab order={order} />
        </TabsContent>

        <TabsContent value="payments" className="mt-3 lg:mt-4">
          <Payments1CTab order={order} />
        </TabsContent>

        <TabsContent value="order-calendar" className="mt-3 lg:mt-4">
          <OrderCalendarTab order={order} />
        </TabsContent>
      </Tabs>
      </div>

      {/* === RIGHT COLUMN (Sidebar: Статусы + Таймлайн) === */}
      <div className="flex flex-col gap-3 lg:gap-4 lg:sticky lg:top-4">
        
        {/* Статусный трекер — горизонтальный скролл на мобильном, вертикальный на десктопе */}
        <Card className="bg-white shadow-sm border-gray-200/60 transition-all duration-200 hover:shadow-md">
          <CardContent className="p-3 lg:p-4">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 lg:mb-4">Текущий этап</h2>
            
            {/* Мобильный: горизонтальные пилсы */}
            <div className="lg:hidden">
              <div className="mobile-status-scroll">
                {statusSteps.map((step, i) => {
                  const isCompleted = i < currentStepIndex;
                  const isCurrent = i === currentStepIndex;
                  return (
                    <button
                      key={step}
                      onClick={() => handleStatusChange(step)}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium border transition-all min-h-[32px]',
                        isCompleted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        isCurrent ? 'bg-[#426BB3] text-white border-[#426BB3] shadow-md shadow-blue-200' :
                        'bg-gray-50 text-gray-400 border-gray-200'
                      )}
                    >
                      {isCompleted && <Check className="w-3 h-3" />}
                      {isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                      {tr(statusTranslateMap[step] || step)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Десктоп: вертикальный трекер */}
            <div className="hidden lg:block space-y-3">
              {statusSteps.map((step, i) => {
                const isCompleted = i < currentStepIndex;
                const isCurrent = i === currentStepIndex;
                const isFuture = i > currentStepIndex;

                return (
                  <div key={step} className="flex items-start gap-3 relative group">
                    {/* Линия соединения (кроме последнего) */}
                    {i < statusSteps.length - 1 && (
                      <div className={cn(
                        "absolute left-3 top-7 bottom-[-12px] w-[2px] transition-colors duration-500",
                        isCompleted ? "bg-emerald-500" : "bg-gray-100"
                      )} />
                    )}
                    
                    {/* Круглая иконка */}
                    <button
                      onClick={() => handleStatusChange(step)}
                      className={cn(
                        "relative z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-300",
                        isCompleted ? "bg-emerald-500 border-emerald-500 text-white" :
                        isCurrent ? "bg-white border-emerald-500 ring-4 ring-emerald-50" :
                        "bg-white border-gray-200 group-hover:border-emerald-300"
                      )}
                      title={`Сменить на "${step}"`}
                    >
                      {isCompleted || (isCurrent && i === statusSteps.length - 1) ? <Check className="w-3.5 h-3.5" /> : 
                       isCurrent ? <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> : 
                       <div className="w-1.5 h-1.5 rounded-full bg-gray-200 group-hover:bg-emerald-300" />}
                    </button>
                    
                    {/* Текст */}
                    <div className="flex-1 pt-0.5 pb-1">
                      <p className={cn(
                        "text-sm font-medium transition-colors cursor-pointer",
                        isCompleted ? "text-gray-900" :
                        isCurrent ? "text-emerald-700" :
                        "text-gray-400 group-hover:text-gray-600"
                      )}
                      onClick={() => handleStatusChange(step)}
                      >
                        {tr(statusTranslateMap[step] || step)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Блок Таймлайна */}
        <div className="transition-all duration-200">
          <TimelineTab order={order} />
        </div>

      </div>
    </div>
  );
}
