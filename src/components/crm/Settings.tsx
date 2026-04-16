'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useCRM } from '@/lib/crm-context';
import {
  Users, Shield, ScrollText, Plus, Eye, EyeOff,
  UserCog, Loader2, Check, X, RotateCcw,
  ChevronDown, Filter, Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ============================================================
// Settings — Страница настроек (только для Admin)
// Три вкладки: Пользователи | Права доступа | Журнал действий
// ============================================================

interface UserData {
  id: string;
  login: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  permissions: Record<string, boolean>;
  createdAt: string;
}

interface AuditLogEntry {
  id: string;
  action: string;
  entity?: string;
  entityId?: string;
  details?: any;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; role: string };
}

const PERMISSION_LABELS: Record<string, { ru: string; description: string }> = {
  canViewProfit: { ru: 'Просмотр прибыли', description: 'Видеть маржу и прибыль компании' },
  canViewBudget: { ru: 'Бюджетирование', description: 'Доступ к вкладке бюджета в заказах' },
  canViewPaymentCalendar: { ru: 'Платёжный календарь', description: 'Доступ к календарю платежей' },
  canEditOrders: { ru: 'Редактирование заказов', description: 'Изменение статусов и данных заказов' },
  canViewDashboardFinance: { ru: 'Финансы на дашборде', description: 'Финансовые метрики на главной' },
  canImportFrom1C: { ru: 'Импорт из 1С', description: 'Импортировать новые заказы' },
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Администратор',
  MANAGER: 'Менеджер',
  WORKER: 'Рабочий',
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700 border-red-200',
  MANAGER: 'bg-blue-100 text-blue-700 border-blue-200',
  WORKER: 'bg-gray-100 text-gray-600 border-gray-200',
};

const ACTION_LABELS: Record<string, string> = {
  'user.login': '🔑 Вход в систему',
  'user.create': '👤 Создание пользователя',
  'user.update': '✏️ Обновление пользователя',
  'user.deactivate': '🚫 Деактивация',
  'user.resetPassword': '🔒 Сброс пароля',
  'order.create': '📦 Создание заказа',
  'order.updateStatus': '🔄 Смена статуса',
  'order.delete': '🗑️ Удаление заказа',
  'budget.update': '💰 Обновление бюджета',
  'system.seed': '⚙️ Инициализация системы',
};

type SettingsTab = 'users' | 'permissions' | 'audit';

export function Settings() {
  const { tr } = useCRM();
  const [activeTab, setActiveTab] = useState<SettingsTab>('users');
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  // === Форма создания пользователя ===
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({ login: '', password: '', firstName: '', lastName: '', role: 'MANAGER' });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // === Журнал ===
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logFilter, setLogFilter] = useState({ userId: '', action: '' });

  // === Сброс пароля ===
  const [resetPasswordId, setResetPasswordId] = useState<string | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');

  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) setUsers(await res.json());
    } catch { /* ignore */ } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    try {
      const params = new URLSearchParams();
      if (logFilter.userId) params.set('userId', logFilter.userId);
      if (logFilter.action) params.set('action', logFilter.action);
      params.set('limit', '100');
      const res = await fetch(`/api/audit-log?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch { /* ignore */ } finally {
      setIsLoadingLogs(false);
    }
  }, [logFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { if (activeTab === 'audit') fetchLogs(); }, [activeTab, fetchLogs]);

  // Создание пользователя
  const handleCreate = async () => {
    if (!newUser.login || !newUser.password || !newUser.firstName || !newUser.lastName) {
      toast.error('Заполните все поля');
      return;
    }
    setIsCreating(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      if (res.ok) {
        toast.success(`Пользователь ${newUser.firstName} ${newUser.lastName} создан`);
        setNewUser({ login: '', password: '', firstName: '', lastName: '', role: 'MANAGER' });
        setShowCreateForm(false);
        fetchUsers();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Ошибка создания');
      }
    } catch {
      toast.error('Ошибка сети');
    } finally {
      setIsCreating(false);
    }
  };

  // Переключение активности
  const toggleActive = async (userId: string, isActive: boolean) => {
    if (!isActive) {
      // Деактивация
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Пользователь деактивирован');
        fetchUsers();
      }
    } else {
      // Активация
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      });
      if (res.ok) {
        toast.success('Пользователь активирован');
        fetchUsers();
      }
    }
  };

  // Обновление разрешения
  const updatePermission = async (userId: string, permKey: string, value: boolean) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const newPermissions = { ...((user.permissions as Record<string, boolean>) || {}), [permKey]: value };
    
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: newPermissions }),
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, permissions: newPermissions } : u));
        toast.success('Разрешение обновлено');
      }
    } catch {
      toast.error('Ошибка обновления');
    }
  };

  // Обновление роли
  const updateRole = async (userId: string, role: string) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        toast.success('Роль обновлена');
        fetchUsers();
      }
    } catch {
      toast.error('Ошибка обновления роли');
    }
  };

  // Сброс пароля
  const handleResetPassword = async (userId: string) => {
    if (!resetPasswordValue || resetPasswordValue.length < 4) {
      toast.error('Минимум 4 символа');
      return;
    }
    try {
      const res = await fetch(`/api/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: resetPasswordValue }),
      });
      if (res.ok) {
        toast.success('Пароль сброшен');
        setResetPasswordId(null);
        setResetPasswordValue('');
      }
    } catch {
      toast.error('Ошибка сброса пароля');
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
    { id: 'users', label: 'Пользователи', icon: Users },
    { id: 'permissions', label: 'Права доступа', icon: Shield },
    { id: 'audit', label: 'Журнал действий', icon: ScrollText },
  ];

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center">
            <UserCog className="w-5 h-5 text-white" />
          </div>
          Настройки
        </h1>
        <p className="text-sm text-gray-500 mt-1 ml-[52px]">Управление пользователями, правами доступа и журнал действий</p>
      </div>

      {/* Табы */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* === Вкладка: Пользователи === */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Кнопка создания */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{users.length} пользователей</p>
            <Button
              onClick={() => setShowCreateForm(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              <Plus className="w-4 h-4" />
              Создать аккаунт
            </Button>
          </div>

          {/* Форма создания */}
          {showCreateForm && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="text-md font-semibold text-gray-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                Новый пользователь
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Имя</label>
                  <Input
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                    placeholder="Иван"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Фамилия</label>
                  <Input
                    value={newUser.lastName}
                    onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                    placeholder="Иванов"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Логин</label>
                  <Input
                    value={newUser.login}
                    onChange={(e) => setNewUser({ ...newUser, login: e.target.value })}
                    placeholder="iivanov"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Пароль</label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      placeholder="Минимум 4 символа"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Роль</label>
                  <div className="relative">
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                      className="w-full h-9 px-3 py-1.5 border border-gray-200 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none cursor-pointer"
                    >
                      <option value="ADMIN">Администратор</option>
                      <option value="MANAGER">Менеджер</option>
                      <option value="WORKER">Рабочий</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleCreate} disabled={isCreating} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Создать
                </Button>
                <Button variant="outline" onClick={() => setShowCreateForm(false)} className="gap-2">
                  <X className="w-4 h-4" />
                  Отмена
                </Button>
              </div>
            </div>
          )}

          {/* Таблица пользователей */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            {isLoadingUsers ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Пользователь</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Логин</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Роль</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Статус</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <React.Fragment key={user.id}>
                      <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                              user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'
                            )}>
                              {user.firstName[0]}{user.lastName[0]}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                              <p className="text-xs text-gray-400">Создан: {new Date(user.createdAt).toLocaleDateString('ru')}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <code className="text-sm text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{user.login}</code>
                        </td>
                        <td className="py-3 px-4">
                          <div className="relative">
                            <select
                              value={user.role}
                              onChange={(e) => updateRole(user.id, e.target.value)}
                              className={cn(
                                'text-xs font-medium px-2.5 py-1 rounded-full border appearance-none cursor-pointer pr-6',
                                ROLE_COLORS[user.role]
                              )}
                            >
                              <option value="ADMIN">Администратор</option>
                              <option value="MANAGER">Менеджер</option>
                              <option value="WORKER">Рабочий</option>
                            </select>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="secondary" className={cn(
                            'text-xs',
                            user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                          )}>
                            {user.isActive ? 'Активен' : 'Неактивен'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setResetPasswordId(resetPasswordId === user.id ? null : user.id);
                                setResetPasswordValue('');
                              }}
                              className="h-8 px-2 text-xs text-gray-500 hover:text-gray-700"
                            >
                              <RotateCcw className="w-3.5 h-3.5 mr-1" />
                              Пароль
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleActive(user.id, !user.isActive)}
                              className={cn(
                                'h-8 px-2 text-xs',
                                user.isActive ? 'text-red-500 hover:text-red-700 hover:bg-red-50' : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                              )}
                            >
                              {user.isActive ? 'Деактивировать' : 'Активировать'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {/* Строка сброса пароля */}
                      {resetPasswordId === user.id && (
                        <tr className="bg-amber-50/50">
                          <td colSpan={5} className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-gray-600">Новый пароль для <strong>{user.firstName}</strong>:</span>
                              <Input
                                type="text"
                                value={resetPasswordValue}
                                onChange={(e) => setResetPasswordValue(e.target.value)}
                                placeholder="Новый пароль"
                                className="w-48 h-8 text-sm"
                              />
                              <Button size="sm" onClick={() => handleResetPassword(user.id)} className="h-8 bg-amber-600 hover:bg-amber-700 text-white">
                                Сбросить
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setResetPasswordId(null)} className="h-8">
                                Отмена
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* === Вкладка: Права доступа === */}
      {activeTab === 'permissions' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Настройте, какие разделы и данные доступны каждому пользователю</p>
          
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[200px]">Пользователь</th>
                  {Object.entries(PERMISSION_LABELS).map(([key, val]) => (
                    <th key={key} className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <div className="flex flex-col items-center gap-0.5">
                        <span>{val.ru}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.filter(u => u.role !== 'ADMIN').map(user => (
                  <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          'w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold',
                          ROLE_COLORS[user.role]
                        )}>
                          {user.firstName[0]}{user.lastName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                          <p className="text-[10px] text-gray-400">{ROLE_LABELS[user.role]}</p>
                        </div>
                      </div>
                    </td>
                    {Object.keys(PERMISSION_LABELS).map(permKey => {
                      const perms = (user.permissions as Record<string, boolean>) || {};
                      const value = perms[permKey] ?? false;
                      return (
                        <td key={permKey} className="text-center py-3 px-2">
                          <div className="flex justify-center">
                            <Switch
                              checked={value}
                              onCheckedChange={(checked) => updatePermission(user.id, permKey, checked)}
                              className="data-[state=checked]:bg-emerald-600"
                            />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {users.filter(u => u.role !== 'ADMIN').length === 0 && (
                  <tr>
                    <td colSpan={Object.keys(PERMISSION_LABELS).length + 1} className="text-center py-12 text-sm text-gray-400">
                      Нет пользователей для настройки (администраторы имеют полный доступ)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-700">
              <strong>Примечание:</strong> Администраторы всегда имеют полный доступ ко всем разделам. Настройки прав применяются только для менеджеров и рабочих.
            </p>
          </div>
        </div>
      )}

      {/* === Вкладка: Журнал действий === */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          {/* Фильтры */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={logFilter.userId}
                onChange={(e) => setLogFilter(prev => ({ ...prev, userId: e.target.value }))}
                className="h-9 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="">Все пользователи</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                ))}
              </select>
            </div>
            <select
              value={logFilter.action}
              onChange={(e) => setLogFilter(prev => ({ ...prev, action: e.target.value }))}
              className="h-9 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="">Все действия</option>
              <option value="user.login">Входы</option>
              <option value="user.create">Создание пользователей</option>
              <option value="order">Заказы</option>
              <option value="budget">Бюджет</option>
            </select>
            <Button variant="outline" size="sm" onClick={fetchLogs} className="gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />
              Обновить
            </Button>
          </div>

          {/* Таблица логов */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            {isLoadingLogs ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-12">
                <ScrollText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Журнал действий пуст</p>
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Время</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Пользователь</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Действие</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Детали</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map(log => (
                      <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-gray-300" />
                            <span className="text-xs text-gray-500 font-mono">
                              {new Date(log.createdAt).toLocaleString('ru', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className={cn('text-[10px]', ROLE_COLORS[log.user.role])}>
                              {log.user.role}
                            </Badge>
                            <span className="text-sm text-gray-700">{log.user.firstName} {log.user.lastName}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="text-sm">{ACTION_LABELS[log.action] || log.action}</span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="text-xs text-gray-400">
                            {log.details?.description || (log.entityId ? `ID: ${log.entityId}` : '—')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
