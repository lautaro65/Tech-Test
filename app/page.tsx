"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  Radio,
  Smartphone,
  WandSparkles,
  Map,
  Users,
  Zap,
  BarChart3,
  CheckCircle2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import Footer from "../components/Footer";

// ─── Types ────────────────────────────────────────────────────────────────────

type MetricItem = {
  value: number;
  suffix: string;
  label: string;
  detail: string;
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const METRICS: MetricItem[] = [
  { value: 7,   suffix: "M+", label: "Asientos / temporada",   detail: "Asientos gestionados por temporada" },
  { value: 200, suffix: "M+", label: "Impresiones anuales",     detail: "Impresiones anuales en experiencias" },
  { value: 70,  suffix: "%",  label: "Compras desde mobile",    detail: "Compras optimizadas desde mobile" },
  { value: 3,   suffix: "M+", label: "Eventos configurados",    detail: "Eventos configurados en FANZ" },
];

const FEATURES = [
  {
    icon: Map,
    title: "Editor visual de mapas",
    description: "Diseñá mesas, filas, sillas y zonas arrastrando elementos sobre el canvas. Sin código, sin fricción.",
    bullets: ["Canvas drag & drop", "Zoom y navegación fluida", "Múltiples tipos de entidad"],
  },
  {
    icon: Users,
    title: "Colaboración en equipo",
    description: "Invitá editores y viewers, asigná permisos y trabajá en el mismo evento en tiempo real.",
    bullets: ["Roles editor / viewer", "Invitaciones por link", "Historial de cambios"],
  },
  {
    icon: Zap,
    title: "Publicación instantánea",
    description: "Los cambios en el mapa se reflejan de forma inmediata. Actualizá precios, zonas o capacidad sin downtime.",
    bullets: ["Sync en tiempo real", "Sin recarga de página", "Historial con undo/redo"],
  },
  {
    icon: BarChart3,
    title: "Optimizado para conversión",
    description: "Interfaz de compra adaptada para mobile que reduce el abandono y acelera la decisión del comprador.",
    bullets: ["Mobile-first design", "Selección visual de asientos", "Flujo de compra simplificado"],
  },
];

const TECH_ROW_ONE = [
  { name: "React",        logo: "/tech/react.svg" },
  { name: "Next.js",      logo: "/tech/nextjs.svg" },
  { name: "TypeScript",   logo: "/tech/typescript.svg" },
  { name: "Tailwind CSS", logo: "/tech/tailwindcss.svg" },
  { name: "PostgreSQL",   logo: "/tech/postgresql.svg" },
  { name: "Prisma",       logo: "/tech/prisma.svg" },
  { name: "shadcn/ui",    logo: "/tech/shadcnui.svg" },
];

const TECH_ROW_TWO = [
  { name: "Node.js", logo: "/tech/nodedotjs.svg" },
  { name: "Motion",  logo: "/tech/framer.svg" },
  { name: "Lucide",  logo: "/tech/lucide.svg" },
  { name: "ESLint",  logo: "/tech/eslint.svg" },
  { name: "Vercel",  logo: "/tech/vercel.svg" },
  { name: "npm",     logo: "/tech/npm.svg" },
  { name: "GitHub",  logo: "/tech/github.svg" },
];

const TECH_ROW_ONE_LOOP = [...TECH_ROW_ONE, ...TECH_ROW_ONE];
const TECH_ROW_TWO_LOOP = [...TECH_ROW_TWO, ...TECH_ROW_TWO];

const PREVIEW_ROWS = [
  { label: "A", seats: [0,0,0,0,0,0,0,0,0,0] },
  { label: "B", seats: [0,0,2,2,2,2,2,0,0,0] },
  { label: "C", seats: [0,0,0,0,1,0,0,0,0,0] },
  { label: "D", seats: [0,0,0,0,0,0,0,0,0,0] },
];
// 0 = libre, 1 = seleccionado, 2 = VIP

// ─── CountUp ──────────────────────────────────────────────────────────────────

function CountUpNumber({
  to,
  suffix,
  start,
  reducedMotion,
}: {
  to: number;
  suffix: string;
  start: boolean;
  reducedMotion: boolean;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!start) return;
    if (reducedMotion) { setCount(to); return; }
    let af = 0;
    const duration = 1400;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      setCount(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) af = requestAnimationFrame(tick);
    };
    af = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(af);
  }, [reducedMotion, start, to]);

  return <span>{count}{suffix}</span>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const { status } = useSession();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const heroPrimaryHref =
    status === "authenticated"
      ? "/mydashboards"
      : "/auth?signup&callbackUrl=/mydashboards";

  const metricsSectionRef = useRef<HTMLElement | null>(null);
  const [metricsInView, setMetricsInView] = useState(false);
  const sv = { once: true, amount: 0.15 };

  useEffect(() => {
    if (!metricsSectionRef.current || metricsInView) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e?.isIntersecting) { setMetricsInView(true); obs.disconnect(); } },
      { threshold: 0.2 },
    );
    obs.observe(metricsSectionRef.current);
    return () => obs.disconnect();
  }, [metricsInView]);

  return (
    <main className="bg-background text-foreground">

      {/* ──────────────────────────────────────────────────────────────
          HERO
      ────────────────────────────────────────────────────────────── */}
      <section
        aria-labelledby="hero-title"
        className="relative overflow-hidden border-b border-border/60 bg-card text-card-foreground"
      >
        {/* Orbs de fondo */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_10%,var(--color-primary)/0.20,transparent_38%),radial-gradient(ellipse_at_82%_80%,var(--color-accent)/0.16,transparent_36%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-[-260px] mx-auto h-[480px] w-[820px] rounded-full bg-primary/20 blur-3xl" />
        {/* Línea de ruido horizontal sutil */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(to_right,transparent,var(--color-primary)/0.5,transparent)]" />

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto grid min-h-[calc(100vh-64px)] w-full max-w-[1200px] items-center gap-12 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:px-10"
        >
          {/* Texto */}
          <div>
            {/* Badge animado */}
            <motion.span
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-primary"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              FANZ · Event mapping platform
            </motion.span>

            <motion.h1
              id="hero-title"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 max-w-xl text-5xl font-semibold leading-[0.92] tracking-tight sm:text-6xl lg:text-[4.5rem]"
            >
              Vende más entradas
              <span className="mt-1 block bg-[linear-gradient(135deg,var(--color-primary),var(--color-accent-foreground))] bg-clip-text text-transparent">
                con mapas visuales
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.18 }}
              className="mt-6 max-w-[420px] text-base leading-relaxed text-muted-foreground sm:text-lg"
            >
              Diseña, publica y actualiza en tiempo real para que tu equipo lance
              eventos más rápido y convierta mejor en desktop y mobile.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.26 }}
              className="mt-9 flex flex-col gap-3 sm:flex-row"
            >
              <Link
                href={heroPrimaryHref}
                aria-label={status === "authenticated" ? "Ir a mis dashboards" : "Empezar gratis"}
                className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_8px_30px_-8px_var(--color-primary)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-12px_var(--color-primary)]"
              >
                <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.12)_50%,transparent_75%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <span className="relative">
                  {status === "authenticated" ? "Ir a mis dashboards" : "Empezar gratis"}
                </span>
                <ArrowRight size={15} className="relative transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
              {status !== "authenticated" && (
                <Link
                  href="/auth?login&callbackUrl=/mydashboards"
                  className="inline-flex items-center justify-center rounded-xl border border-border px-7 py-3.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-muted"
                >
                  Ya tengo cuenta
                </Link>
              )}
            </motion.div>

            {/* Social proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.38 }}
              className="mt-6 flex items-center gap-4"
            >
              <div className="flex -space-x-2">
                {["bg-chart-1","bg-chart-2","bg-chart-3","bg-chart-5"].map((c, i) => (
                  <span key={i} className={`inline-block h-7 w-7 rounded-full border-2 border-card ${c} opacity-80`} />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">+3M</span> eventos configurados en 14 países
              </p>
            </motion.div>
          </div>

          {/* Preview card */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.65, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto w-full max-w-[400px]"
          >
            {/* Pills flotantes */}
            {[
              { icon: Radio,        label: "Live updates",  pos: "absolute -left-24 top-6 z-20",     delay: 0.5 },
              { icon: Smartphone,   label: "Mobile-ready",  pos: "absolute -right-24 top-20 z-20",   delay: 0.6 },
              { icon: WandSparkles, label: "No code",       pos: "absolute left-1/2 -bottom-12 z-20 -translate-x-1/2", delay: 0.7 },
            ].map(({ icon: Icon, label, pos, delay }) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, delay }}
                className={`hidden lg:inline-flex ${pos} items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-foreground shadow-md`}
              >
                <Icon size={11} className="text-primary" />
                {label}
              </motion.div>
            ))}

            {/* Glow */}
            <div className="absolute -inset-4 rounded-3xl bg-primary/8 blur-2xl" />

            {/* Ventana app */}
            <div className="relative rounded-2xl border border-border bg-background shadow-2xl overflow-hidden">
              {/* Topbar */}
              <div className="flex items-center justify-between border-b border-border/60 bg-card px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-destructive/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-chart-4/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-chart-2/80" />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">
                  Estadio Principal · Sector A
                </span>
                <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  En vivo
                </span>
              </div>

              <div className="p-4">
                {/* Escenario */}
                <div className="mb-4 flex justify-center">
                  <div className="flex h-6 w-4/5 items-center justify-center rounded-md border border-primary/25 bg-[linear-gradient(to_bottom,var(--color-primary)/0.12,var(--color-primary)/0.06)]">
                    <span className="text-[8px] font-black uppercase tracking-[0.25em] text-primary/50">
                      ▲ Escenario
                    </span>
                  </div>
                </div>

                {/* Asientos */}
                <div className="space-y-1.5 px-1">
                  {PREVIEW_ROWS.map(({ label, seats }) => (
                    <div key={label} className="flex items-center gap-1.5 justify-center">
                      <span className="w-3 shrink-0 text-[8px] font-bold text-muted-foreground/50 text-right">
                        {label}
                      </span>
                      <div className="flex gap-[3px]">
                        {seats.map((type, si) => (
                          <motion.span
                            key={si}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.25 + si * 0.025 + PREVIEW_ROWS.findIndex(r => r.label === label) * 0.06, duration: 0.2, type: "spring", stiffness: 400 }}
                            className={`h-4 w-4 rounded-[3px] transition-colors ${
                              type === 2 ? "bg-chart-3/75 ring-1 ring-chart-3/30"
                              : type === 1 ? "bg-primary ring-2 ring-primary/40"
                              : "bg-muted hover:bg-primary/20"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Leyenda */}
                <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
                  <div className="flex items-center gap-3">
                    {[
                      { color: "bg-muted border border-border", label: "Libre" },
                      { color: "bg-chart-3/75",                 label: "VIP" },
                      { color: "bg-primary",                    label: "Selec." },
                    ].map(({ color, label }) => (
                      <span key={label} className="flex items-center gap-1 text-[9px] text-muted-foreground">
                        <span className={`h-2 w-2 rounded-[2px] ${color}`} />
                        {label}
                      </span>
                    ))}
                  </div>
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary">
                    1 selec.
                  </span>
                </div>
              </div>
            </div>

            {/* Pills mobile */}
            <div className="mt-4 flex flex-wrap justify-center gap-2 lg:hidden">
              {[
                { icon: Radio,        label: "Live updates" },
                { icon: Smartphone,   label: "Mobile-ready" },
                { icon: WandSparkles, label: "No code" },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-foreground shadow-sm">
                  <Icon size={11} className="text-primary" />
                  {label}
                </span>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ──────────────────────────────────────────────────────────────
          FEATURES
      ────────────────────────────────────────────────────────────── */}
      <section
        aria-labelledby="features-title"
        className="relative overflow-hidden border-b border-border/60 bg-background py-20 sm:py-24 lg:py-28"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_75%_5%,var(--color-primary)/0.08,transparent_45%)]" />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          viewport={sv}
          className="relative mx-auto w-full max-w-[1200px] px-6 lg:px-10"
        >
          {/* Header */}
          <div className="mx-auto max-w-lg text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              Funcionalidades
            </p>
            <h2
              id="features-title"
              className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl"
            >
              Todo lo que necesitás
              <span className="block text-muted-foreground/60">en un solo lugar</span>
            </h2>
          </div>

          {/* Cards */}
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.42, delay: 0.06 * i, ease: [0.22, 1, 0.36, 1] }}
                  className="group relative flex flex-col rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_8px_24px_-8px_var(--color-primary)/20]"
                >
                  {/* Línea top en hover */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-2xl bg-[linear-gradient(to_right,transparent,var(--color-primary)/0.5,transparent)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                  {/* Ícono */}
                  <div className="mb-5 inline-flex w-fit rounded-xl border border-primary/15 bg-primary/8 p-3 ring-1 ring-inset ring-primary/10">
                    <Icon size={20} className="text-primary" strokeWidth={1.75} />
                  </div>

                  <h3 className="text-sm font-semibold text-foreground leading-snug">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground flex-1">
                    {feature.description}
                  </p>

                  {/* Bullets */}
                  <ul className="mt-5 space-y-1.5 border-t border-border/50 pt-4">
                    {feature.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-2 text-[12px] text-muted-foreground">
                        <CheckCircle2 size={12} className="shrink-0 text-primary/70" strokeWidth={2.5} />
                        {b}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* ──────────────────────────────────────────────────────────────
          METRICS — grid de 4 en vez de lista scrolleable
      ────────────────────────────────────────────────────────────── */}
         <section
        id="sobre-proyecto"
        aria-labelledby="metrics-title"
        ref={metricsSectionRef}
        className="relative overflow-hidden border-b border-border/60 bg-card py-16 sm:py-20"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,var(--color-primary)/0.09,transparent_38%),radial-gradient(circle_at_82%_78%,var(--color-chart-3)/0.07,transparent_34%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.22] [background-image:linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] [background-size:34px_34px]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(to_bottom,var(--color-card)/0.75,transparent)]" />
        <div className="pointer-events-none absolute -left-20 top-10 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-8 h-72 w-72 rounded-full bg-chart-3/10 blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          viewport={sv}
          className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1200px] items-start gap-12 px-6 py-4 md:items-center lg:grid-cols-[0.45fr_0.55fr] lg:px-10"
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="lg:sticky lg:top-28"
          >
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              Impacto medible
            </p>
            <h2
              id="metrics-title"
              className="mt-3 text-4xl font-semibold tracking-tight sm:text-6xl md:text-7xl"
            >
              FANZ
              <span className="block">Prueba técnica</span>
            </h2>
            <p className="mt-5 max-w-sm text-base leading-relaxed text-muted-foreground sm:text-lg">
              Métricas reales de operación para equipos que gestionan ticketing a escala.
            </p>
          </motion.div>

          <div className="space-y-7 sm:space-y-8 md:space-y-9">
            {METRICS.map((metric, index) => (
              <motion.article
                key={metric.label}
                initial={{ opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.45, delay: 0.08 * index, ease: [0.22, 1, 0.36, 1] }}
                className="border-b border-border/70 pb-6 last:border-b-0 last:pb-0"
              >
                <p className="bg-[linear-gradient(135deg,var(--color-primary),var(--color-chart-3))] bg-clip-text text-6xl font-semibold leading-none tracking-tight text-transparent sm:text-7xl md:text-8xl">
                  <CountUpNumber
                    to={metric.value}
                    suffix={metric.suffix}
                    start={metricsInView}
                    reducedMotion={prefersReducedMotion}
                  />
                </p>
                <p className="mt-2 text-xl font-semibold uppercase tracking-tight text-primary sm:text-2xl md:text-3xl">
                  {metric.label}
                </p>
                <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                  {metric.detail}
                </p>
              </motion.article>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ──────────────────────────────────────────────────────────────
          TECH STACK
      ────────────────────────────────────────────────────────────── */}
      <section
        aria-labelledby="tech-title"
        className="relative overflow-hidden border-b border-border/60 bg-foreground py-16 text-background"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_18%_24%,var(--color-primary)/0.28,transparent_40%),radial-gradient(ellipse_at_84%_74%,var(--color-accent)/0.18,transparent_36%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(to_right,var(--color-background)/0.2_1px,transparent_1px),linear-gradient(to_bottom,var(--color-background)/0.2_1px,transparent_1px)] [background-size:36px_36px]" />
        <div className="pointer-events-none absolute -left-24 top-4 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-chart-1/20 blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          viewport={sv}
          className="relative z-10 mx-auto w-full max-w-[1200px] px-6 lg:px-10"
        >
          <p className="text-center text-[11px] font-semibold uppercase tracking-widest text-background/60">
            Tech stack
          </p>
          <h3
            id="tech-title"
            className="mt-2 text-center text-2xl font-semibold tracking-tight text-background sm:text-3xl"
          >
            Construido con las mejores herramientas
          </h3>

          <div className="mt-10 space-y-3">
            {[
              { loop: TECH_ROW_ONE_LOOP, dir: ["0%", "-50%"] as [string, string], dur: 28 },
              { loop: TECH_ROW_TWO_LOOP, dir: ["-50%", "0%"] as [string, string], dur: 32 },
            ].map(({ loop, dir, dur }, ri) => (
              <div
                key={ri}
                className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]"
              >
                <motion.div
                  className="flex w-max gap-2.5"
                  animate={prefersReducedMotion ? undefined : { x: dir }}
                  transition={prefersReducedMotion ? { duration: 0 } : { duration: dur, repeat: Infinity, ease: "linear" }}
                >
                  {loop.map((tech, idx) => (
                    <div
                      key={`r${ri}-${tech.name}-${idx}`}
                      className="inline-flex min-w-[160px] items-center gap-2 rounded-xl border border-background/15 bg-background/8 px-4 py-2.5 text-sm font-medium text-background/85 backdrop-blur transition-colors hover:bg-background/15"
                    >
                      <Image src={tech.logo} alt="" aria-hidden width={18} height={18} className="h-[18px] w-[18px] shrink-0 opacity-85" loading="lazy" />
                      {tech.name}
                    </div>
                  ))}
                </motion.div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ──────────────────────────────────────────────────────────────
          CTA
      ────────────────────────────────────────────────────────────── */}
      <section
        aria-labelledby="cta-title"
        className="relative overflow-hidden bg-background py-20 sm:py-28 lg:py-32"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_22%_20%,var(--color-primary)/0.12,transparent_42%),radial-gradient(ellipse_at_80%_80%,var(--color-chart-1)/0.10,transparent_38%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-[-200px] mx-auto h-[400px] w-[1000px] rounded-full bg-primary/8 blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto w-full max-w-[900px] px-6 lg:px-10"
        >
          <div className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card p-10 text-center shadow-[0_24px_60px_-30px_var(--color-primary)/25] sm:p-14 lg:p-20">
            {/* Detalles decorativos */}
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-[linear-gradient(to_right,transparent,var(--color-primary)/0.6,transparent)]" />
            <div className="pointer-events-none absolute inset-x-8 bottom-0 h-px bg-[linear-gradient(to_right,transparent,var(--color-border)/0.6,transparent)]" />
            <div className="pointer-events-none absolute -left-20 top-0 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-16 bottom-0 h-40 w-40 rounded-full bg-chart-1/10 blur-3xl" />

            <span className="relative inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/8 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Empezá hoy · sin tarjeta de crédito
            </span>

            <h4
              id="cta-title"
              className="relative mt-6 text-3xl font-semibold leading-[1.06] tracking-tight sm:text-5xl lg:text-6xl"
            >
              Tu próximo evento,
              <span className="mt-1 block bg-[linear-gradient(135deg,var(--color-primary),var(--color-accent-foreground))] bg-clip-text text-transparent">
                listo en minutos
              </span>
            </h4>

            <p className="relative mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Creá tu mapa, invitá a tu equipo y publicá cambios en tiempo real
              sin depender de desarrolladores.
            </p>

            {/* Checklist rápida */}
            <div className="relative mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2">
              {["Setup en menos de 5 minutos", "Colaboración ilimitada", "Soporte en tiempo real"].map((item) => (
                <span key={item} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CheckCircle2 size={13} className="shrink-0 text-primary" strokeWidth={2.5} />
                  {item}
                </span>
              ))}
            </div>

            <div className="relative mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              {status === "authenticated" ? (
                <Link
                  href="/mydashboards"
                  className="group inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_12px_32px_-10px_var(--color-primary)] transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-[0_20px_40px_-14px_var(--color-primary)]"
                >
                  Ir a mis dashboards
                  <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth?signup&callbackUrl=/mydashboards"
                    className="group inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_12px_32px_-10px_var(--color-primary)] transition-all hover:-translate-y-0.5 hover:bg-primary/90"
                  >
                    Crear cuenta gratis
                    <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>
                  <Link
                    href="/auth?login&callbackUrl=/mydashboards"
                    className="inline-flex items-center justify-center rounded-xl border border-border px-8 py-3.5 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-muted hover:text-primary"
                  >
                    Ya tengo cuenta
                  </Link>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ──────────────────────────────────────────────────────────────
          IDENTITY BANNER
      ────────────────────────────────────────────────────────────── */}
      <section
        aria-label="Identidad de la prueba técnica"
        className="relative overflow-hidden border-t border-border/60 bg-foreground py-10 text-background sm:py-14"
      >
        <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(to_right,var(--color-background)/0.2_1px,transparent_1px),linear-gradient(to_bottom,var(--color-background)/0.2_1px,transparent_1px)] [background-size:30px_30px]" />
        <div className="pointer-events-none absolute -left-16 top-1/2 h-44 w-44 -translate-y-1/2 rounded-full bg-primary/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 bottom-2 h-36 w-36 rounded-full bg-chart-1/20 blur-3xl" />
        <p className="sr-only">Prueba Técnica de Lautaro Faure para FANZ.</p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          viewport={sv}
          className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]"
          aria-hidden="true"
        >
          <motion.div
            className="flex w-max items-center gap-8 whitespace-nowrap"
            animate={prefersReducedMotion ? undefined : { x: ["0%", "-50%"] }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 24, repeat: Infinity, ease: "linear" }}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <span
                key={i}
                className="text-2xl font-semibold uppercase tracking-tight text-background/75 sm:text-5xl lg:text-6xl"
              >
                Prueba Tecnica · Lautaro Faure · Fanz ·
              </span>
            ))}
          </motion.div>
        </motion.div>
      </section>

      <Footer isAuthenticated={status === "authenticated"} />
    </main>
  );
}