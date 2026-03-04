"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  Home,
  Info,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  UserPlus,
  X,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "next-themes";
import React from "react";
import { signOut, useSession } from "next-auth/react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const NAV_ITEMS = [
  { id: "home", href: "/", label: "Inicio", icon: Home },
  {
    id: "about",
    href: "/sobre-proyecto",
    label: "Sobre el proyecto",
    icon: Info,
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  const ThemeToggleButton = ({ className }: { className?: string }) => (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`p-2 rounded-xl bg-muted hover:bg-accent/30 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className ?? ""}`}
      aria-label={isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      role="switch"
      aria-checked={isDark}
      tabIndex={0}
    >
      {isDark ? (
        <Sun size={18} aria-hidden="true" />
      ) : (
        <Moon size={18} aria-hidden="true" />
      )}
    </button>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 px-4 py-2 backdrop-blur-xl sm:px-6">
      <div className="mx-auto grid w-full max-w-[1280px] grid-cols-[auto_1fr_auto] items-center gap-3 md:gap-4">
        <Link
          href="/"
          className="justify-self-start inline-flex items-center gap-2 text-base font-semibold tracking-tight"
        >
          <span className="rounded-xl bg-primary px-2.5 py-1 text-sm font-bold text-primary-foreground shadow-sm">
            FANZ
          </span>
        </Link>

        <nav className="justify-self-center hidden items-center gap-1 rounded-2xl border border-border/70 bg-card/70 p-1 text-sm md:inline-flex">
          {NAV_ITEMS.map((item) => {
            const isHome = item.id === "home";
            const isAbout = item.id === "about";

            const active = isHome
              ? pathname === "/"
              : isAbout
                ? pathname === "/sobre-proyecto"
                : false;

            const Icon = item.icon;

            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 font-medium transition-all ${
                  active
                    ? "bg-primary/12 text-primary shadow-sm ring-1 ring-primary/20"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                }`}
              >
                <Icon size={15} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="justify-self-end hidden items-center gap-2 md:inline-flex">
          {/* Theme Toggle Button — desktop */}
          {isMounted && <ThemeToggleButton />}

          {status === "authenticated" && session?.user ? (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Abrir menú de cuenta"
                  aria-haspopup="menu"
                  className="flex items-center gap-2.5 bg-card border border-border rounded-full pl-1 pr-3 py-1 transition-all hover:shadow-md hover:bg-muted/60"
                >
                  <span className="w-7 h-7 rounded-full bg-foreground flex items-center justify-center text-background text-xs font-semibold">
                    {session.user.name
                      ? session.user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()
                      : "?"}
                  </span>
                  <div className="leading-none text-left">
                    <p className="text-xs font-medium text-foreground">
                      {session.user.name || "Usuario"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {session.user.email || ""}
                    </p>
                  </div>
                  <ChevronDown size={14} className="text-muted-foreground ml-1" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="z-[80] w-60 rounded-xl border border-border bg-background p-2 text-foreground shadow-2xl"
              >
                <Link
                  href="/mydashboards"
                  className="group inline-flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-all duration-200 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <span className="inline-flex items-center gap-2">
                    <LayoutDashboard
                      size={16}
                      className="transition-transform duration-200 group-hover:scale-110"
                    />
                    My dashboard
                  </span>
                  <span className="text-xs text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5">
                    →
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="group inline-flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-all duration-200 hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50"
                >
                  <span className="inline-flex items-center gap-2">
                    <LogOut
                      size={16}
                      className="transition-transform duration-200 group-hover:scale-110"
                    />
                    Cerrar sesión
                  </span>
                  <span className="text-xs text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5">
                    →
                  </span>
                </button>
              </PopoverContent>
            </Popover>
          ) : (
            <>
              <Link
                href="/auth?login"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <LogIn size={15} aria-hidden="true" />
                Ingresar
              </Link>
              <Link
                href="/auth?signup"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                <UserPlus size={15} aria-hidden="true" />
                Crear cuenta
              </Link>
            </>
          )}
        </div>

        <div className="justify-self-end inline-flex items-center md:hidden">
          <button
            type="button"
            aria-label={isMobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-site-menu"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isMobileMenuOpen ? (
          <motion.div
            key="mobile-menu"
            id="mobile-site-menu"
            initial={
              prefersReducedMotion
                ? { opacity: 1, y: 0, height: "auto" }
                : { opacity: 0, y: -8, height: 0 }
            }
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={
              prefersReducedMotion
                ? { opacity: 0, y: 0, height: 0 }
                : { opacity: 0, y: -8, height: 0 }
            }
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }
            }
            className="overflow-hidden md:hidden"
          >
            <div className="mx-auto mt-2 w-full max-w-[1280px] rounded-2xl border border-border/70 bg-card/95 p-2 shadow-md backdrop-blur-sm">
              <nav
                aria-label="Navegación móvil"
                className="flex flex-col gap-1"
              >
                {NAV_ITEMS.map((item) => {
                  const isHome = item.id === "home";
                  const isAbout = item.id === "about";

                  const active = isHome
                    ? pathname === "/"
                    : isAbout
                      ? pathname === "/sobre-proyecto"
                      : false;

                  const Icon = item.icon;

                  return (
                    <Link
                      key={`mobile-${item.id}`}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                        active
                          ? "bg-primary/12 text-primary ring-1 ring-primary/20"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon size={16} aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="my-2 h-px bg-border" />

              {/* Theme Toggle — mobile */}
              {isMounted && (
                <button
                  type="button"
                  onClick={() => setTheme(isDark ? "light" : "dark")}
                  className="inline-flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
                  aria-label={
                    isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"
                  }
                  role="switch"
                  aria-checked={isDark}
                >
                  {isDark ? (
                    <Sun size={16} aria-hidden="true" />
                  ) : (
                    <Moon size={16} aria-hidden="true" />
                  )}
                  <span>{isDark ? "Tema claro" : "Tema oscuro"}</span>
                </button>
              )}

              <div className="my-2 h-px bg-border" />

              {status === "authenticated" && session?.user ? (
                <div className="flex flex-col gap-1">
                  <Link
                    href="/mydashboards"
                    className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-primary/10 hover:text-primary"
                  >
                    <LayoutDashboard size={16} />
                    My dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-destructive/10 hover:text-destructive"
                  >
                    <LogOut size={16} />
                    Cerrar sesión
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <Link
                    href="/auth?login"
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
                  >
                    <LogIn size={16} />
                    Ingresar
                  </Link>
                  <Link
                    href="/auth?signup"
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                  >
                    <UserPlus size={16} />
                    Crear cuenta
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}