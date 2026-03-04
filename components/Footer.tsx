"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight } from "lucide-react";

type FooterProps = {
  isAuthenticated: boolean;
};

export default function Footer({ isAuthenticated }: FooterProps) {
  const year = new Date().getFullYear();
  const prefersReducedMotion = useReducedMotion() ?? false;

  return (
    <motion.footer
      role="contentinfo"
      aria-labelledby="footer-brand"
      className="relative overflow-hidden bg-foreground py-16 text-background sm:py-24"
      initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 70 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : { duration: 0.7, ease: [0.22, 1, 0.36, 1] }
      }
      viewport={{ once: true, amount: 0.2 }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,var(--color-primary)/0.28,transparent_36%),radial-gradient(circle_at_82%_78%,var(--color-chart-1)/0.2,transparent_34%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] [background-size:30px_30px] invert dark:invert-0" />

      <div className="relative z-10 mx-auto max-w-[1200px] px-6 lg:px-10">
        <div className="mb-12 grid gap-12 border-b border-background/15 pb-12 md:grid-cols-[1.1fr_0.9fr] md:items-start">
          <motion.div
            initial={
              prefersReducedMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }
            }
            whileInView={{ opacity: 1, x: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
            }
            viewport={{ once: true }}
          >
            <h2
              id="footer-brand"
              className="text-5xl font-black uppercase tracking-tight sm:text-7xl lg:text-8xl"
            >
              FANZ.
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-background/75 sm:text-lg">
              Prueba técnica de plataforma visual para diseñar mapas de asientos, publicar dashboards
              y coordinar operaciones de eventos en tiempo real.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 gap-8 sm:grid-cols-2"
            initial={
              prefersReducedMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: 40 }
            }
            whileInView={{ opacity: 1, x: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
            }
            viewport={{ once: true }}
          >
            <nav aria-label="Producto">
              <h5 className="mb-4 text-sm font-bold uppercase tracking-wide text-background/90">
                Producto
              </h5>
              <ul className="space-y-2 text-sm text-background/70">
                <li>
                  <Link href="/" className="rounded-sm transition hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/70 focus-visible:ring-offset-2 focus-visible:ring-offset-foreground">
                    Home
                  </Link>
                </li>
                {isAuthenticated ? (
                  <li>
                    <Link href="/mydashboards" className="rounded-sm transition hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/70 focus-visible:ring-offset-2 focus-visible:ring-offset-foreground">
                      Mis dashboards
                    </Link>
                  </li>
                ) : (
                  <>
                    <li>
                      <Link href="/auth?login" className="rounded-sm transition hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/70 focus-visible:ring-offset-2 focus-visible:ring-offset-foreground">
                        Iniciar sesión
                      </Link>
                    </li>
                    <li>
                      <Link href="/auth?signup&callbackUrl=/mydashboards" className="rounded-sm transition hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/70 focus-visible:ring-offset-2 focus-visible:ring-offset-foreground">
                        Crear cuenta
                      </Link>
                    </li>
                  </>
                )}
              </ul>
            </nav>

            <nav aria-label="Legal">
              <h5 className="mb-4 text-sm font-bold uppercase tracking-wide text-background/90">
                Legal
              </h5>
              <ul className="space-y-2 text-sm text-background/70">
                <li>
                  <Link href="/privacidad" className="rounded-sm transition hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/70 focus-visible:ring-offset-2 focus-visible:ring-offset-foreground">
                    Privacidad
                  </Link>
                </li>
                <li>
                  <Link href="/terminos" className="rounded-sm transition hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/70 focus-visible:ring-offset-2 focus-visible:ring-offset-foreground">
                    Términos
                  </Link>
                </li>
                <li>
                  <Link href="/#sobre-proyecto" className="rounded-sm transition hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/70 focus-visible:ring-offset-2 focus-visible:ring-offset-foreground">
                    FANZ en números
                  </Link>
                </li>
              </ul>
            </nav>
          </motion.div>
        </div>

        <motion.div
          className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between"
          initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { duration: 0.55, ease: [0.22, 1, 0.36, 1] }
          }
          viewport={{ once: true }}
        >
          <div className="flex flex-wrap items-center gap-6 text-xs font-semibold uppercase tracking-wider text-background/60">
            <time dateTime={String(year)}>© {year} FANZ</time>
            <span>Prueba técnica · Lautaro Faure</span>
          </div>

          <Link
            href={isAuthenticated ? "/mydashboards" : "/auth?signup&callbackUrl=/mydashboards"}
            aria-label={isAuthenticated ? "Ir a mis dashboards" : "Crear cuenta en FANZ"}
            className="group inline-flex w-full items-center justify-center gap-2 rounded-xl border border-background/25 bg-background/10 px-5 py-2.5 text-sm font-semibold text-background transition hover:bg-background/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/70 focus-visible:ring-offset-2 focus-visible:ring-offset-foreground md:w-auto"
          >
            {isAuthenticated ? "Ir a mis dashboards" : "Crear cuenta en FANZ"}
            <ArrowUpRight size={16} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </motion.div>
      </div>
    </motion.footer>
  );
}