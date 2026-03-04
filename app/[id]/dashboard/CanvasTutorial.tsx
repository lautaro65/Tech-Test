"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, ArrowRight, ArrowLeft, Sparkles, Monitor } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Side = "top" | "bottom" | "left" | "right" | "center";

type TutorialStep = {
  /** CSS selector of the element to spotlight. null = center overlay only */
  selector: string | null;
  /** Which side of the element to place the tooltip */
  side: Side;
  title: string;
  description: string;
  /** Extra padding around the spotlight rect (px) */
  padding?: number;
  /** Si es true muestra un banner de advertencia estilo "recomendación" */
  isWarning?: boolean;
  /** Lista de atajos de teclado para mostrar como tabla */
  extraShortcuts?: { keys: string[]; label: string }[];
};

// ─── Steps Desktop ────────────────────────────────────────────────────────────

const STEPS_DESKTOP: TutorialStep[] = [
  {
    selector: null,
    side: "center",
    title: "¡Bienvenido al Canvas! 🎉",
    description:
      "Este es tu espacio de trabajo para diseñar eventos con mesas, filas y sillas. Te vamos a mostrar las funciones principales en unos pasos rápidos.",
    padding: 0,
  },
  {
    selector: "[data-tutorial='sidebar-tools']",
    side: "right",
    title: "Herramientas",
    description:
      "Desde acá podés agregar sillas sueltas, filas de asientos, mesas circulares y rectangulares, y áreas de sector. Hacé click en cualquiera y luego click en el canvas para colocarlo.",
    padding: 8,
  },
  {
    selector: "[data-tutorial='canvas-area']",
    side: "left",
    title: "Canvas de trabajo",
    description:
      "Hacé click para colocar elementos, arrastrá para moverlos, y usá la rueda del mouse (en modo Arrastrar) para hacer zoom. Podés seleccionar varios elementos a la vez con un rectángulo de selección.",
    padding: 12,
  },
  {
    selector: "[data-tutorial='mouse-mode-select']",
    side: "center",
    title: "Modo Seleccionar",
    description:
      "Con este modo activo podés seleccionar, mover y editar elementos. Usá Ctrl+Click para selección múltiple. Atajo de teclado: V",
    padding: 8,
  }
  ,
  {
    selector: "[data-tutorial='mouse-mode-pan']",
    side: "center",
    title: "Modo Arrastrar (Pan)",
    description:
      "Activá este modo para mover la vista del canvas sin afectar los elementos. También podés hacer zoom con la rueda del mouse en este modo. Atajo: H",
    padding: 8,
  },
  {
    selector: "[data-tutorial='undo-redo']",
    side: "right",
    title: "Deshacer / Rehacer",
    description:
      "¿Te equivocaste? No hay drama. Usá estos botones o los atajos Ctrl+Z y Ctrl+Y para navegar el historial de cambios.",
    padding: 8,
  },
  {
    selector: "[data-tutorial='save-button']",
    side: "bottom",
    title: "Guardar",
    description:
      "Tus cambios se guardan localmente en tiempo real, pero acordate de guardar en el servidor con este botón (o Ctrl+S) para no perder nada.",
    padding: 8,
  },
  {
    selector: "[data-tutorial='properties-panel']",
    side: "left",
    title: "Panel de Propiedades",
    description:
      "Al seleccionar un elemento aparecen sus propiedades: podés cambiar etiqueta, posición, rotación, color y configuraciones específicas de cada tipo.",
    padding: 8,
  },
   {
    selector: null,
    side: "center",
    title: "Atajos y comandos extra ⌨️",
    description: "",
    padding: 0,
    extraShortcuts: [
      {
        keys: ["Ctrl", "Click"],
        label: "Seleccionar un elemento individual dentro de un área",
      },
      {
        keys: ["Ctrl", "Arrastrar"],
        label: "Dibujar una zona de selección que incluye solo elementos dentro del área (sin contar el área en sí)",
      },
      {
        keys: ["R"],
        label: "Rotar 90° los elementos seleccionados",
      },
      {
        keys: ["↑ ↓ ← →"],
        label: "Mover los elementos seleccionados (también funciona con W A S D)",
      },
    ],
  },
  {
    selector: null,
    side: "center",
    title: "¡Listo para empezar! 🚀",
    description:
      "Ya conocés todo lo básico. Podés reabrir este tutorial en cualquier momento desde el menú. ¡Que empiece el diseño!",
    padding: 0,
  },
];

// ─── Steps Mobile ─────────────────────────────────────────────────────────────

const STEPS_MOBILE: TutorialStep[] = [
  {
    selector: null,
    side: "center",
    title: "Tutorial Mobile",
    description:
      "El Canvas está optimizado para computadoras de escritorio. Desde mobile podés explorar, pero algunas funciones están limitadas y la experiencia es mejor en una pantalla más grande.",
    padding: 0,
    isWarning: true,
  },
  {
    selector: null,
    side: "center",
    title: "¡Bienvenido al Canvas! 🎉",
    description:
      "Este es tu espacio de trabajo para diseñar eventos con mesas, filas y sillas. Te vamos a mostrar las funciones disponibles en mobile.",
    padding: 0,
  },
  {
    selector: "[data-tutorial='sidebar-tools']",
    side: "right",
    title: "Herramientas",
    description:
      "Desde acá podés agregar sillas sueltas, filas de asientos, mesas circulares y rectangulares, y áreas de sector. Tocá cualquiera y luego tocá el canvas para colocarlo.",
    padding: 8,
  },
  {
    selector: "[data-tutorial='canvas-area']",
    side: "left",
    title: "Canvas de trabajo",
    description:
      "Tocá para colocar elementos y arrastralos para moverlos. Podés hacer zoom con dos dedos (pinch). La selección múltiple no está disponible en mobile.",
    padding: 12,
  },
  {
    selector: "[data-tutorial='undo-redo']",
    side: "center",
    title: "Deshacer / Rehacer",
    description:
      "¿Te equivocaste? No hay drama. Usá estos botones para navegar el historial de cambios.",
    padding: 8,
  },
  {
    selector: "[data-tutorial='save-button']",
    side: "bottom",
    title: "Guardar",
    description:
      "Tus cambios se guardan localmente en tiempo real, pero acordate de guardar en el servidor con este botón para no perder nada.",
    padding: 8,
  },
  {
    selector: null,
    side: "center",
    title: "¡Listo para empezar! 🚀",
    description:
      "Ya conocés lo básico en mobile. Para una experiencia completa con todas las funcionalidades, te recomendamos usar una computadora.",
    padding: 0,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TOOLTIP_W = 320;
const TOOLTIP_W_WIDE = 400; // para el paso de atajos
const TOOLTIP_H_APPROX = 180;
const GAP = 16; // gap between spotlight and tooltip

function getSpotlightRect(selector: string, padding = 8): DOMRect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return new DOMRect(
    rect.left - padding,
    rect.top - padding,
    rect.width + padding * 2,
    rect.height + padding * 2,
  );
}

function computeTooltipPosition(
  spotlight: DOMRect | null,
  side: Side,
  vw: number,
  vh: number,
  tooltipW: number,
): { top: number; left: number; arrowSide: Side | null } {
  if (!spotlight || side === "center") {
    return {
      top: vh / 2 - TOOLTIP_H_APPROX / 2,
      left: vw / 2 - tooltipW / 2,
      arrowSide: null,
    };
  }

  const margin = 12;
  let top = 0;
  let left = 0;

  switch (side) {
    case "right":
      top = spotlight.top + spotlight.height / 2 - TOOLTIP_H_APPROX / 2;
      left = spotlight.right + GAP;
      break;
    case "left":
      top = spotlight.top + spotlight.height / 2 - TOOLTIP_H_APPROX / 2;
      left = spotlight.left - GAP - tooltipW;
      break;
    case "bottom":
      top = spotlight.bottom + GAP;
      left = spotlight.left + spotlight.width / 2 - tooltipW / 2;
      break;
    case "top":
    default:
      top = spotlight.top - GAP - TOOLTIP_H_APPROX;
      left = spotlight.left + spotlight.width / 2 - tooltipW / 2;
      break;
  }

  // clamp within viewport
  top = Math.max(margin, Math.min(vh - TOOLTIP_H_APPROX - margin, top));
  left = Math.max(margin, Math.min(vw - tooltipW - margin, left));

  // If the tooltip overlaps the spotlight rect, push it clear so it never covers the highlighted element
  const tooltipBottom = top + TOOLTIP_H_APPROX;
  const tooltipRight = left + tooltipW;
  const overlapsV = top < spotlight.bottom && tooltipBottom > spotlight.top;
  const overlapsH = left < spotlight.right && tooltipRight > spotlight.left;

  if (overlapsV && overlapsH) {
    if (side === "top" || side === "bottom") {
      const aboveTop = spotlight.top - GAP - TOOLTIP_H_APPROX;
      if (aboveTop >= margin) {
        top = aboveTop;
      } else {
        top = Math.min(spotlight.bottom + GAP, vh - TOOLTIP_H_APPROX - margin);
      }
    } else if (side === "right" || side === "left") {
      top = Math.max(
        margin,
        Math.min(
          vh - TOOLTIP_H_APPROX - margin,
          spotlight.top - TOOLTIP_H_APPROX - GAP,
        ),
      );
    }
  }

  return { top, left, arrowSide: side };
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  /** Called when user finishes or skips – persists to DB */
  onDone: () => void;
  /** Whether the user is on a mobile viewport */
  isMobile?: boolean;
};

export default function CanvasTutorial({ onDone, isMobile = false }: Props) {
  const STEPS = isMobile ? STEPS_MOBILE : STEPS_DESKTOP;

  const [stepIndex, setStepIndex] = useState(0);
  const [spotlight, setSpotlight] = useState<DOMRect | null>(null);
  const [vw, setVw] = useState(window.innerWidth);
  const [vh, setVh] = useState(window.innerHeight);
  const rafRef = useRef<number | null>(null);

  const step = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  // Recompute spotlight on step change and on resize
  const updateSpotlight = useCallback(() => {
    if (!step.selector) {
      setSpotlight(null);
      return;
    }
    const rect = getSpotlightRect(step.selector, step.padding ?? 8);
    setSpotlight(rect);
  }, [step]);

  useEffect(() => {
    // slight delay so elements have rendered
    const t = setTimeout(updateSpotlight, 80);
    return () => clearTimeout(t);
  }, [updateSpotlight]);

  useEffect(() => {
    const handleResize = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateSpotlight);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [updateSpotlight]);

  const tooltipW = step.extraShortcuts ? TOOLTIP_W_WIDE : TOOLTIP_W;
  const { top, left } = computeTooltipPosition(
    spotlight,
    step.side,
    vw,
    vh,
    tooltipW,
  );

  const handleNext = () => {
    if (isLast) {
      onDone();
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) setStepIndex((i) => i - 1);
  };

  // SVG mask path: full screen rect minus spotlight cutout
  const maskPath = spotlight
    ? `M0,0 H${vw} V${vh} H0 Z M${spotlight.left},${spotlight.top} H${spotlight.right} V${spotlight.bottom} H${spotlight.left} Z`
    : `M0,0 H${vw} V${vh} H0 Z`;

  return (
    <div
      className="fixed inset-0 z-[9000] select-none"
      style={{ pointerEvents: "auto" }}
    >
      {/* Dark overlay with spotlight cutout */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: "none" }}
        aria-hidden="true"
      >
        <defs>
          <clipPath id="tutorial-spotlight-clip">
            <path fillRule="evenodd" d={maskPath} />
          </clipPath>
        </defs>
        <rect
          x={0}
          y={0}
          width={vw}
          height={vh}
          fill="rgba(0,0,0,0.62)"
          clipPath="url(#tutorial-spotlight-clip)"
        />
        {spotlight && (
          <rect
            x={spotlight.left}
            y={spotlight.top}
            width={spotlight.width}
            height={spotlight.height}
            rx={10}
            ry={10}
            fill="none"
            stroke="var(--primary)"
            strokeWidth={2.5}
            strokeDasharray="6 4"
            opacity={0.85}
          />
        )}
      </svg>

      {/* Tooltip card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stepIndex}
          initial={{ opacity: 0, y: 10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
          style={{
            position: "fixed",
            top,
            left,
            width: tooltipW,
            zIndex: 9001,
          }}
          className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
        >
          {/* Header accent bar — ámbar si es warning, azul si no */}
          <div
            className={`h-1 w-full bg-gradient-to-r ${
              step.isWarning
                ? "from-amber-400 to-orange-400"
                : "from-primary to-accent-foreground"
            }`}
          />

          <div className="px-5 pt-4 pb-5 flex flex-col gap-3">
            {/* Step counter + close */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles
                  size={14}
                  className={
                    step.isWarning ? "text-amber-500" : "text-primary"
                  }
                />
                <span
                  className={`text-[11px] font-semibold uppercase tracking-wide ${
                    step.isWarning ? "text-amber-500" : "text-primary"
                  }`}
                >
                  Paso {stepIndex + 1} de {STEPS.length}
                </span>
              </div>
              <button
                type="button"
                onClick={onDone}
                className="text-muted-foreground hover:text-foreground transition rounded-full p-1 hover:bg-muted"
                aria-label="Cerrar tutorial"
              >
                <X size={16} />
              </button>
            </div>

            {/* Progress dots */}
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setStepIndex(i)}
                  className="transition-all rounded-full"
                  style={{
                    width: i === stepIndex ? 20 : 7,
                    height: 7,
                    background:
                      i === stepIndex
                        ? step.isWarning
                          ? "var(--color-chart-3)"
                          : "var(--primary)"
                        : "var(--border)",
                  }}
                  aria-label={`Ir al paso ${i + 1}`}
                />
              ))}
            </div>

            {/* Warning banner — solo aparece en pasos con isWarning */}
            {step.isWarning && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
                <Monitor size={15} className="text-amber-500 mt-0.5 shrink-0" />
                <span className="text-[11px] font-semibold text-amber-700 leading-relaxed">
                  Se recomienda utilizar una computadora para una mejor
                  experiencia y mayor funcionalidad
                </span>
              </div>
            )}

            {/* Content */}
            <div className="flex flex-col gap-1.5">
              <h3 className="text-sm font-bold text-foreground leading-snug">
                {step.title}
              </h3>
              {step.description && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              )}
            </div>

            {/* Shortcuts table */}
            {step.extraShortcuts && (
              <div className="flex flex-col gap-1.5 mt-0.5">
                {step.extraShortcuts.map((shortcut, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      {shortcut.keys.map((key, ki) => (
                        <React.Fragment key={ki}>
                          <kbd className="inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground shadow-sm leading-none whitespace-nowrap">
                            {key}
                          </kbd>
                          {ki < shortcut.keys.length - 1 && (
                            <span className="text-[10px] text-muted-foreground">
                              +
                            </span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                    <span className="text-[11px] text-muted-foreground leading-relaxed">
                      {shortcut.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={onDone}
                className="text-xs text-muted-foreground hover:text-foreground transition underline underline-offset-2"
              >
                Saltar tutorial
              </button>
              <div className="flex gap-2">
                {!isFirst && (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition"
                  >
                    <ArrowLeft size={13} />
                    Anterior
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition"
                >
                  {isLast ? "¡Empezar!" : "Siguiente"}
                  {!isLast && <ArrowRight size={13} />}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}