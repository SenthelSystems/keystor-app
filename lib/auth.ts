import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

// NOTE: Do NOT throw at module scope if env vars are missing.
// NextAuth will warn at runtime; build must succeed.
const secret = process.env.NEXTAUTH_SECRET;

export const authOptions: NextAuthOptions = {
  secret,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            role: true,
            organizationId: true,
          },
        });

        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: String(user.role),
          organizationId: String(user.organizationId),
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // On sign-in, copy values into JWT token
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.organizationId = (user as any).organizationId;
      }
      return token;
    },
    async session({ session, token }) {
      // Expose required fields on session.user for requireSessionUser()
      (session.user as any).id = token.id;
      (session.user as any).role = token.role;
      (session.user as any).organizationId = token.organizationId;
      return session;
    },
  },
};
