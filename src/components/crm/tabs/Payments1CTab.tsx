'use client';

import React, { useState } from 'react';
import type { Order } from '@/lib/crm-types';
import { useCRM } from '@/lib/crm-context';
import { formatUAH } from '@/lib/crm-utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Receipt, CheckCircle2, CircleDashed, TrendingUp, TrendingDown, Tag, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Payments1CTabProps {
  order: Order;
}

// Определяем тип документа по его названию
function getDocType(document: string): { label: string; color: string } {
  const d = document.toLowerCase();
  if (d.includes('реализация'))         return { label: 'Реализация',       color: 'bg-blue-50 text-blue-700 border-blue-200' };
  if (d.includes('приходный'))           return { label: 'ПКО',              color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (d.includes('расходный'))           return { label: 'РКО',              color: 'bg-red-50 text-red-700 border-red-200' };
  if (d.includes('поступление'))         return { label: 'Банк (приход)',     color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (d.includes('списание'))            return { label: 'Банк (расход)',     color: 'bg-red-50 text-red-700 border-red-200' };
  if (d.includes('направление'))         return { label: 'Направление',       color: 'bg-purple-50 text-purple-700 border-purple-200' };
  if (d.includes('авансовый'))           return { label: 'Авансовый отчет',   color: 'bg-orange-50 text-orange-700 border-orange-200' };
  return { label: 'Документ',            color: 'bg-gray-50 text-gray-600 border-gray-200' };
}

export function Payments1CTab({ order }: Payments1CTabProps) {
  const { updatePaymentArticle } = useCRM();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const expenseArticles = order.budgetItems?.filter(b => !b.isIncome) || [];
  const incomeArticles  = order.budgetItems?.filter(b => b.isIncome)  || [];

  const handleAssign = (paymentId: string, budgetItemId: string) => {
    updatePaymentArticle(order.id, paymentId, budgetItemId === 'none' ? null : budgetItemId);
    if (budgetItemId !== 'none') {
      const item = [...expenseArticles, ...incomeArticles].find(b => b.id === budgetItemId);
      toast.success(`Платеж привязан к статье "${item?.name || ''}"`);
    } else {
      toast.info('Привязка снята');
    }
  };

  const payments = order.payments || [];
  const assignedCount   = payments.filter(p => !!p.budgetItemId).length;
  const unassignedCount = payments.length - assignedCount;

  // Итоговые суммы
  const totalIncome  = payments.reduce((s, p) => s + p.income,  0);
  const totalExpense = payments.reduce((s, p) => s + p.expense, 0);

  return (
    <div className="space-y-4">
      <Card className="bg-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border-0">
        <CardHeader className="pb-3 border-b border-gray-100 bg-gray-50/50 px-3 lg:px-6">
          <div className="flex flex-col gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm lg:text-base font-semibold">
                <Receipt className="w-4 h-4 text-blue-500" />
                Платежи из 1С — Факт оплаты
              </CardTitle>
              <CardDescription className="text-[11px] lg:text-xs text-gray-500 mt-1 max-w-xl">
                Нажмите на платёж чтобы увидеть детали. Привяжите к статье бюджета для автоматического учёта.
              </CardDescription>
            </div>
            
            {/* Сводка — wrapping pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {totalIncome > 0 && (
                <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] lg:text-xs font-semibold px-2 py-1 rounded-lg border border-emerald-200">
                  <TrendingUp className="w-3 h-3" />
                  +{formatUAH(totalIncome)}
                </div>
              )}
              {totalExpense > 0 && (
                <div className="flex items-center gap-1 bg-red-50 text-red-700 text-[10px] lg:text-xs font-semibold px-2 py-1 rounded-lg border border-red-200">
                  <TrendingDown className="w-3 h-3" />
                  −{formatUAH(totalExpense)}
                </div>
              )}
              {unassignedCount > 0 && (
                <div className="flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] lg:text-xs font-semibold px-2 py-1 rounded-lg border border-amber-200 animate-pulse">
                  <CircleDashed className="w-3 h-3" />
                  Не привязано: {unassignedCount}
                </div>
              )}
              {assignedCount > 0 && (
                <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] lg:text-xs font-semibold px-2 py-1 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  Привязано: {assignedCount}
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                <Receipt className="w-7 h-7 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">Нет платежей из 1С</p>
              <p className="text-xs text-gray-400 mt-1">После импорта тут появятся реальные транзакции.</p>
            </div>
          ) : (
            <>
              {/* ===== МОБИЛЬНОЕ представление — карточки ===== */}
              <div className="lg:hidden space-y-2 p-3">
                {payments.map((p) => {
                  const isAssigned   = !!p.budgetItemId;
                  const isExpanded   = expandedId === p.id;
                  const dateObj      = new Date(p.date);
                  const isIncome     = p.income > 0;
                  const availableArticles = isIncome ? incomeArticles : expenseArticles;
                  const docType      = getDocType(p.document);
                  const assignedItem = [...expenseArticles, ...incomeArticles].find(b => b.id === p.budgetItemId);

                  return (
                    <div
                      key={p.id}
                      className={cn(
                        'border rounded-xl overflow-hidden transition-all duration-150',
                        isAssigned ? 'border-emerald-200 bg-emerald-50/20' : 'border-amber-200 bg-amber-50/10'
                      )}
                    >
                      {/* Main row — clickable */}
                      <button
                        className="w-full text-left p-3 active:bg-gray-50 transition-colors"
                        onClick={() => setExpandedId(isExpanded ? null : p.id)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            <span className={cn(
                              "text-[10px] font-semibold px-1.5 py-0.5 rounded border shrink-0",
                              docType.color
                            )}>
                              {docType.label}
                            </span>
                            <span className="text-[10px] text-gray-400 font-medium">
                              {dateObj.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                            </span>
                          </div>
                          {isIncome ? (
                            <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded text-xs border border-emerald-100 shrink-0">
                              +{formatUAH(p.income)}
                            </span>
                          ) : (
                            <span className="bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded text-xs border border-red-100 shrink-0">
                              −{formatUAH(p.expense)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-700 leading-snug line-clamp-2">{p.document}</p>
                        {p.article && (
                          <div className="flex items-center gap-0.5 text-[10px] text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-medium mt-1 w-fit">
                            <Tag className="w-2.5 h-2.5" />
                            {p.article}
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className={cn(
                            'text-[10px] font-medium',
                            isAssigned ? 'text-emerald-600' : 'text-amber-600'
                          )}>
                            {isAssigned ? `✓ ${assignedItem?.name || ''}` : '⚠ Не привязан'}
                          </span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                        </div>
                      </button>

                      {/* Expanded: select for binding */}
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-0 border-t border-gray-100 bg-white space-y-2">
                          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide pt-2">Привязать к статье бюджета:</p>
                          <Select
                            value={p.budgetItemId || "none"}
                            onValueChange={(val) => handleAssign(p.id, val)}
                          >
                            <SelectTrigger className={cn(
                              "h-9 text-xs font-semibold cursor-pointer w-full",
                              isAssigned
                                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                : "border-dashed border-amber-400 bg-amber-50/50 text-amber-700"
                            )}>
                              <SelectValue placeholder="← Нажми для выбора" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none" className="text-gray-400 italic text-xs">
                                — Сбросить привязку —
                              </SelectItem>
                              {availableArticles.length > 0 ? (
                                availableArticles.map((b) => (
                                  <SelectItem key={b.id} value={b.id} className="font-semibold text-gray-800 text-sm">
                                    {b.name}
                                    {b.plan > 0 && (
                                      <span className="ml-2 text-xs text-gray-400 font-normal">
                                        (план: {formatUAH(b.plan)})
                                      </span>
                                    )}
                                  </SelectItem>
                                ))
                              ) : (
                                <div className="px-2 py-2 text-xs text-gray-400 italic">
                                  Нет статей — добавьте их во вкладке «Бюджет»
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                          {/* Full document name */}
                          <div className="text-[10px] text-gray-500">
                            <span className="font-semibold text-gray-400 uppercase tracking-wide">Документ:</span>
                            <p className="mt-0.5 text-gray-700 break-all">{p.document}</p>
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
                      <TableHead className="text-xs font-medium text-gray-500 w-[100px]">Дата</TableHead>
                      <TableHead className="text-xs font-medium text-gray-500">Документ 1С</TableHead>
                      <TableHead className="text-xs font-medium text-gray-500 w-[120px]">Тип</TableHead>
                      <TableHead className="text-xs font-medium text-gray-500 text-right w-[130px]">Сумма</TableHead>
                      <TableHead className="text-xs font-medium text-gray-500 text-right w-[220px]">
                        Привязать к статье бюджета ▾
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => {
                      const isAssigned   = !!p.budgetItemId;
                      const isExpanded   = expandedId === p.id;
                      const dateObj      = new Date(p.date);
                      const isIncome     = p.income > 0;
                      const availableArticles = isIncome ? incomeArticles : expenseArticles;
                      const docType      = getDocType(p.document);
                      const assignedItem = [...expenseArticles, ...incomeArticles].find(b => b.id === p.budgetItemId);

                      return (
                        <React.Fragment key={p.id}>
                          {/* Основная строка — кликабельна */}
                          <TableRow
                            className={cn(
                              "transition-colors duration-150 cursor-pointer",
                              isAssigned ? "hover:bg-emerald-50/40" : "bg-orange-50/10 hover:bg-orange-50/30",
                              isExpanded && "bg-blue-50/30"
                            )}
                            onClick={() => setExpandedId(isExpanded ? null : p.id)}
                          >
                            {/* Дата */}
                            <TableCell className="text-xs whitespace-nowrap">
                              <span className="font-semibold text-gray-700">
                                {dateObj.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                              </span>
                              <br />
                              <span className="text-[10px] text-gray-400">
                                {dateObj.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </TableCell>

                            {/* Документ */}
                            <TableCell className="text-sm text-gray-800 leading-tight">
                              <div className="flex items-center gap-1.5">
                                <span>{p.document}</span>
                                {p.article && (
                                  <span className="flex items-center gap-0.5 text-[10px] text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-medium">
                                    <Tag className="w-2.5 h-2.5" />
                                    {p.article}
                                  </span>
                                )}
                                <Info className="w-3 h-3 text-gray-300 shrink-0" />
                              </div>
                            </TableCell>

                            {/* Тип документа */}
                            <TableCell>
                              <span className={cn(
                                "text-[10px] font-semibold px-1.5 py-0.5 rounded border",
                                docType.color
                              )}>
                                {docType.label}
                              </span>
                            </TableCell>

                            {/* Сумма */}
                            <TableCell className="text-right">
                              {isIncome ? (
                                <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-1 rounded text-sm border border-emerald-100">
                                  +{formatUAH(p.income)}
                                </span>
                              ) : (
                                <span className="bg-red-50 text-red-700 font-bold px-2 py-1 rounded text-sm border border-red-100">
                                  −{formatUAH(p.expense)}
                                </span>
                              )}
                            </TableCell>

                            {/* Привязка к статье */}
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <Select
                                value={p.budgetItemId || "none"}
                                onValueChange={(val) => handleAssign(p.id, val)}
                              >
                                <SelectTrigger className={cn(
                                  "h-9 text-xs font-semibold w-[200px] cursor-pointer",
                                  isAssigned
                                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                    : "border-dashed border-amber-400 bg-amber-50/50 text-amber-700 hover:bg-amber-50"
                                )}>
                                  <SelectValue placeholder="← Нажми для выбора" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none" className="text-gray-400 italic text-xs">
                                    — Сбросить привязку —
                                  </SelectItem>
                                  {availableArticles.length > 0 ? (
                                    availableArticles.map((b) => (
                                      <SelectItem key={b.id} value={b.id} className="font-semibold text-gray-800 text-sm">
                                        {b.name}
                                        {b.plan > 0 && (
                                          <span className="ml-2 text-xs text-gray-400 font-normal">
                                            (план: {formatUAH(b.plan)})
                                          </span>
                                        )}
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <div className="px-2 py-2 text-xs text-gray-400 italic">
                                      Нет статей — добавьте их во вкладке «Бюджет»
                                    </div>
                                  )}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>

                          {/* Раскрытые детали */}
                          {isExpanded && (
                            <TableRow className="bg-blue-50/20 hover:bg-blue-50/20">
                              <TableCell colSpan={5} className="py-3 px-6">
                                <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                                  <div>
                                    <span className="font-semibold text-gray-400 uppercase tracking-wide">Полное Название:</span>
                                    <p className="mt-0.5 font-medium text-gray-800">{p.document}</p>
                                  </div>
                                  {p.article && (
                                    <div>
                                      <span className="font-semibold text-gray-400 uppercase tracking-wide">Статья ДДС (из 1С):</span>
                                      <p className="mt-0.5 font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block">{p.article}</p>
                                    </div>
                                  )}
                                  {!p.article && (
                                    <div>
                                      <span className="font-semibold text-gray-400 uppercase tracking-wide">Статья ДДС:</span>
                                      <p className="mt-0.5 text-gray-400 italic">Не передана из 1С (обновите код 1С)</p>
                                    </div>
                                  )}
                                  <div>
                                    <span className="font-semibold text-gray-400 uppercase tracking-wide">Привязана к статье:</span>
                                    <p className="mt-0.5 font-semibold text-gray-800">
                                      {assignedItem ? (
                                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                                          ✓ {assignedItem.name}
                                        </span>
                                      ) : (
                                        <span className="text-amber-600 italic">Не привязана — выберите статью справа ↗</span>
                                      )}
                                    </p>
                                  </div>
                                </div>
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
        </CardContent>
      </Card>
    </div>
  );
}
