'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// ============================================================
// LoadingSkeleton — Мерцающие скелетоны вместо пустого экрана
// Адаптивные: mobile-first с lg: десктопными расширениями
// ============================================================

function Shimmer({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] rounded ${className}`} />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Метрики — горизонтальный скролл на мобильном */}
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-3 px-3 lg:mx-0 lg:px-0 lg:grid lg:grid-cols-3 lg:gap-4 mobile-hide-scrollbar">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-white shadow-sm min-w-[200px] lg:min-w-0 shrink-0 lg:shrink">
            <CardContent className="p-4 lg:p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-2 lg:space-y-3 flex-1">
                  <Shimmer className="h-3 w-20 lg:w-24" />
                  <Shimmer className="h-8 lg:h-10 w-28 lg:w-32" />
                </div>
                <Shimmer className="w-10 h-10 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Графики */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
        <Card className="bg-white shadow-sm">
          <CardHeader className="pb-2 px-3 lg:px-6">
            <Shimmer className="h-4 lg:h-5 w-32 lg:w-40" />
          </CardHeader>
          <CardContent className="px-3 lg:px-6">
            <Shimmer className="h-[180px] lg:h-[220px] w-full rounded-xl" />
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm">
          <CardHeader className="pb-2 px-3 lg:px-6">
            <Shimmer className="h-4 lg:h-5 w-32 lg:w-40" />
          </CardHeader>
          <CardContent className="px-3 lg:px-6">
            <div className="space-y-3 lg:space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-2 lg:gap-3">
                  <Shimmer className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-1.5 lg:space-y-2">
                    <Shimmer className="h-3 lg:h-4 w-full" />
                    <Shimmer className="h-2.5 lg:h-3 w-16 lg:w-20" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Таблица / карточки */}
      <Card className="bg-white shadow-sm">
        <CardHeader className="pb-3 px-3 lg:px-6">
          <Shimmer className="h-4 lg:h-5 w-40 lg:w-48" />
        </CardHeader>
        <CardContent className="p-0">
          {/* Мобильные карточки */}
          <div className="lg:hidden px-3 pb-3 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-3 space-y-2" style={{ opacity: 1 - i * 0.2 }}>
                <div className="flex items-center justify-between">
                  <Shimmer className="h-3 w-16" />
                  <Shimmer className="h-5 w-20 rounded-full" />
                </div>
                <Shimmer className="h-4 w-full" />
                <div className="flex items-center justify-between">
                  <Shimmer className="h-4 w-24" />
                  <Shimmer className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
          {/* Десктопная таблица */}
          <div className="hidden lg:block px-6 space-y-4 pb-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Shimmer className="h-4 w-20" />
                <Shimmer className="h-4 w-48 flex-1" />
                <Shimmer className="h-6 w-20 rounded-full" />
                <Shimmer className="h-4 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function OrdersListSkeleton() {
  return (
    <div className="space-y-3 lg:space-y-4">
      {/* Поиск */}
      <div className="flex items-center gap-2 lg:gap-3">
        <Shimmer className="h-9 lg:h-10 flex-1 rounded-md" />
        <Shimmer className="h-9 lg:h-10 w-28 lg:w-40 rounded-md" />
      </div>

      {/* Фильтры — горизонтальный скролл */}
      <div className="flex items-center gap-2 overflow-x-auto mobile-hide-scrollbar -mx-3 px-3 lg:mx-0 lg:px-0">
        {[1, 2, 3, 4].map((i) => (
          <Shimmer key={i} className="h-7 lg:h-8 w-20 lg:w-28 rounded-full shrink-0" />
        ))}
      </div>

      {/* Мобильные карточки */}
      <div className="lg:hidden space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-3.5 space-y-2" style={{ opacity: 1 - i * 0.15 }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shimmer className="h-3 w-14" />
                <Shimmer className="h-5 w-24 rounded-full" />
              </div>
              <Shimmer className="h-4 w-4 rounded" />
            </div>
            <Shimmer className="h-4 w-3/4" />
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-3">
                <div className="space-y-1">
                  <Shimmer className="h-2 w-10" />
                  <Shimmer className="h-4 w-20" />
                </div>
                <div className="space-y-1">
                  <Shimmer className="h-2 w-8" />
                  <Shimmer className="h-4 w-12" />
                </div>
              </div>
              <div className="space-y-1 text-right">
                <Shimmer className="h-2 w-10 ml-auto" />
                <Shimmer className="h-3 w-16 ml-auto" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Десктопная таблица */}
      <Card className="bg-white shadow-sm hidden lg:block">
        <CardContent className="p-0">
          <div className="px-6 py-4 space-y-5">
            {/* Заголовок */}
            <div className="flex items-center gap-4 pb-2 border-b border-gray-100">
              <Shimmer className="h-3 w-16" />
              <Shimmer className="h-3 w-32" />
              <Shimmer className="h-3 w-20" />
              <Shimmer className="h-3 w-24 ml-auto" />
              <Shimmer className="h-3 w-16" />
              <Shimmer className="h-3 w-24" />
              <Shimmer className="h-3 w-16" />
            </div>
            {/* Строки */}
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4" style={{ opacity: 1 - i * 0.15 }}>
                <Shimmer className="h-4 w-16" />
                <Shimmer className="h-4 w-48" />
                <Shimmer className="h-6 w-28 rounded-full" />
                <Shimmer className="h-4 w-24 ml-auto" />
                <Shimmer className="h-4 w-12" />
                <Shimmer className="h-4 w-24" />
                <Shimmer className="h-8 w-16 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
