'use client';

import React, { useState, useCallback } from 'react';
import type { Order } from '@/lib/crm-types';
import { useCRM } from '@/lib/crm-context';
import { formatUAH, calcDeviation, dateToWeekValue, formatDateShort } from '@/lib/crm-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ChevronDown, ChevronRight, Plus, Trash2, Lock, Calculator, Receipt, AlertTriangle, CircleDollarSign, FileDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ============================================================
// BudgetTab — Вкладка «Бюджетирование» с CRUD статей + транши
// ============================================================

interface BudgetTabProps {
  order: Order;
}

export function BudgetTab({ order }: BudgetTabProps) {
  const {
    updateBudgetItemPlan,
    updateBudgetItemDate,
    updateTranche,
    addTranche,
    removeTranche,
    toggleTranches,
    addBudgetItem,
    removeBudgetItem,
    tr,
    lang,
  } = useCRM();

  // Модалка добавления статьи
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemIsIncome, setNewItemIsIncome] = useState(false);

  // Исключаем системные статьи из интерфейса вкладки "Бюджетирование", чтобы они не мешали (оставляем их только для расчета маржи в шапке)
  const visibleItems = order.budgetItems.filter(b => b.name !== 'Материалы (План)' && b.name !== 'Оплата от клиента');
  const expenseItems = visibleItems.filter((b) => !b.isIncome);
  const incomeItems = visibleItems.filter((b) => b.isIncome);

  // Функция для расчета Факта из привязанных платежей 1С
  const calculateFact = (itemId: string, isIncome: boolean, itemName: string) => {
    if (!isIncome && itemName === 'Материалы (План)') {
      const item = order.budgetItems.find(b => b.id === itemId);
      return item ? item.fact : 0;
    }
    const linkedPayments = order.payments?.filter(p => p.budgetItemId === itemId) || [];
    return linkedPayments.reduce((sum, p) => sum + (isIncome ? p.income : p.expense), 0);
  };

  // Общие итоги (только расходы)
  const totalPlan = expenseItems.reduce((sum, b) => sum + b.plan, 0);
  const totalFact = expenseItems.reduce((sum, b) => sum + calculateFact(b.id, false, b.name), 0);
  const totalDeviation = totalPlan - totalFact;

  const handleAddTranche = (itemId: string) => {
    addTranche(order.id, itemId);
    toast.success(tr('toast_tranche_added'));
  };

  const handleRemoveTranche = (itemId: string, trancheId: string) => {
    removeTranche(order.id, itemId, trancheId);
    toast.info(tr('toast_tranche_removed'));
  };

  const handleAddItem = () => {
    if (!newItemName.trim()) return;
    addBudgetItem(order.id, newItemName.trim(), newItemIsIncome);
    setNewItemName('');
    setNewItemIsIncome(false);
    setAddDialogOpen(false);
    toast.success(tr('toast_budget_item_added'));
  };

  const handleRemoveItem = (itemId: string) => {
    removeBudgetItem(order.id, itemId);
    toast.info(tr('toast_budget_item_removed'));
  };

  // Экспорт бюджета в Excel
  const handleExportExcel = useCallback(async () => {
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      // Данные для листа
      const rows = [
        ['Бюджет тендера:', order.name],
        ['Дата экспорта:', new Date().toLocaleDateString('ru-RU')],
        [],
        ['Статья', 'Тип', 'План (₴)', 'Факт из 1С (₴)', 'Отклонение (₴)'],
      ];

      for (const item of visibleItems) {
        const fact = calculateFact(item.id, !!item.isIncome, item.name);
        const deviation = item.plan - fact;
        rows.push([
          item.name,
          item.isIncome ? 'Доход' : 'Расход',
          item.plan as any,
          fact as any,
          deviation as any,
        ]);

        // Транши (если есть)
        if (item.tranches && item.tranches.length > 0) {
          for (const tr of item.tranches) {
            rows.push([
              `  └ Транш: ${tr.month}`,
              '',
              tr.amount as any,
              '' as any,
              '' as any,
            ]);
          }
        }
      }

      // Итого
      rows.push([]);
      rows.push(['ИТОГО Расходы (План)', '', totalPlan as any, totalFact as any, (totalPlan - totalFact) as any]);

      const ws = XLSX.utils.aoa_to_sheet(rows);

      // Ширина колонок
      ws['!cols'] = [
        { wch: 35 },
        { wch: 10 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Бюджет');
      XLSX.writeFile(wb, `Бюджет_${order.name.replace(/[^a-zA-Zа-яА-ЯіІїЇєЄґҐ0-9]/g, '_')}.xlsx`);
      toast.success('Excel файл скачан!');
    } catch (err) {
      toast.error('Ошибка экспорта в Excel');
      console.error(err);
    }
  }, [order, calculateFact, totalPlan, totalFact]);

  return (
    <div className="space-y-3 lg:space-y-4">
      <Card className="bg-white shadow-sm hover:shadow-md transition-all duration-200">
        <CardHeader className="pb-3 px-3 lg:px-6">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="flex items-center gap-2 text-sm lg:text-base font-semibold">
              <Calculator className="w-4 h-4 lg:w-4.5 lg:h-4.5 text-gray-500" />
              {tr('budget_title')}
            </CardTitle>
            <div className="flex items-center gap-1.5 lg:gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[11px] lg:text-xs gap-1 border-gray-300 text-gray-600 hover:bg-gray-50 transition-all duration-150"
                onClick={handleExportExcel}
              >
                <FileDown className="w-3.5 h-3.5" />
                Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[11px] lg:text-xs gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition-all duration-150"
                onClick={() => { setNewItemIsIncome(false); setAddDialogOpen(true); }}
              >
                <Plus className="w-3.5 h-3.5" />
                {tr('add_expense')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[11px] lg:text-xs gap-1 border-blue-300 text-blue-700 hover:bg-blue-50 transition-all duration-150"
                onClick={() => { setNewItemIsIncome(true); setAddDialogOpen(true); }}
              >
                <CircleDollarSign className="w-3.5 h-3.5" />
                {tr('add_income')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {visibleItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 lg:py-16 text-gray-400">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                <Receipt className="w-6 h-6 lg:w-7 lg:h-7 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">{tr('no_expenses')}</p>
              <p className="text-xs text-gray-400 mt-1">{tr('no_expenses_desc')}</p>
            </div>
          ) : (
            <>
              {/* ===== МОБИЛЬНОЕ представление — карточки ===== */}
              <div className="lg:hidden space-y-2 px-3 pb-3">
                {visibleItems.map((item) => {
                  const calculatedFact = calculateFact(item.id, !!item.isIncome, item.name);
                  const deviation = calcDeviation(item.plan, calculatedFact);
                  const hasTranches = item.tranches && item.tranches.length > 0;
                  const tranchesTotal = hasTranches
                    ? item.tranches!.reduce((sum, tt) => sum + tt.amount, 0)
                    : 0;
                  const remaining = item.plan - tranchesTotal;
                  const isOverBudget = remaining < 0;

                  return (
                    <div key={item.id} className="border border-gray-100 rounded-xl bg-gray-50/30 overflow-hidden">
                      {/* Header */}
                      <div className="p-3 flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {item.isIncome && <CircleDollarSign className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                          {isOverBudget && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                          <span className="text-sm font-medium text-gray-800 truncate">{item.name}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-gray-300 active:text-red-500 transition-colors shrink-0 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Numbers grid */}
                      <div className="grid grid-cols-3 gap-px bg-gray-100">
                        <div className="bg-white p-2.5">
                          <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-0.5">{tr('plan')}</p>
                          <Input
                            type="number"
                            value={item.plan}
                            onChange={(e) =>
                              updateBudgetItemPlan(
                                order.id,
                                item.id,
                                Math.max(0, Number(e.target.value))
                              )
                            }
                            className="h-7 text-right text-sm font-semibold p-1 border-gray-200"
                          />
                        </div>
                        <div className="bg-white p-2.5">
                          <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-0.5">{tr('fact_from_1c')}</p>
                          <div className="flex items-center gap-1 h-7 justify-end">
                            <Receipt className="w-2.5 h-2.5 text-blue-500" />
                            <span className="text-sm font-semibold text-gray-700">{formatUAH(calculatedFact)}</span>
                          </div>
                        </div>
                        <div className="bg-white p-2.5">
                          <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-0.5">{tr('deviation')}</p>
                          <p className={cn(
                            'text-sm font-semibold text-right h-7 flex items-center justify-end',
                            deviation > 0 ? 'text-emerald-600' : deviation < 0 ? 'text-red-600' : 'text-gray-400'
                          )}>
                            {deviation > 0 ? '+' : ''}{formatUAH(deviation)}
                          </p>
                        </div>
                      </div>

                      {/* Date picker (if no tranches expanded) */}
                      {!item.hasTranches && (
                        <div className="px-3 py-2 border-t border-gray-100">
                          <input
                            type="date"
                            value={item.tranches?.[0]?.plannedDate || ''}
                            onChange={(e) => {
                              updateBudgetItemDate(order.id, item.id, e.target.value, item.plan);
                            }}
                            className="h-8 w-full text-xs border border-gray-200 rounded-lg px-2 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/50 outline-none transition-colors text-gray-500"
                            title={tr("date_single_tranche") || "Указать планируемую дату"}
                          />
                        </div>
                      )}

                      {/* Tranches toggle */}
                      {hasTranches && (
                        <button
                          onClick={() => toggleTranches(order.id, item.id)}
                          className="w-full px-3 py-2 border-t border-gray-100 flex items-center gap-1.5 text-xs text-emerald-600 font-medium active:bg-emerald-50 transition-colors"
                        >
                          {item.hasTranches ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          {tr('split_to_tranches')} ({item.tranches!.length})
                        </button>
                      )}

                      {/* Expanded tranches */}
                      {item.hasTranches && hasTranches && (
                        <div className="border-t border-gray-100 bg-white">
                          {item.tranches!.map((tranche) => (
                            <div key={tranche.id} className="flex items-center gap-2 px-3 py-2 border-b border-gray-50">
                              <input
                                type="date"
                                value={tranche.plannedDate || ''}
                                onChange={(e) => {
                                  const newDate = e.target.value;
                                  const weekVal = dateToWeekValue(newDate);
                                  updateTranche(order.id, item.id, tranche.id, {
                                    plannedDate: newDate,
                                    month: weekVal || tranche.month,
                                  });
                                }}
                                className="h-7 flex-1 text-xs border border-gray-200 rounded px-2 bg-white focus:border-indigo-400 outline-none transition-colors"
                              />
                              <Input
                                type="number"
                                value={tranche.amount}
                                onChange={(e) =>
                                  updateTranche(order.id, item.id, tranche.id, {
                                    amount: Math.max(0, Number(e.target.value)),
                                  })
                                }
                                className={cn(
                                  'h-7 w-24 text-right text-xs',
                                  isOverBudget ? 'border-red-500 bg-red-50/50' : ''
                                )}
                                placeholder="0"
                              />
                              <span className="text-xs text-gray-400">₴</span>
                              <button
                                onClick={() => handleRemoveTranche(item.id, tranche.id)}
                                className="text-gray-400 active:text-red-500 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                          <div className="px-3 py-2 flex items-center justify-between">
                            <span className={cn(
                              'text-xs font-semibold',
                              isOverBudget ? 'text-red-600' : remaining === 0 ? 'text-emerald-600' : 'text-amber-600'
                            )}>
                              {tr('remaining')}: {formatUAH(remaining)}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={remaining <= 0}
                              className="h-7 text-[11px] gap-1"
                              onClick={() => handleAddTranche(item.id)}
                            >
                              <Plus className="w-3 h-3" /> {tr('add_tranche')}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ===== ДЕСКТОПНОЕ представление — таблица ===== */}
              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-medium text-gray-500 w-[40%]">
                        {tr('expense_item')}
                      </TableHead>
                      <TableHead className="text-xs font-medium text-gray-500 text-right w-[20%]">
                        {tr('plan')}
                      </TableHead>
                      <TableHead className="text-xs font-medium text-gray-500 text-right w-[20%]">
                        {tr('fact_from_1c')}
                      </TableHead>
                      <TableHead className="text-xs font-medium text-gray-500 text-right w-[20%]">
                        {tr('deviation')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleItems.map((item) => {
                      const calculatedFact = calculateFact(item.id, !!item.isIncome, item.name);
                      const deviation = calcDeviation(item.plan, calculatedFact);
                      const hasTranches = item.tranches && item.tranches.length > 0;
                      const tranchesTotal = hasTranches
                        ? item.tranches!.reduce((sum, tt) => sum + tt.amount, 0)
                        : 0;
                      const remaining = item.plan - tranchesTotal;
                      const isOverBudget = remaining < 0;
                      const canAddTranche = remaining > 0;

                      return (
                        <React.Fragment key={item.id}>
                          {/* Основная строка статьи */}
                          <TableRow className="hover:bg-gray-50 transition-colors duration-150">
                            {/* Название + кнопка траншей */}
                            <TableCell className="text-sm text-gray-800 font-medium">
                              <div className="flex items-center gap-2">
                                {hasTranches && (
                                  <button
                                    onClick={() => toggleTranches(order.id, item.id)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                  >
                                    {item.hasTranches ? (
                                      <ChevronDown className="w-4 h-4" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4" />
                                    )}
                                  </button>
                                )}
                                {item.isIncome && (
                                  <CircleDollarSign className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                )}
                                <span>{item.name}</span>
                                {isOverBudget && (
                                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                                )}
                                <button
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="text-gray-300 hover:text-red-500 transition-colors ml-auto shrink-0"
                                  title="Удалить статью"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </TableCell>

                            {/* План (редактируемый Input) */}
                            <TableCell className="text-right">
                              <div className="flex flex-col gap-1 items-end ml-auto w-fit">
                                <Input
                                  type="number"
                                  value={item.plan}
                                  onChange={(e) =>
                                    updateBudgetItemPlan(
                                      order.id,
                                      item.id,
                                      Math.max(0, Number(e.target.value))
                                    )
                                  }
                                  className="h-8 w-28 text-right text-sm font-medium"
                                />
                                {!item.hasTranches && (
                                  <div className="relative">
                                    <input
                                      type="date"
                                      value={item.tranches?.[0]?.plannedDate || ''}
                                      onChange={(e) => {
                                        updateBudgetItemDate(order.id, item.id, e.target.value, item.plan);
                                      }}
                                      className="h-7 w-28 text-xs border border-gray-200 rounded px-1.5 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/50 outline-none transition-colors text-gray-500 cursor-pointer hover:border-gray-300"
                                      title={tr("date_single_tranche") || "Указать планируемую дату"}
                                    />
                                    {!item.tranches?.[0]?.plannedDate && (
                                      <div className="absolute inset-0 bg-gray-50/50 border border-dashed border-gray-300 pointer-events-none rounded flex items-center justify-center">
                                        <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap px-1 overflow-hidden">
                                          + {tr("date_select") || "Выбрать дату"}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </TableCell>

                            {/* Факт из 1С */}
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5 text-sm font-semibold text-gray-700 bg-gray-100/80 px-2 py-1 rounded w-fit ml-auto border border-gray-200" title="Сумируется из платежей 1С во вкладке 'Оплаты План-Факт'">
                                <Receipt className="w-3 h-3 text-blue-500" />
                                {formatUAH(calculatedFact)}
                              </div>
                            </TableCell>

                            {/* Отклонение */}
                            <TableCell
                              className={cn(
                                'text-right text-sm font-semibold',
                                deviation > 0
                                  ? 'text-emerald-600'
                                  : deviation < 0
                                    ? 'text-red-600'
                                    : 'text-gray-400'
                              )}
                            >
                              {deviation > 0 ? '+' : ''}
                              {formatUAH(deviation)}
                            </TableCell>
                          </TableRow>

                          {/* Раскрытые транши */}
                          {item.hasTranches && hasTranches && (
                            <>
                              <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                                <TableCell colSpan={4} className="px-0 py-0">
                                  <div className="mx-4 border-t border-dashed border-gray-300" />
                                </TableCell>
                              </TableRow>

                              {item.tranches!.map((tranche) => (
                                <TableRow key={tranche.id} className={cn(
                                  'transition-colors',
                                  isOverBudget
                                    ? 'bg-red-50/40 hover:bg-red-50/60'
                                    : 'bg-emerald-50/30 hover:bg-emerald-50/50'
                                )}>
                                  {/* Транш: название + неделя */}
                                  <TableCell className="pl-12">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-gray-500">{tr('tranche')}</span>
                                      <input
                                        type="date"
                                        value={tranche.plannedDate || ''}
                                        onChange={(e) => {
                                          const newDate = e.target.value;
                                          const weekVal = dateToWeekValue(newDate);
                                          updateTranche(order.id, item.id, tranche.id, {
                                            plannedDate: newDate,
                                            month: weekVal || tranche.month,
                                          });
                                        }}
                                        className="h-7 w-[140px] text-xs border border-gray-200 rounded px-2 bg-white hover:border-gray-300 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/50 outline-none transition-colors"
                                      />
                                      {tranche.plannedDate && (
                                        <span className="text-[10px] text-gray-400 font-medium">
                                          {formatDateShort(tranche.plannedDate)}
                                        </span>
                                      )}
                                    </div>
                                  </TableCell>

                                  {/* Сумма транша */}
                                  <TableCell className="text-right" colSpan={2}>
                                    <div className="flex items-center justify-end gap-2">
                                      <Input
                                        type="number"
                                        value={tranche.amount}
                                        onChange={(e) =>
                                          updateTranche(order.id, item.id, tranche.id, {
                                            amount: Math.max(0, Number(e.target.value)),
                                          })
                                        }
                                        aria-invalid={isOverBudget}
                                        className={cn(
                                          'h-7 w-28 text-right text-xs ml-auto',
                                          isOverBudget
                                            ? 'border-red-500 focus:ring-red-500 focus:border-red-500 bg-red-50/50'
                                            : ''
                                        )}
                                        placeholder="0"
                                      />
                                      <span className="text-xs text-gray-500">₴</span>
                                    </div>
                                  </TableCell>

                                  {/* Кнопка удаления транша */}
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-gray-400 hover:text-red-500 transition-colors"
                                      onClick={() => handleRemoveTranche(item.id, tranche.id)}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}

                              {/* Строка: осталось распределить */}
                              <TableRow className={cn(
                                isOverBudget ? 'bg-red-50/40 hover:bg-red-50/40' : 'bg-emerald-50/30 hover:bg-emerald-50/30'
                              )}>
                                <TableCell colSpan={4} className="px-12 py-2">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={cn(
                                          'text-xs font-semibold',
                                          isOverBudget ? 'text-red-600' : remaining === 0 ? 'text-emerald-600' : 'text-amber-600'
                                        )}
                                      >
                                        {tr('remaining')}: {formatUAH(remaining)}
                                      </span>
                                      {isOverBudget && (
                                        <span className="text-[10px] font-medium text-red-500 bg-red-100 px-1.5 py-0.5 rounded">
                                          {tr('budget_overflow')}
                                        </span>
                                      )}
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={!canAddTranche}
                                      className={cn(
                                        'h-7 text-xs gap-1 transition-all duration-150 hover:-translate-y-0.5',
                                        canAddTranche
                                          ? 'bg-emerald-100 border border-emerald-300 text-emerald-700 hover:bg-emerald-200'
                                          : 'border-gray-200 text-gray-400 cursor-not-allowed'
                                      )}
                                      onClick={() => handleAddTranche(item.id)}
                                    >
                                      <Plus className="w-3 h-3" />
                                      {tr('add_tranche')}
                                    </Button>
                                  </div>
                                  {isOverBudget && (
                                    <p className="text-[10px] text-red-400 mt-1.5">
                                      {tr('budget_overflow_desc')}
                                    </p>
                                  )}
                                </TableCell>
                              </TableRow>
                            </>
                          )}

                          {/* Кнопка «Разбить на транши» */}
                          {hasTranches && !item.hasTranches && (
                            <TableRow className="hover:bg-gray-50">
                              <TableCell colSpan={4} className="px-12 py-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 gap-1 h-7 transition-all duration-150"
                                  onClick={() => toggleTranches(order.id, item.id)}
                                >
                                  <ChevronRight className="w-3 h-3" />
                                  {tr('split_to_tranches')} ({item.tranches!.length})
                                </Button>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {/* Итого по бюджету */}
          {visibleItems.length > 0 && (
            <div className="px-3 lg:px-6 py-3 bg-gray-50 border-t flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between">
              <span className="text-xs lg:text-sm font-semibold text-gray-600">
                {tr('total_plan')}: {formatUAH(totalPlan)}
              </span>
              <span className="text-xs lg:text-sm font-semibold text-gray-600">
                {tr('total_fact')}: {formatUAH(totalFact)}
              </span>
              <span
                className={cn(
                  'text-xs lg:text-sm font-bold',
                  totalDeviation >= 0 ? 'text-emerald-600' : 'text-red-600'
                )}
              >
                {tr('deviation')}: {totalDeviation >= 0 ? '+' : ''}
                {formatUAH(totalDeviation)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== Модалка добавления статьи ===== */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>
              {newItemIsIncome ? tr('income_item') : tr('expense_item')}
            </DialogTitle>
            <DialogDescription>
              Выберите из шаблонов или введите своё название
            </DialogDescription>
          </DialogHeader>
          <div className="py-3 lg:py-4 space-y-3 lg:space-y-4">
            {/* Быстрые шаблоны */}
            <div className="flex flex-wrap gap-1.5">
              {(newItemIsIncome
                ? ['Прибыль', 'Допоплата', 'Бонус', 'Возврат']
                : ['Проектирование', 'Закупные', 'Сборка', 'Погрузка', 'Доставка', 'Разгрузка', 'Монтаж', 'Бонус конструктора', 'Налоги', 'Бонус менеджера', 'Бонус тендера', 'Логистика', 'Аренда техники', 'Упаковка', 'Страхование']
              ).filter(tpl => {
                return !order.budgetItems.some(b => b.name === tpl);
              }).map(tpl => (
                <button
                  key={tpl}
                  onClick={() => {
                    addBudgetItem(order.id, tpl, newItemIsIncome);
                    setAddDialogOpen(false);
                    toast.success(tr('toast_budget_item_added'));
                  }}
                  className={cn(
                    'px-2.5 py-1.5 text-[11px] lg:text-xs font-medium rounded-lg border transition-all duration-150 active:scale-95',
                    newItemIsIncome
                      ? 'border-blue-200 text-blue-700 bg-blue-50 active:bg-blue-100'
                      : 'border-emerald-200 text-emerald-700 bg-emerald-50 active:bg-emerald-100'
                  )}
                >
                  + {tpl}
                </button>
              ))}
            </div>

            {/* Разделитель */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">или своё название</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Ручной ввод */}
            <Input
              placeholder={newItemIsIncome ? tr('income_name_placeholder') : tr('expense_name_placeholder')}
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              {tr('cancel')}
            </Button>
            <Button
              onClick={handleAddItem}
              disabled={!newItemName.trim()}
              className={cn(
                'text-white',
                newItemIsIncome
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              )}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              {tr('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
