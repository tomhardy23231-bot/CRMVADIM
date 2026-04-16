import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './db';
import bcrypt from 'bcryptjs';

// ============================================================
// Дефолтные разрешения по ролям
// ============================================================
export const DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
  ADMIN: {
    canViewProfit: true,
    canViewBudget: true,
    canViewPaymentCalendar: true,
    canEditOrders: true,
    canViewDashboardFinance: true,
    canImportFrom1C: true,
  },
  MANAGER: {
    canViewProfit: true,
    canViewBudget: true,
    canViewPaymentCalendar: true,
    canEditOrders: true,
    canViewDashboardFinance: true,
    canImportFrom1C: true,
  },
  WORKER: {
    canViewProfit: false,
    canViewBudget: false,
    canViewPaymentCalendar: false,
    canEditOrders: false,
    canViewDashboardFinance: false,
    canImportFrom1C: false,
  },
};

// ============================================================
// NextAuth конфигурация
// ============================================================
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        login: { label: 'Логин', type: 'text' },
        password: { label: 'Пароль', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.login || !credentials?.password) {
          throw new Error('Введите логин и пароль');
        }

        const user = await prisma.user.findUnique({
          where: { login: credentials.login },
        });

        if (!user) {
          throw new Error('Пользователь не найден');
        }

        if (!user.isActive) {
          throw new Error('Аккаунт деактивирован');
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
        if (!isPasswordValid) {
          throw new Error('Неверный пароль');
        }

        // Логируем вход
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'user.login',
            entity: 'user',
            entityId: user.id,
            details: { description: `Вход в систему: ${user.firstName} ${user.lastName}` },
          },
        });

        return {
          id: user.id,
          login: user.login,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          permissions: user.permissions,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.login = (user as any).login;
        token.firstName = (user as any).firstName;
        token.lastName = (user as any).lastName;
        token.role = (user as any).role;
        token.permissions = (user as any).permissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).login = token.login;
        (session.user as any).firstName = token.firstName;
        (session.user as any).lastName = token.lastName;
        (session.user as any).role = token.role;
        (session.user as any).permissions = token.permissions;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 часа
  },
  secret: process.env.NEXTAUTH_SECRET,
};
