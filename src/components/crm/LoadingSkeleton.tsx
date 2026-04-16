'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// ============================================================
// LoadingSkeleton — Мерцающие скелетоны вместо пустого экрана
// ============================================================

function Shimmer({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] rounded ${className}`} />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Метрики */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-white shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-3 flex-1">
                  <Shimmer className="h-3 w-24" />
                  <Shimmer className="h-10 w-32" />
                </div>
                <Shimmer className="w-14 h-14 rounded-2xl" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Графики */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-white shadow-sm">
          <CardHeader className="pb-2">
            <Shimmer className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Shimmer className="h-[220px] w-full rounded-xl" />
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm">
          <CardHeader className="pb-2">
            <Shimmer className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-start gap-3">
                  <Shimmer className="w-8 h-8 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Shimmer className="h-4 w-full" />
                    <Shimmer className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Таблица */}
      <Card className="bg-white shadow-sm">
        <CardHeader className="pb-3">
          <Shimmer className="h-5 w-48" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="px-6 space-y-4 pb-6">
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
    <div className="space-y-4">
      {/* Поиск */}
      <div className="flex items-center justify-between gap-3">
        <Shimmer className="h-10 w-80 rounded-md" />
        <Shimmer className="h-10 w-40 rounded-md" />
      </div>

      {/* Фильтры */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Shimmer key={i} className="h-8 w-28 rounded-full" />
        ))}
      </div>

      {/* Таблица */}
      <Card className="bg-white shadow-sm">
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
