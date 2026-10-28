import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { eq } from "drizzle-orm";
import { db, users } from "@/lib/db";

export const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

/** Lets you sign in as any email without Google. Never available in production builds. */
export const devLoginEnabled = process.env.NODE_ENV !== "production";

const providers: Provider[] = [];
if (googleEnabled) providers.push(Google);
if (devLoginEnabled) {
  providers.push(
    Credentials({
      id: "dev",
      name: "Dev login",
      credentials: { email: {}, name: {} },
      authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        if (!email.includes("@")) return null;
        const name = String(credentials?.name ?? "").trim() || email.split("@")[0];
        return { id: email, email, name };
      },
    }),
  );
}

async function upsertUser(email: string, name: string) {
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) return existing;
  const [created] = await db.insert(users).values({ email, name }).returning();
  return created;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  trustHost: true,
  callbacks: {
    async jwt({ token, user }) {
      // `user` is only present right after sign-in: link the account to our own users table.
      if (user?.email) {
        const dbUser = await upsertUser(user.email.toLowerCase(), user.name ?? user.email);
        token.uid = dbUser.id;
      }
      return token;
    },
    session({ session, token }) {
      if (typeof token.uid === "string") session.user.id = token.uid;
      return session;
    },
  },
});
