'use client';

import React, { createContext, useContext, useCallback, type ReactNode } from 'react';
import type { UserInfo, UserPermissions } from './crm-types';

export interface AuthState {
  currentUser: UserInfo | null;
  isAdmin: boolean;
  hasPermission: (key: keyof UserPermissions) => boolean;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children, user = null }: { children: ReactNode; user?: UserInfo | null }) {
  const currentUser = user || null;
  const isAdmin = currentUser?.role === 'ADMIN';

  const hasPermission = useCallback((key: keyof UserPermissions): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'ADMIN') return true;
    const perms = currentUser.permissions || {};
    return !!(perms as any)[key];
  }, [currentUser]);

  const value: AuthState = { currentUser, isAdmin, hasPermission };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
