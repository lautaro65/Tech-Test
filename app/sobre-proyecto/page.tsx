"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Database,
  LayoutTemplate,
  Rocket,
  Share2,
  Sparkles,
  Workflow,
} from "lucide-react";
import Footer from "../../components/Footer";

const TIMELINE = [
  {
    day: "Día 1",
    title: "Definición de funcionalidades principales",
    description:
      "Arranqué por el corazón del producto: el canvas/editor. Priorizé las funciones clave para que el flujo base fuera usable desde el principio.",
    points: [
      "Identificación de casos de uso principales del editor",
      "Definición de navegación y estructura inicial",
      "Implementación de una primera base funcional",
    ],
    icon: Workflow,
  },
  {
    day: "Día 2",
    title: "Profundización de funciones core",
    description:
      "Con la base lista, profundicé en las funcionalidades principales para mejorar robustez, claridad del flujo y experiencia de uso.",
    points: [
      "Refinamiento de interacciones del canvas",
      "Mejora del comportamiento de flujos principales",
      "Ajustes para una experiencia más consistente",
    ],
    icon: Rocket,
  },
  {
    day: "Día 3",
    title: "Perfeccionamiento final + base de datos + páginas estáticas",
    description:
      "Cerré el ciclo con mejoras de calidad, conexión de base de datos y construcción de páginas estáticas para presentar el proyecto de forma completa.",
    points: [
      "Pulido final de funcionalidades implementadas",
      "Conexión y validación de base de datos",
      "Diseño de páginas estáticas: Home y Sobre el proyecto",
    ],
    icon: Database,
  },
  {
    day: "Día 4",
    title: "Colaboración, temas y detalles de calidad",
    description:
      "Extendí el producto con un sistema completo de invitaciones por rol, nuevos atajos de teclado, sistema de temas claro/oscuro y múltiples fixes de calidad.",
    points: [
      "Sistema de invitaciones con roles VIEWER y EDITOR",
      "Validación de acceso al canvas por invitación aceptada",
      "Detección de membresía duplicada con opción de cambio de rol",
      "Rotación de elementos con tecla R y movimiento con flechas",
      "Tema claro/oscuro con next-themes integrado en toda la UI",
      "Fix de navegación: dashboard cargaba solo con F5",
      "Restricciones de edición para visitantes (solo lectura)",
    ],
    icon: Share2,
  },
  {
    day: "Día 5",
    title: "UX, theming global y etiquetado avanzado",
    description:
      "Refiné la experiencia de usuario con foco en consistencia visual, corrección de errores UX detectados en uso real y la implementación completa del sistema de etiquetado.",
    points: [
      "Aplicación correcta del sistema de temas (claro/oscuro) en todas las páginas",
      "Rediseño de la selección múltiple: agrupación de elementos por tipo en el sidebar",
      "Scroll vertical en el panel de acciones grupales para evitar desbordamiento",
      "Fix visual: al seleccionar un área, solo el área muestra borde de selección (sin ruido en los elementos internos)",
      "Etiquetado en serie por tipo: prefijo e inicio independiente para cada tipo de elemento seleccionado",
      "Sección 'Etiquetar por tipo' colapsable para mejor ergonomía visual",
      "Edición de labels de sillas individuales directamente desde el panel de la mesa",
      "Etiqueta obligatoria: el input de label aplica cambios al perder el foco y restaura el valor anterior si queda vacío",
    ],
    icon: Sparkles,
  },
] as const;

export default function SobreProyectoPage() {
  const { status } = useSession();

  return (
    <main className="bg-background text-foreground">
      <section
        aria-labelledby="sobre-proyecto-title"
        className="relative overflow-hidden border-b border-border/60 bg-card"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_14%,var(--color-primary)/0.14,transparent_34%),radial-gradient(circle_at_88%_76%,var(--color-chart-1)/0.11,transparent_34%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.2] [background-image:linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] [background-size:34px_34px]" />

        <div className="relative mx-auto w-full max-w-[1140px] px-4 py-12 sm:px-6 sm:py-18 lg:px-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            <ArrowLeft size={16} />
            Volver al inicio
          </Link>

          <span className="mt-5 ml-3 inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary sm:mt-6 sm:ml-4">
            Prueba técnica · FANZ
          </span>

          <h1
            id="sobre-proyecto-title"
            className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:mt-5 sm:text-5xl lg:text-6xl"
          >
            Cómo construí esta prueba técnica
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:mt-5 sm:text-lg">
            Esta página resume el proceso de trabajo por etapas. Organicé el desarrollo
            en cuatro días para priorizar funcionalidad, calidad técnica y presentación.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              Canvas-first
            </span>
            <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              Iteración por etapas
            </span>
            <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              DB + UI estática
            </span>
            <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              Colaboración por roles
            </span>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="roadmap-title"
        className="relative border-b border-border/60 bg-background py-12 sm:py-18"
      >
        <div className="mx-auto w-full max-w-[1140px] px-4 sm:px-6 lg:px-10">
          <div className="mb-7 flex items-center gap-3 sm:mb-8">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/12 text-primary">
              <Sparkles size={18} />
            </span>
            <h2 id="roadmap-title" className="text-xl font-semibold tracking-tight sm:text-3xl">
              Roadmap de ejecución
            </h2>
          </div>

          <div className="relative">
            <div className="absolute left-4 top-0 h-full w-px bg-border md:left-1/2 md:-translate-x-1/2" />

            <div className="space-y-5 sm:space-y-7">
              {TIMELINE.map((item, index) => {
                const Icon = item.icon;
                const alignRight = index % 2 !== 0;

                return (
                  <article
                    key={item.day}
                    className="relative md:grid md:grid-cols-2 md:gap-10"
                  >
                    <div className="absolute left-4 top-6 z-10 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-primary/30 bg-background text-primary md:left-1/2 md:h-9 md:w-9">
                      <Icon size={16} />
                    </div>

                    <div className={alignRight ? "md:col-start-2" : "md:col-start-1"}>
                      <div className="ml-8 rounded-2xl border border-border bg-card/70 p-4 shadow-sm backdrop-blur sm:ml-12 sm:p-7 md:ml-0">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:px-3 sm:text-xs">
                            {item.day}
                          </span>
                          <span className="text-[11px] font-medium uppercase tracking-wide text-primary sm:text-xs">
                            Etapa {index + 1}
                          </span>
                        </div>

                        <h3 className="mt-3 text-xl font-semibold tracking-tight sm:mt-4 sm:text-3xl">
                          {item.title}
                        </h3>

                        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:mt-3 sm:text-base">
                          {item.description}
                        </p>

                        <ul className="mt-4 space-y-2 sm:mt-5">
                          {item.points.map((point) => (
                            <li
                              key={point}
                              className="flex items-start gap-2 text-sm text-foreground/90 sm:text-base"
                            >
                              <CheckCircle2
                                size={16}
                                className="mt-0.5 shrink-0 text-primary"
                              />
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="resultado-final-title"
        className="relative overflow-hidden bg-card py-12 sm:py-16"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_22%,var(--color-primary)/0.1,transparent_34%),radial-gradient(circle_at_88%_78%,var(--color-chart-1)/0.1,transparent_34%)]" />
        <div className="mx-auto w-full max-w-[1140px] px-4 sm:px-6 lg:px-10">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-background p-6 sm:p-8 lg:p-10">
            <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-primary/10 blur-2xl" />

            <div className="grid gap-6 sm:gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                  <LayoutTemplate size={14} />
                  Resultado final
                </span>

                <h3
                  id="resultado-final-title"
                  className="mt-4 text-xl font-semibold tracking-tight sm:text-3xl lg:text-4xl"
                >
                  De idea inicial a
                  <span className="block text-primary">entrega lista para demo</span>
                </h3>

                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  El proyecto cierra con un flujo sólido del editor, integración con
                  base de datos, sistema de colaboración por roles y una presentación
                  estática que comunica claramente el alcance técnico y la evolución
                  del trabajo por etapas.
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                    Funcionalidades core listas
                  </span>
                  <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                    Integración end-to-end
                  </span>
                  <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                    UI de presentación final
                  </span>
                  <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                    Roles y permisos
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card/70 p-4 sm:p-5">
                <div className="space-y-3">
                  <div className="rounded-xl border border-border bg-background px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      01 · Base funcional
                    </p>
                    <p className="mt-1 text-sm font-semibold">Canvas priorizado</p>
                  </div>

                  <div className="flex justify-center text-primary/70">
                    <ArrowRight size={16} />
                  </div>

                  <div className="rounded-xl border border-border bg-background px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      02 · Integración
                    </p>
                    <p className="mt-1 text-sm font-semibold">DB conectada</p>
                  </div>

                  <div className="flex justify-center text-primary/70">
                    <ArrowRight size={16} />
                  </div>

                  <div className="rounded-xl border border-border bg-background px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      03 · Presentación
                    </p>
                    <p className="mt-1 text-sm font-semibold">Home + Sobre proyecto</p>
                  </div>

                  <div className="flex justify-center text-primary/70">
                    <ArrowRight size={16} />
                  </div>

                  <div className="rounded-xl border border-border bg-background px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      04 · Colaboración
                    </p>
                    <p className="mt-1 text-sm font-semibold">Roles + Temas + Calidad</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer isAuthenticated={status === "authenticated"} />
    </main>
  );
}