/**
 * Edge-compatible NextAuth config.
 * No Node.js-only imports (no prisma, no bcrypt).
 * Used in proxy.ts (edge runtime) and extended in auth.ts (Node.js).
 */
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: { signIn: "/login" },
  providers: [], // Credentials provider added in auth.ts (Node.js only)
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const pathname = request.nextUrl.pathname;
      const isLoginPage = pathname.startsWith("/login");

      if (isLoggedIn && isLoginPage) {
        return Response.redirect(new URL("/", request.nextUrl));
      }
      if (!isLoggedIn && !isLoginPage) {
        return false; // NextAuth redirects to pages.signIn
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as string;
      return session;
    },
  },
};
