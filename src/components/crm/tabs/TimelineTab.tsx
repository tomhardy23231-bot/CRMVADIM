'use client';

import React from 'react';
import type { Order } from '@/lib/crm-types';
import { useCRM } from '@/lib/crm-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, Clock, Flag, Truck, Check } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

// ============================================================
// TimelineTab — Вкладка «Таймлайн»:
// 4 контролируемых DatePicker + чекбоксы «Выполнено» (Факт)
// ============================================================

interface DateFieldProps {
  label: string;
  value: string;
  icon: React.ElementType;
  onChange: (value: string) => void;
  completed: boolean;
  completedLabel: string;
  onToggleCompleted: () => void;
}

/** Компонент строки даты (контролируемый) с чекбоксом выполнения */
function DateField({ label, value, icon: Icon, onChange, completed, completedLabel, onToggleCompleted }: DateFieldProps) {
  return (
    <div className={cn(
      'flex flex-col sm:flex-row sm:items-center gap-2 p-4 rounded-lg border transition-all duration-200',
      completed
        ? 'bg-emerald-50/60 border-emerald-200'
        : 'bg-gray-50 border-transparent hover:bg-gray-100'
    )}>
      <div className="flex items-center gap-2 shrink-0 min-w-[180px]">
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center border shadow-sm transition-all duration-200',
          completed
            ? 'bg-emerald-100 border-emerald-300'
            : 'bg-white border-gray-200'
        )}>
          <Icon className={cn(
            'w-4 h-4 transition-colors',
            completed ? 'text-emerald-600' : 'text-gray-500'
          )} />
        </div>
        <Label className={cn(
          'text-sm font-medium transition-colors',
          completed ? 'text-emerald-700' : 'text-gray-700'
        )}>
          {label}
        </Label>
      </div>
      <div className="flex items-center gap-3 flex-1">
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={completed}
          className={cn(
            'flex-1 h-10 px-3 rounded-md border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all',
            completed
              ? 'border-emerald-200 text-gray-400 cursor-not-allowed line-through'
              : 'border-gray-300 text-gray-800'
          )}
        />
        <div className="flex items-center gap-2 shrink-0">
          <Checkbox
            checked={completed}
            onCheckedChange={onToggleCompleted}
            className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
          />
          <span className={cn(
            'text-xs font-medium transition-colors whitespace-nowrap',
            completed ? 'text-emerald-600' : 'text-gray-500'
          )}>
            {completedLabel}
          </span>
          {completed && (
            <Check className="w-3.5 h-3.5 text-emerald-500" />
          )}
        </div>
      </div>
    </div>
  );
}

interface TimelineTabProps {
  order: Order;
}

export function TimelineTab({ order }: TimelineTabProps) {
  const { tr, updateOrderDates, toggleStageFlag } = useCRM();

  // Вычисляем длительность в днях
  const start = new Date(order.productionStart);
  const end = new Date(order.deadline);
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  const handleDateChange = (field: 'productionStart' | 'assemblyStart' | 'shippingStart' | 'deadline') => (value: string) => {
    updateOrderDates(order.id, { [field]: value });
  };

  const completedCount = [order.isProductionStarted, order.isAssemblyStarted, order.isShipped].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <Card className="bg-white shadow-sm hover:shadow-md transition-all duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <CalendarDays className="w-4.5 h-4.5 text-gray-500" />
              {tr('tab_timeline')}
            </CardTitle>
            {completedCount > 0 && (
              <span className={cn(
                'text-xs font-semibold px-2.5 py-1 rounded-full',
                completedCount === 3
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              )}>
                {completedCount}/3 {tr('completed').toLowerCase()}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <DateField
            label={tr('production_start')}
            value={order.productionStart}
            icon={Clock}
            onChange={handleDateChange('productionStart')}
            completed={!!order.isProductionStarted}
            completedLabel={tr('completed')}
            onToggleCompleted={() => toggleStageFlag(order.id, 'isProductionStarted')}
          />
          <DateField
            label={tr('assembly_start')}
            value={order.assemblyStart}
            icon={Flag}
            onChange={handleDateChange('assemblyStart')}
            completed={!!order.isAssemblyStarted}
            completedLabel={tr('completed')}
            onToggleCompleted={() => toggleStageFlag(order.id, 'isAssemblyStarted')}
          />
          <DateField
            label={tr('shipping_start')}
            value={order.shippingStart}
            icon={Truck}
            onChange={handleDateChange('shippingStart')}
            completed={!!order.isShipped}
            completedLabel={tr('completed')}
            onToggleCompleted={() => toggleStageFlag(order.id, 'isShipped')}
          />
          <DateField
            label={tr('shipping_deadline')}
            value={order.deadline}
            icon={Flag}
            onChange={handleDateChange('deadline')}
            completed={false}
            completedLabel={tr('completed')}
            onToggleCompleted={() => {}}
          />

          {/* Информация о длительности */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-sm text-emerald-800">
              <span className="font-semibold">{tr('total_production_days')}:</span>{' '}
              {days} {tr('days')} ({Math.ceil(days / 7)} {tr('weeks_short')})
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
