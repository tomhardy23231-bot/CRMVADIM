import { withAuth } from 'next-auth/middleware';

// ============================================================
// Middleware — Защита маршрутов
// Неавторизованные пользователи перенаправляются на /login
// ============================================================
export default withAuth({
  pages: {
    signIn: '/login',
  },
});

export const config = {
  // Защищаем все страницы кроме: login, api/auth, статика
  matcher: [
    '/((?!login|api/auth|_next/static|_next/image|favicon|logo|icon|.*\\.svg|.*\\.png|.*\\.jpg|.*\\.ico).*)',
  ],
};
