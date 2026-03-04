import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter"
import { compare } from "bcryptjs";
import prisma from "./prisma";

const LOGIN_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 8;

const globalForLoginRateLimit = globalThis as typeof globalThis & {
  authLoginRateLimitMap?: Map<string, { attempts: number; windowStart: number }>;
};

const loginRateLimitMap =
  globalForLoginRateLimit.authLoginRateLimitMap ??
  new Map<string, { attempts: number; windowStart: number }>();

globalForLoginRateLimit.authLoginRateLimitMap = loginRateLimitMap;

const getRateLimitKey = (email: string, req: { headers?: Record<string, string> }) => {
  const forwardedFor = req.headers?.["x-forwarded-for"];
  const clientIp = forwardedFor?.split(",")[0]?.trim() || req.headers?.["x-real-ip"] || "unknown";

  return `${clientIp}:${email.toLowerCase()}`;
};

const consumeRateLimit = (key: string) => {
  const now = Date.now();
  const entry = loginRateLimitMap.get(key);

  if (!entry || now - entry.windowStart > LOGIN_RATE_LIMIT_WINDOW_MS) {
    loginRateLimitMap.set(key, { attempts: 1, windowStart: now });
    return false;
  }

  if (entry.attempts >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
    return true;
  }

  entry.attempts += 1;
  loginRateLimitMap.set(key, entry);
  return false;
};

const resetRateLimit = (key: string) => {
  loginRateLimitMap.delete(key);
};
 
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const rateLimitKey = getRateLimitKey(credentials.email, req);
        const isBlocked = consumeRateLimit(rateLimitKey);

        if (isBlocked) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user?.passwordHash) {
          return null;
        }

        const isValid = await compare(credentials.password, user.passwordHash);

        if (!isValid) {
          return null;
        }

        resetRateLimit(rateLimitKey);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
}