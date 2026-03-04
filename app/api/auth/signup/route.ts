import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import prisma from "@/lib/prisma";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 10;

const globalForSignupRateLimit = globalThis as typeof globalThis & {
  signupRateLimitMap?: Map<string, { attempts: number; windowStart: number }>;
};

const signupRateLimitMap =
  globalForSignupRateLimit.signupRateLimitMap ?? new Map<string, { attempts: number; windowStart: number }>();

globalForSignupRateLimit.signupRateLimitMap = signupRateLimitMap;

const getAllowedOriginHosts = () => {
  const hosts = new Set<string>();

  const addHost = (value?: string) => {
    if (!value) return;
    try {
      const host = new URL(value).host;
      if (host) hosts.add(host);
    } catch {
      hosts.add(value.replace(/^https?:\/\//, "").replace(/\/$/, ""));
    }
  };

  addHost("https://tech-test-green-eight.vercel.app");
  addHost("http://localhost:3000");

  return hosts;
};

const getClientIp = (req: Request) => {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return req.headers.get("x-real-ip") || "unknown";
};

export async function POST(req: Request) {
  try {
    const origin = req.headers.get("origin");
    if (origin) {
      const allowedHosts = getAllowedOriginHosts();
      const requestHost = new URL(origin).host;

      if (!allowedHosts.has(requestHost)) {
        return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
      }
    }

    const clientIp = getClientIp(req);
    const now = Date.now();
    const currentEntry = signupRateLimitMap.get(clientIp);

    if (!currentEntry || now - currentEntry.windowStart > RATE_LIMIT_WINDOW_MS) {
      signupRateLimitMap.set(clientIp, { attempts: 1, windowStart: now });
    } else {
      if (currentEntry.attempts >= RATE_LIMIT_MAX_ATTEMPTS) {
        return NextResponse.json(
          { error: "Demasiados intentos. Intenta nuevamente más tarde." },
          { status: 429 },
        );
      }

      currentEntry.attempts += 1;
      signupRateLimitMap.set(clientIp, currentEntry);
    }

    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");

    if (signupRateLimitMap.size > 5000) {
      for (const [key, value] of signupRateLimitMap) {
        if (now - value.windowStart > RATE_LIMIT_WINDOW_MS) {
          signupRateLimitMap.delete(key);
        }
      }
    }

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nombre, email y contraseña son obligatorios" },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Si los datos son correctos, podrás continuar con el acceso." },
        { status: 200 },
      );
    }

    const passwordHash = await hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    return NextResponse.json(
      {
        user,
        message: "Cuenta creada correctamente.",
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "No se pudo crear la cuenta" },
      { status: 500 },
    );
  }
}
