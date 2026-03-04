"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { motion } from "motion/react";
import { AnimatePresence } from "motion/react";
import { useParams } from "next/navigation";
import Canvas from "./Canvas";
import ConfirmModal from "./ConfirmModal";
import {
  ENTITY_GRID_SIZE,
  SIDEBAR_TOOL_CONFIG,
  getEntityRenderSize,
  type AreaShape,
  type Entity,
  type EntityType,
  type EntityUpdate,
  type RectTableLayout,
  type SidebarTool,
  getEntityType,
  expandSelectionWithRowChildren,
} from "./entities";
import { applyAreaAssociations } from "./areaAssociations";
import {
  MousePointer2,
  Hand,
  Trash2,
  ArrowRight,
  Tag,
  Move,
  RotateCcw,
  Palette,
  Settings,
  Grid3x3,
  Minus,
  Plus,
  PanelRight,
  Download,
  FileText,
  Image,
  File,
  Save,
  RefreshCcw,
} from "lucide-react";
import toast from "react-hot-toast";
import CanvasTutorial from "./CanvasTutorial";

type MouseMode = "select" | "pan";

const MOUSE_MODE_OPTIONS: Array<{
  mode: MouseMode;
  label: string;
  shortcutKeys: string[];
  activeClass: string;
  inactiveClass: string;
  icon: React.ReactNode;
}> = [
  {
    mode: "select",
    label: "Seleccionar",
    shortcutKeys: ["V", "Y"],
    activeClass: "bg-primary/10 text-primary",
    inactiveClass: "hover:bg-primary/10",
    icon: <MousePointer2 size={18} />,
  },
  {
    mode: "pan",
    label: "Arrastrar",
    shortcutKeys: ["H"],
    activeClass: "bg-primary/10 text-primary",
    inactiveClass: "hover:bg-primary/10",
    icon: <Hand size={18} />,
  },
];

function EntitySvgIcon({
  type,
  size = 32,
  className,
  color,
}: {
  type: EntityType;
  size?: number;
  className?: string;
  color: string;
}) {
  if (type === "seat") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 28 28"
        fill="none"
        className={className}
      >
        <rect x="6" y="12" width="16" height="8" rx="3" fill={color} />
        <rect
          x="8"
          y="6"
          width="12"
          height="8"
          rx="3"
          fill={color}
          fillOpacity="0.7"
        />
        <rect x="7" y="20" width="3" height="4" rx="1.5" fill={color} />
        <rect x="18" y="20" width="3" height="4" rx="1.5" fill={color} />
      </svg>
    );
  }
  if (type === "table-circle") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 28 28"
        fill="none"
        className={className}
      >
        <circle
          cx="14"
          cy="14"
          r="10"
          fill={color}
          fillOpacity="0.12"
          stroke={color}
          strokeWidth="2"
        />
        <rect x="13" y="1" width="2" height="5" rx="1" fill={color} />
        <rect x="13" y="22" width="2" height="5" rx="1" fill={color} />
        <rect x="1" y="13" width="5" height="2" rx="1" fill={color} />
        <rect x="22" y="13" width="5" height="2" rx="1" fill={color} />
      </svg>
    );
  }
  if (type === "table-rect") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 28 28"
        fill="none"
        className={className}
      >
        <rect
          x="1"
          y="8"
          width="26"
          height="12"
          rx="2"
          fill={color}
          fillOpacity="0.14"
          stroke={color}
          strokeWidth="2.2"
        />
        <rect x="8" y="1" width="2" height="4" rx="1" fill={color} />
        <rect x="13" y="1" width="2" height="4" rx="1" fill={color} />
        <rect x="18" y="1" width="2" height="4" rx="1" fill={color} />
        <rect x="8" y="23" width="2" height="4" rx="1" fill={color} />
        <rect x="13" y="23" width="2" height="4" rx="1" fill={color} />
        <rect x="18" y="23" width="2" height="4" rx="1" fill={color} />
        <rect x="1" y="13" width="4" height="2" rx="1" fill={color} />
        <rect x="23" y="13" width="4" height="2" rx="1" fill={color} />
      </svg>
    );
  }

  if (type === "area") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 28 28"
        fill="none"
        className={className}
      >
        <rect
          x="4"
          y="6"
          width="20"
          height="16"
          rx="2"
          fill={color}
          fillOpacity="0.12"
          stroke={color}
          strokeWidth="2"
          strokeDasharray="2.5 2.5"
        />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      className={className}
    >
      <rect x="4" y="7" width="20" height="3" rx="1.5" fill={color} />
      <rect x="4" y="13" width="20" height="3" rx="1.5" fill={color} />
      <rect x="4" y="19" width="20" height="3" rx="1.5" fill={color} />
    </svg>
  );
}

// Iconos inline para entidades
function EntityIcon({ type }: { type: EntityType }) {
  return (
    <EntitySvgIcon
      type={type}
      color="currentColor"
      className="inline align-middle mr-1 text-primary"
      size={32}
    />
  );
}

const SidebarToolItem = React.memo(function SidebarToolItem({
  collapsed,
  label,
  tooltip,
  type,
  highlighted = false,
  active = false,
  onClick,
}: {
  collapsed: boolean;
  label: string;
  tooltip: string;
  type: EntityType;
  highlighted?: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  const layoutClass = collapsed
    ? "w-10 sm:w-11 justify-center"
    : "w-full px-3 justify-start gap-2";

  const className = active
    ? `h-10 sm:h-11 rounded-lg flex items-center shadow-md transition-colors ${layoutClass} bg-primary text-white`
    : highlighted
      ? `h-10 sm:h-11 rounded-lg hover:bg-secondary flex items-center transition-colors ${layoutClass}`
      : `h-10 sm:h-11 rounded-lg hover:bg-secondary flex items-center transition-colors ${layoutClass}`;

  return (
    <div className="relative group">
      <button className={className} onClick={onClick}>
        <EntitySvgIcon
          type={type}
          size={collapsed ? 24 : 28}
          color="currentColor"
        />
        {!collapsed && <span className="text-sm font-medium">{label}</span>}
      </button>
      {collapsed && (
        <div className="pointer-events-none hidden opacity-0 transition-opacity group-hover:opacity-100 absolute left-full ml-2 top-1/2 -translate-y-1/2 w-max bg-muted text-foreground text-xs px-3 py-1 rounded shadow z-30 whitespace-nowrap sm:block">
          {tooltip}
        </div>
      )}
    </div>
  );
});

const MouseModeOption = React.memo(function MouseModeOption({
  active,
  onClick,
  icon,
  label,
  shortcutKeys,
  activeClass,
  inactiveClass,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  shortcutKeys: string[];
  activeClass: string;
  inactiveClass: string;
}) {
  return (
    <div className="relative group">
      <button
        className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium ${active ? activeClass : inactiveClass}`}
        onClick={onClick}
        aria-label={label}
      >
        {icon}
        <span className="hidden sm:inline">{label}</span>
      </button>
      <div className="pointer-events-none opacity-0 transition-opacity group-hover:opacity-100 absolute left-1/2 -translate-x-1/2 -top-9 bg-muted text-foreground text-xs px-3 py-1 rounded shadow z-30 whitespace-nowrap hidden sm:block">
        Atajo:{" "}
        {shortcutKeys.map((key, index) => (
          <React.Fragment key={key}>
            <kbd className="px-1 py-0.5 bg-background rounded">{key}</kbd>
            {index < shortcutKeys.length - 1 ? " o " : null}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
});

const GroupNumericActionRow = React.memo(function GroupNumericActionRow({
  label,
  value,
  onChange,
  onApply,
  placeholder,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  onApply: () => void;
  placeholder: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium overflow-y-auto min-w-[70px]">
        {label}
      </span>
      <input
        type="number"
        className="w-20 px-2 py-1 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <button
        className="px-2 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/80 transition flex items-center"
        title="Aplicar"
        onClick={onApply}
        type="button"
      >
        <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
          <path
            d="M3 8h10M11 5l2 3-2 3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
});

const getDistributedOffsets = (count: number, span: number) => {
  if (count <= 1) return [0];
  const step = span / (count - 1);
  return Array.from({ length: count }, (_, index) => -span / 2 + step * index);
};

const ROW_SEAT_SPACING_MIN = 19;
const ROW_SEAT_SPACING_MAX = 256;
const ROW_CURVATURE_MIN = -120;
const ROW_CURVATURE_MAX = 120;
const CIRCLE_SEAT_COUNT_MIN = 2;
const CIRCLE_SEAT_COUNT_MAX = 48;
const CIRCLE_SEAT_RADIUS_MIN = 50;
const CIRCLE_SEAT_RADIUS_MAX = 320;
// La key incluye el dashboardId para que cada dashboard tenga su propio draft
const getDraftStorageKey = (dashboardId: string) =>
  `estadiox.draft.${dashboardId}.v1`;

type PersistedDashboardState = {
  version: number;
  dashboardId: string;
  savedAt: string;
  entities: Entity[];
  undoStack: Entity[][];
  redoStack: Entity[][];
};

const getExportTimestamp = () =>
  new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");

const downloadFile = (
  fileName: string,
  content: BlobPart,
  mimeType: string,
) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const buildCanvasTextExport = (entities: Entity[]) => {
  const byType: Record<EntityType, number> = {
    seat: 0,
    row: 0,
    "table-circle": 0,
    "table-rect": 0,
    area: 0,
  };

  entities.forEach((entity) => {
    const type = getEntityType(entity);
    byType[type] += 1;
  });

  const rows = entities
    .filter((entity) => getEntityType(entity) === "row")
    .map((row) => {
      const seatCount = entities.filter(
        (child) => child.parentId === row.id,
      ).length;
      return `- ${row.label || row.id}: ${seatCount} asientos`;
    });

  const circleTables = entities
    .filter((entity) => getEntityType(entity) === "table-circle")
    .map((table) => {
      const seatCount = entities.filter(
        (child) => child.parentId === table.id,
      ).length;
      return `- ${table.label || table.id}: ${seatCount} sillas`;
    });

  const rectTables = entities
    .filter((entity) => getEntityType(entity) === "table-rect")
    .map((table) => {
      const seatCount = entities.filter(
        (child) => child.parentId === table.id,
      ).length;
      return `- ${table.label || table.id}: ${seatCount} sillas`;
    });

  const areas = entities
    .filter((entity) => getEntityType(entity) === "area")
    .map((area) => {
      const linked = entities.filter(
        (entity) =>
          getEntityType(entity) !== "area" && entity.areaId === area.id,
      ).length;
      return `- ${area.label || area.id}: ${linked} entidades asociadas`;
    });

  return [
    "Export Canvas - Estadio X",
    `Fecha: ${new Date().toLocaleString("es-AR")}`,
    "",
    "Resumen",
    `- Entidades totales: ${entities.length}`,
    `- Sillas sueltas: ${byType.seat}`,
    `- Filas: ${byType.row}`,
    `- Mesas circulares: ${byType["table-circle"]}`,
    `- Mesas rectangulares: ${byType["table-rect"]}`,
    `- Áreas: ${byType.area}`,
    "",
    "Filas",
    ...(rows.length > 0 ? rows : ["- Sin filas"]),
    "",
    "Mesas circulares",
    ...(circleTables.length > 0 ? circleTables : ["- Sin mesas circulares"]),
    "",
    "Mesas rectangulares",
    ...(rectTables.length > 0 ? rectTables : ["- Sin mesas rectangulares"]),
    "",
    "Áreas",
    ...(areas.length > 0 ? areas : ["- Sin áreas"]),
    "",
    "---",
    "CanvasData (JSON):",
    JSON.stringify(entities, null, 2),
  ].join("\n");
};

const shouldIncludeExportNode = (node: Node) => {
  if (!(node instanceof Element)) return true;
  if (node.getAttribute("data-export-ignore") === "true") return false;
  return !node.closest('[data-export-ignore="true"]');
};

const getCircleSeatMaxByRadius = (radius: number) => {
  const seatSize = getEntityRenderSize("seat");
  const circumference = 2 * Math.PI * radius;
  const capacity = Math.floor(circumference / seatSize);
  return Math.max(
    CIRCLE_SEAT_COUNT_MIN,
    Math.min(CIRCLE_SEAT_COUNT_MAX, capacity),
  );
};

export default function DashboardPage() {
  const [mouseMode, setMouseMode] = useState<MouseMode>("select");
  // Memoize dashboardId from URL once at mount
  const [showTutorial, setShowTutorial] = useState(false);

  const params = useParams();
  const dashboardId = typeof params?.id === "string" ? params.id : null;
  const [sidebarTool, setSidebarTool] = useState<SidebarTool>("none");
  // Estado global de entidades (sillas, mesas, etc)
  const [entities, setEntities] = useState<Entity[]>([]);
  // Undo/redo stacks
  const [undoStack, setUndoStack] = useState<Entity[][]>([]);
  const [redoStack, setRedoStack] = useState<Entity[][]>([]);
  // Flag para saber si ya se cargó el estado inicial (evita que el save effect
  // persista entities=[] antes de que llegue la data real)
  const [isLoaded, setIsLoaded] = useState(false);
  // True si hay cambios locales que no están guardados en la DB
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // Control de acceso: null = verificando, "granted" = tiene acceso, "denied" = sin permiso, "not-found" = no existe
  const [accessStatus, setAccessStatus] = useState<
    null | "granted" | "denied" | "not-found"
  >(null);
  // Rol del usuario en este dashboard (viene del API junto con accessStatus)
  const [userRole, setUserRole] = useState<
    "OWNER" | "EDITOR" | "VIEWER" | null
  >(null);
  const canEdit = userRole === "OWNER" || userRole === "EDITOR";

  // Cargar canvasData: SIEMPRE verifica acceso en la DB primero.
  // El draft local solo se restaura si el servidor confirma que el usuario tiene acceso.
  // Esto evita que alguien sin permiso vea datos cacheados en localStorage.
  useEffect(() => {
    if (!dashboardId) return;
    const storageKey = getDraftStorageKey(dashboardId);

    fetch(`/api/${dashboardId}/dashboard`)
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          // Sin acceso: limpiar cualquier draft local de este dashboard
          try {
            window.localStorage.removeItem(storageKey);
          } catch {
            /* ignorar */
          }
          setAccessStatus("denied");
          setIsLoaded(true);
          return null;
        }
        if (res.status === 404) {
          try {
            window.localStorage.removeItem(storageKey);
          } catch {
            /* ignorar */
          }
          setAccessStatus("not-found");
          setIsLoaded(true);
          return null;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!data) return; // acceso denegado o not-found, ya manejado arriba
        setAccessStatus("granted");
        const role = data.role ?? "VIEWER";
        setUserRole(role);
        // Viewers solo pueden arrastrar, no seleccionar
        if (role === "VIEWER") setMouseMode("pan");
        fetch("/api/user")
          .then((r) => r.json())
          .then((userData) => {
            // Distinguir desktop vs mobile para saber si ya vio el tutorial correspondiente
            const isMobileNow = window.matchMedia("(max-width: 767px)").matches;
            const alreadySeen = isMobileNow
              ? userData?.isViewTutorialMobile
              : userData?.isViewTutorial;
            if (!alreadySeen) {
              setShowTutorial(true);
            }
          })
          .catch(() => {
            // Si falla, no bloqueamos la app — simplemente no mostramos el tutorial
          });
        // 1. Acceso confirmado → intentar restaurar draft local
        try {
          const raw = window.localStorage.getItem(storageKey);
          if (raw) {
            const parsed = JSON.parse(raw) as Partial<PersistedDashboardState>;
            if (
              parsed.dashboardId === dashboardId &&
              Array.isArray(parsed.entities)
            ) {
              setEntities(applyAreaAssociations(parsed.entities));
              setUndoStack(
                Array.isArray(parsed.undoStack)
                  ? parsed.undoStack.filter(Array.isArray)
                  : [],
              );
              setRedoStack(
                Array.isArray(parsed.redoStack)
                  ? parsed.redoStack.filter(Array.isArray)
                  : [],
              );
              setIsLoaded(true);
              setHasUnsavedChanges(true);
              toast.success("Canvas restaurado desde guardado local");
              return;
            } else {
              window.localStorage.removeItem(storageKey);
            }
          }
        } catch {
          // localStorage no disponible, seguimos con data de la DB
        }

        // 2. Sin draft válido → usar la data que ya trajo el fetch
        if (Array.isArray(data.canvasData)) {
          setEntities(applyAreaAssociations(data.canvasData));
        }
        setIsLoaded(true);
        setHasUnsavedChanges(false);
      })
      .catch(() => {
        toast.error("No se pudo cargar el canvas desde el servidor");
        setIsLoaded(true);
      });
  }, [dashboardId]);
  // Estado para la selección del canvas (ids)
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);
  // Derivar entidades seleccionadas
  const selectedEntities = useMemo(
    () => entities.filter((ent) => selectedEntityIds.includes(ent.id)),
    [entities, selectedEntityIds],
  );
  const selectedIdsWithRowChildren = useMemo(
    () => expandSelectionWithRowChildren(selectedEntityIds, entities),
    [entities, selectedEntityIds],
  );
  const [propertiesOpen, setPropertiesOpen] = useState(true);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const isSidebarCollapsed = isMobileViewport || leftSidebarCollapsed;

  // Estado para abrir/cerrar el menú de acciones grupales
  const [groupMenuOpen, setGroupMenuOpen] = useState(true);
  // Grupos abiertos/cerrados en la lista de entidades seleccionadas (por tipo)
  const [openTypeGroups, setOpenTypeGroups] = useState<Record<string, boolean>>(
    {},
  );
  // Estados para inputs de acciones grupales
  const [groupMoveX, setGroupMoveX] = useState(0);
  const [groupMoveY, setGroupMoveY] = useState(0);
  const [groupRotate, setGroupRotate] = useState(0);
  const [groupColor, setGroupColor] = useState("#2563eb");
  const [groupLabelPrefix, setGroupLabelPrefix] = useState("");
  const [groupLabelStart, setGroupLabelStart] = useState(1);
  // Etiquetado en serie por tipo: prefijo e inicio para cada tipo de entidad
  const [typeLabelConfigs, setTypeLabelConfigs] = useState<
    Record<string, { prefix: string; start: number }>
  >({});
  const [typeLabelSectionOpen, setTypeLabelSectionOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmDeleteLabel, setConfirmDeleteLabel] = useState("esta entidad");
  const confirmDeleteActionRef = useRef<(() => void) | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const canvasExportRef = useRef<HTMLElement | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const handleTutorialDone = useCallback(async () => {
    setShowTutorial(false);
    try {
      const isMobileNow = window.matchMedia("(max-width: 767px)").matches;
      await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isMobile: isMobileNow }),
      });
    } catch {
      // Ignorar: no es crítico si falla el marcado
    }
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const syncViewport = () => {
      const isMobile = mediaQuery.matches;
      setIsMobileViewport(isMobile);
      if (isMobile) {
        setLeftSidebarCollapsed(true);
        setPropertiesOpen(false);
      }
    };

    syncViewport();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncViewport);
      return () => mediaQuery.removeEventListener("change", syncViewport);
    }

    mediaQuery.addListener(syncViewport);
    return () => mediaQuery.removeListener(syncViewport);
  }, []);

  // Persistir draft en localStorage cada vez que cambian las entidades o los stacks
  // Solo si ya se cargó el estado inicial (evita guardar entities=[] antes de la carga real)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isLoaded) return;
    if (!dashboardId) return;

    const payload: PersistedDashboardState = {
      version: 1,
      dashboardId,
      savedAt: new Date().toISOString(),
      entities,
      undoStack,
      redoStack,
    };

    try {
      window.localStorage.setItem(
        getDraftStorageKey(dashboardId),
        JSON.stringify(payload),
      );
      setHasUnsavedChanges(true);
    } catch {
      // ignorar errores de cuota / modo privado
    }
  }, [entities, redoStack, undoStack, isLoaded]);

  useEffect(() => {
    if (!exportMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (exportMenuRef.current?.contains(target)) return;
      setExportMenuOpen(false);
    };

    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [exportMenuOpen]);

  // --- Undo/redo helpers ---
  const doAction = useCallback(
    (newEntities: Entity[]) => {
      const normalizedEntities = applyAreaAssociations(newEntities);
      setUndoStack((stack) => [...stack.slice(-49), entities]);
      setEntities(normalizedEntities);
      setRedoStack([]);
    },
    [entities],
  );

  const undo = useCallback(() => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack;
      setRedoStack((redo) => [...redo, entities]);
      const prev = stack[stack.length - 1];
      setEntities(prev);
      return stack.slice(0, -1);
    });
  }, [entities]);

  const redo = useCallback(() => {
    setRedoStack((stack) => {
      if (stack.length === 0) return stack;
      setUndoStack((undo) => [...undo, entities]);
      const next = stack[stack.length - 1];
      setEntities(next);
      return stack.slice(0, -1);
    });
  }, [entities]);

  // Handlers de acciones grupales
  const handleGroupMoveX = useCallback(() => {
    const moveDelta = Number(groupMoveX);
    if (!Number.isFinite(moveDelta) || moveDelta === 0) return;

    let didChange = false;
    const nextEntities = entities.map((ent) => {
      if (!selectedIdsWithRowChildren.includes(ent.id)) return ent;

      const nextX = (typeof ent.x === "number" ? ent.x : 0) + moveDelta;
      if (nextX === ent.x) return ent;
      didChange = true;
      return { ...ent, x: nextX };
    });

    if (didChange) {
      doAction(nextEntities);
    }
  }, [doAction, entities, groupMoveX, selectedIdsWithRowChildren]);

  const handleGroupMoveY = useCallback(() => {
    const moveDelta = Number(groupMoveY);
    if (!Number.isFinite(moveDelta) || moveDelta === 0) return;

    let didChange = false;
    const nextEntities = entities.map((ent) => {
      if (!selectedIdsWithRowChildren.includes(ent.id)) return ent;

      const nextY = (typeof ent.y === "number" ? ent.y : 0) + moveDelta;
      if (nextY === ent.y) return ent;
      didChange = true;
      return { ...ent, y: nextY };
    });

    if (didChange) {
      doAction(nextEntities);
    }
  }, [doAction, entities, groupMoveY, selectedIdsWithRowChildren]);

  const handleGroupRotate = useCallback(() => {
    const rotationDelta = Number(groupRotate);
    if (!Number.isFinite(rotationDelta) || rotationDelta === 0) return;

    const selectedSet = new Set(selectedIdsWithRowChildren);
    const selectedById = new Map(entities.map((ent) => [ent.id, ent]));
    const circleTableIds = new Set(
      entities
        .filter(
          (ent) =>
            selectedSet.has(ent.id) && getEntityType(ent) === "table-circle",
        )
        .map((ent) => ent.id),
    );
    const rectTableIds = new Set(
      entities
        .filter(
          (ent) =>
            selectedSet.has(ent.id) && getEntityType(ent) === "table-rect",
        )
        .map((ent) => ent.id),
    );
    const rowIds = new Set(
      entities
        .filter(
          (ent) => selectedSet.has(ent.id) && getEntityType(ent) === "row",
        )
        .map((ent) => ent.id),
    );

    const normalizeRotation = (rotation: number) =>
      ((((rotation % 360) + 360) % 360) + 360) % 360;
    const isGroupRotationCompatible = (type: EntityType) =>
      type === "seat" || type === "row" || type === "table-rect";
    const getSeatFacingRotation = (
      seatX: number,
      seatY: number,
      centerX: number,
      centerY: number,
    ) => {
      const dx = centerX - seatX;
      const dy = centerY - seatY;
      const angleToCenter = (Math.atan2(dy, dx) * 180) / Math.PI;
      return normalizeRotation(angleToCenter - 90);
    };
    const angleRad = (rotationDelta * Math.PI) / 180;
    const cosAngle = Math.cos(angleRad);
    const sinAngle = Math.sin(angleRad);

    let didChange = false;
    const nextEntities = entities.map((ent) => {
      if (!selectedSet.has(ent.id)) return ent;

      if (
        circleTableIds.has(ent.id) ||
        (ent.parentId && circleTableIds.has(ent.parentId))
      ) {
        return ent;
      }

      const entityType = getEntityType(ent);
      if (!isGroupRotationCompatible(entityType)) {
        return ent;
      }

      if (ent.parentId && rowIds.has(ent.parentId)) {
        const row = selectedById.get(ent.parentId);
        if (!row) return ent;

        const dx = ent.x - row.x;
        const dy = ent.y - row.y;
        const rotatedX = row.x + dx * cosAngle - dy * sinAngle;
        const rotatedY = row.y + dx * sinAngle + dy * cosAngle;
        const rotatedRotation = normalizeRotation(
          (ent.rotation || 0) + rotationDelta,
        );

        if (
          rotatedX === ent.x &&
          rotatedY === ent.y &&
          rotatedRotation === (ent.rotation || 0)
        ) {
          return ent;
        }

        didChange = true;
        return {
          ...ent,
          x: rotatedX,
          y: rotatedY,
          rotation: rotatedRotation,
        };
      }

      if (ent.parentId && rectTableIds.has(ent.parentId)) {
        const table = selectedById.get(ent.parentId);
        if (!table) return ent;

        const dx = ent.x - table.x;
        const dy = ent.y - table.y;
        const rotatedX = table.x + dx * cosAngle - dy * sinAngle;
        const rotatedY = table.y + dx * sinAngle + dy * cosAngle;
        const rotatedRotation = getSeatFacingRotation(
          rotatedX,
          rotatedY,
          table.x,
          table.y,
        );

        if (
          rotatedX === ent.x &&
          rotatedY === ent.y &&
          rotatedRotation === (ent.rotation || 0)
        ) {
          return ent;
        }

        didChange = true;
        return {
          ...ent,
          x: rotatedX,
          y: rotatedY,
          rotation: rotatedRotation,
        };
      }

      const rotatedRotation = normalizeRotation(
        (ent.rotation || 0) + rotationDelta,
      );
      if (rotatedRotation === (ent.rotation || 0)) {
        return ent;
      }

      didChange = true;
      return {
        ...ent,
        rotation: rotatedRotation,
      };
    });

    if (didChange) {
      doAction(nextEntities);
    }
  }, [doAction, entities, groupRotate, selectedIdsWithRowChildren]);

  const handleGroupColor = useCallback(() => {
    let didChange = false;
    const nextEntities = entities.map((ent) => {
      if (!selectedIdsWithRowChildren.includes(ent.id)) return ent;
      if ((ent.color || "#2563eb") === groupColor) return ent;

      didChange = true;
      return { ...ent, color: groupColor };
    });

    if (didChange) {
      doAction(nextEntities);
    }
  }, [doAction, entities, groupColor, selectedIdsWithRowChildren]);

  const handleGroupLabel = useCallback(() => {
    const prefix = groupLabelPrefix;
    const start = Number(groupLabelStart);
    if (!Number.isFinite(start)) return;

    // Only label top-level selected entities (not child seats/chairs)
    // so we don't overwrite "Mesa 1 - Silla 3" children accidentally.
    // We work on direct selected entities only, ordered by their current label
    // so the numbering is predictable.
    const topLevelSelected = entities.filter(
      (ent) => selectedIdsWithRowChildren.includes(ent.id) && !ent.parentId,
    );
    if (topLevelSelected.length === 0) return;

    const nextEntities = entities.map((ent) => {
      const idx = topLevelSelected.findIndex((t) => t.id === ent.id);
      if (idx === -1) return ent;
      const newLabel = `${prefix}${start + idx}`;
      return { ...ent, label: newLabel };
    });

    doAction(nextEntities);
  }, [
    doAction,
    entities,
    groupLabelPrefix,
    groupLabelStart,
    selectedIdsWithRowChildren,
  ]);

  const handleGroupLabelByType = useCallback(
    (typeKey: string) => {
      const config = typeLabelConfigs[typeKey];
      if (!config) return;
      const prefix = config.prefix;
      const start = Number(config.start);
      if (!Number.isFinite(start)) return;

      // Top-level selected entities of this specific type
      const topLevelOfType = entities.filter(
        (ent) =>
          selectedIdsWithRowChildren.includes(ent.id) &&
          !ent.parentId &&
          getEntityType(ent) === typeKey,
      );
      if (topLevelOfType.length === 0) return;

      const nextEntities = entities.map((ent) => {
        const idx = topLevelOfType.findIndex((t) => t.id === ent.id);
        if (idx === -1) return ent;
        return { ...ent, label: `${prefix}${start + idx}` };
      });

      doAction(nextEntities);
    },
    [doAction, entities, typeLabelConfigs, selectedIdsWithRowChildren],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "h" || e.key === "H") setMouseMode("pan");
      if (e.key === "v" || e.key === "V" || e.key === "y" || e.key === "Y")
        setMouseMode("select");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSidebarToolToggle = useCallback((tool: EntityType) => {
    setMouseMode("select");
    setSidebarTool((prev) => (prev === tool ? "none" : tool));
  }, []);

  const handleClearCanvas = useCallback(() => {
    if (entities.length === 0) return;
    confirmDeleteActionRef.current = () => {
      doAction([]);
      setSelectedEntityIds([]);
      setSidebarTool("none");
    };
    setConfirmDeleteLabel(`todo el canvas (${entities.length} entidades)`);
    setConfirmDeleteOpen(true);
  }, [doAction, entities.length]);

  // Handler para actualizar una entidad seleccionada
  const handleUpdateEntity = useCallback(
    (id: string, updates: EntityUpdate) => {
      const targetEntity = entities.find((ent) => ent.id === id);
      if (!targetEntity) return;

      const targetType = getEntityType(targetEntity);
      const isContainerEntity =
        targetType === "row" ||
        targetType === "table-circle" ||
        targetType === "table-rect";

      if (isContainerEntity) {
        const normalizeRotation = (rotation: number) =>
          ((((rotation % 360) + 360) % 360) + 360) % 360;
        const getSeatFacingRotation = (
          seatX: number,
          seatY: number,
          centerX: number,
          centerY: number,
        ) => {
          const dxToCenter = centerX - seatX;
          const dyToCenter = centerY - seatY;
          const angleToCenter =
            (Math.atan2(dyToCenter, dxToCenter) * 180) / Math.PI;
          return normalizeRotation(angleToCenter - 90);
        };

        const nextX =
          typeof updates.x === "number" ? updates.x : targetEntity.x;
        const nextY =
          typeof updates.y === "number" ? updates.y : targetEntity.y;
        const dx = nextX - targetEntity.x;
        const dy = nextY - targetEntity.y;
        const currentRotation = targetEntity.rotation || 0;
        const nextRotation =
          typeof updates.rotation === "number"
            ? updates.rotation
            : currentRotation;

        const currentTableWidth =
          typeof targetEntity.tableWidth === "number"
            ? targetEntity.tableWidth
            : getEntityRenderSize("table-rect");
        const currentTableHeight =
          typeof targetEntity.tableHeight === "number"
            ? targetEntity.tableHeight
            : Math.round(getEntityRenderSize("table-rect") * 0.55);
        const nextTableWidth =
          targetType === "table-rect" && typeof updates.tableWidth === "number"
            ? Math.max(32, updates.tableWidth)
            : currentTableWidth;
        const nextTableHeight =
          targetType === "table-rect" && typeof updates.tableHeight === "number"
            ? Math.max(24, updates.tableHeight)
            : currentTableHeight;
        if (targetType === "row") {
          const existingChildren = entities.filter(
            (ent) => ent.parentId === id,
          );
          const nextRowLabel =
            typeof updates.label === "string"
              ? updates.label
              : targetEntity.label;
          const hasRowGeometryUpdate =
            typeof updates.x === "number" ||
            typeof updates.y === "number" ||
            typeof updates.rotation === "number" ||
            typeof updates.rowSeatCount === "number" ||
            typeof updates.rowSeatSpacing === "number" ||
            typeof updates.rowCurvature === "number";

          if (!hasRowGeometryUpdate) {
            doAction(
              entities.map((ent) => {
                if (ent.id === id) {
                  return { ...ent, ...updates };
                }

                if (ent.parentId === id) {
                  const seatIndex = existingChildren.findIndex(
                    (child) => child.id === ent.id,
                  );

                  return {
                    ...ent,
                    label: `${nextRowLabel} - Asiento ${seatIndex + 1}`,
                    ...(typeof updates.color === "string"
                      ? { color: updates.color }
                      : {}),
                  };
                }

                return ent;
              }),
            );
            return;
          }

          const nextRowSeatCount = Math.max(
            1,
            Math.round(
              typeof updates.rowSeatCount === "number"
                ? updates.rowSeatCount
                : (targetEntity.rowSeatCount ??
                    (existingChildren.length > 0
                      ? existingChildren.length
                      : 8)),
            ),
          );
          const nextRowSeatSpacing = Math.max(
            ROW_SEAT_SPACING_MIN,
            Math.min(
              ROW_SEAT_SPACING_MAX,
              typeof updates.rowSeatSpacing === "number"
                ? updates.rowSeatSpacing
                : (targetEntity.rowSeatSpacing ?? ENTITY_GRID_SIZE),
            ),
          );
          const nextRowCurvature = Math.max(
            ROW_CURVATURE_MIN,
            Math.min(
              ROW_CURVATURE_MAX,
              typeof updates.rowCurvature === "number"
                ? updates.rowCurvature
                : (targetEntity.rowCurvature ?? 0),
            ),
          );
          const rowRotation = normalizeRotation(nextRotation);
          const rowAngleRad = (rowRotation * Math.PI) / 180;
          const axisX = Math.cos(rowAngleRad);
          const axisY = Math.sin(rowAngleRad);
          const normalX = -Math.sin(rowAngleRad);
          const normalY = Math.cos(rowAngleRad);
          const lineOffset = ENTITY_GRID_SIZE;
          const start = -((nextRowSeatCount - 1) * nextRowSeatSpacing) / 2;

          const nextChildren = Array.from(
            { length: nextRowSeatCount },
            (_, index) => {
              const existingChild = existingChildren[index];
              const along = start + index * nextRowSeatSpacing;
              const normalizedPosition =
                nextRowSeatCount <= 1
                  ? 0
                  : (index / (nextRowSeatCount - 1)) * 2 - 1;
              const curveOffset =
                (1 - normalizedPosition * normalizedPosition) *
                nextRowCurvature;
              const childX =
                nextX + axisX * along + normalX * (lineOffset + curveOffset);
              const childY =
                nextY + axisY * along + normalY * (lineOffset + curveOffset);

              return {
                ...(existingChild ?? {
                  id: `seat-${Date.now()}-${Math.random()}-${index}`,
                  type: "seat" as const,
                  parentId: id,
                }),
                label: `${nextRowLabel} - Asiento ${index + 1}`,
                x: childX,
                y: childY,
                rotation: rowRotation,
                color:
                  typeof updates.color === "string"
                    ? updates.color
                    : (existingChild?.color ?? targetEntity.color ?? "#2563eb"),
                parentId: id,
                type: "seat" as const,
              };
            },
          );

          const nextRowEntity: Entity = {
            ...targetEntity,
            ...updates,
            x: nextX,
            y: nextY,
            rotation: rowRotation,
            rowSeatCount: nextRowSeatCount,
            rowSeatSpacing: nextRowSeatSpacing,
            rowCurvature: nextRowCurvature,
          };

          const nextEntities = entities.filter(
            (ent) => ent.id !== id && ent.parentId !== id,
          );
          doAction([...nextEntities, nextRowEntity, ...nextChildren]);
          return;
        }

        if (targetType === "table-circle") {
          const existingChildren = entities.filter(
            (ent) => ent.parentId === id,
          );
          const nextTableLabel =
            typeof updates.label === "string"
              ? updates.label
              : targetEntity.label;
          const nextCircleSeatRadius = Math.min(
            CIRCLE_SEAT_RADIUS_MAX,
            Math.max(
              CIRCLE_SEAT_RADIUS_MIN,
              typeof updates.circleSeatRadius === "number"
                ? updates.circleSeatRadius
                : (targetEntity.circleSeatRadius ?? CIRCLE_SEAT_RADIUS_MIN),
            ),
          );
          const circleSeatMaxByRadius =
            getCircleSeatMaxByRadius(nextCircleSeatRadius);
          const nextCircleSeatCount = Math.min(
            circleSeatMaxByRadius,
            Math.max(
              CIRCLE_SEAT_COUNT_MIN,
              Math.round(
                typeof updates.circleSeatCount === "number"
                  ? updates.circleSeatCount
                  : (targetEntity.circleSeatCount ??
                      (existingChildren.length > 0
                        ? existingChildren.length
                        : 8)),
              ),
            ),
          );

          const nextChildren = Array.from(
            { length: nextCircleSeatCount },
            (_, index) => {
              const existingChild = existingChildren[index];
              const angle = (index / nextCircleSeatCount) * Math.PI * 2;
              const childX = nextX + Math.cos(angle) * nextCircleSeatRadius;
              const childY = nextY + Math.sin(angle) * nextCircleSeatRadius;

              return {
                ...(existingChild ?? {
                  id: `seat-${Date.now()}-${Math.random()}-${index}`,
                  type: "seat" as const,
                  parentId: id,
                }),
                label: `${nextTableLabel} - Silla ${index + 1}`,
                x: childX,
                y: childY,
                color:
                  typeof updates.color === "string"
                    ? updates.color
                    : (existingChild?.color ?? targetEntity.color ?? "#2563eb"),
                parentId: id,
                type: "seat" as const,
              };
            },
          );

          const nextTableEntity: Entity = {
            ...targetEntity,
            ...updates,
            x: nextX,
            y: nextY,
            circleSeatCount: nextCircleSeatCount,
            circleSeatRadius: nextCircleSeatRadius,
          };

          const nextEntities = entities.filter(
            (ent) => ent.id !== id && ent.parentId !== id,
          );
          doAction([...nextEntities, nextTableEntity, ...nextChildren]);
          return;
        }

        if (targetType === "table-rect") {
          const seatSize = getEntityRenderSize("seat");
          const currentLayout: RectTableLayout = {
            topSeats: Math.max(1, targetEntity.rectLayout?.topSeats ?? 3),
            bottomSeats: Math.max(1, targetEntity.rectLayout?.bottomSeats ?? 3),
            leftSeats: Math.max(1, targetEntity.rectLayout?.leftSeats ?? 1),
            rightSeats: Math.max(1, targetEntity.rectLayout?.rightSeats ?? 1),
          };

          const maxHorizontalSeats = Math.max(
            1,
            Math.floor(nextTableWidth / seatSize),
          );
          const maxVerticalSeats = Math.max(
            1,
            Math.floor(nextTableHeight / seatSize),
          );
          const clampLayout = (layout: RectTableLayout): RectTableLayout => ({
            topSeats: Math.min(
              maxHorizontalSeats,
              Math.max(1, Math.round(layout.topSeats)),
            ),
            bottomSeats: Math.min(
              maxHorizontalSeats,
              Math.max(1, Math.round(layout.bottomSeats)),
            ),
            leftSeats: Math.min(
              maxVerticalSeats,
              Math.max(1, Math.round(layout.leftSeats)),
            ),
            rightSeats: Math.min(
              maxVerticalSeats,
              Math.max(1, Math.round(layout.rightSeats)),
            ),
          });

          const mergedLayout = clampLayout(
            updates.rectLayout
              ? {
                  ...currentLayout,
                  ...updates.rectLayout,
                }
              : currentLayout,
          );

          const tableRotation = normalizeRotation(nextRotation);
          const tableAngleRad = (tableRotation * Math.PI) / 180;
          const tableCos = Math.cos(tableAngleRad);
          const tableSin = Math.sin(tableAngleRad);
          const edgeClearance = seatSize * 0.95;
          const topBottomY = nextTableHeight / 2 + edgeClearance;
          const sideX = nextTableWidth / 2 + edgeClearance;

          const topXs = getDistributedOffsets(
            mergedLayout.topSeats,
            Math.max(seatSize, nextTableWidth - seatSize),
          );
          const bottomXs = getDistributedOffsets(
            mergedLayout.bottomSeats,
            Math.max(seatSize, nextTableWidth - seatSize),
          );
          const leftYs = getDistributedOffsets(
            mergedLayout.leftSeats,
            Math.max(seatSize, nextTableHeight - seatSize),
          );
          const rightYs = getDistributedOffsets(
            mergedLayout.rightSeats,
            Math.max(seatSize, nextTableHeight - seatSize),
          );

          const seatOffsets: Array<{ x: number; y: number }> = [
            ...topXs.map((sx) => ({ x: sx, y: -topBottomY })),
            ...rightYs.map((sy) => ({ x: sideX, y: sy })),
            ...bottomXs
              .slice()
              .reverse()
              .map((sx) => ({ x: sx, y: topBottomY })),
            ...leftYs
              .slice()
              .reverse()
              .map((sy) => ({ x: -sideX, y: sy })),
          ];

          const existingChildren = entities.filter(
            (ent) => ent.parentId === id,
          );
          const nextTableEntity: Entity = {
            ...targetEntity,
            ...updates,
            x: nextX,
            y: nextY,
            rotation: tableRotation,
            tableWidth: nextTableWidth,
            tableHeight: nextTableHeight,
            rectLayout: mergedLayout,
          };

          const nextChildren = seatOffsets.map((offset, index) => {
            const existingChild = existingChildren[index];
            const rotatedOffsetX = offset.x * tableCos - offset.y * tableSin;
            const rotatedOffsetY = offset.x * tableSin + offset.y * tableCos;
            const childX = nextX + rotatedOffsetX;
            const childY = nextY + rotatedOffsetY;

            return {
              ...(existingChild ?? {
                id: `seat-${Date.now()}-${Math.random()}-${index}`,
                label: `${nextTableEntity.label} - Silla ${index + 1}`,
                type: "seat" as const,
                parentId: id,
              }),
              label: `${nextTableEntity.label} - Silla ${index + 1}`,
              x: childX,
              y: childY,
              rotation: getSeatFacingRotation(childX, childY, nextX, nextY),
              color:
                typeof updates.color === "string"
                  ? updates.color
                  : (existingChild?.color ??
                    nextTableEntity.color ??
                    "#2563eb"),
              parentId: id,
              type: "seat" as const,
            };
          });

          const nextEntities = entities.filter(
            (ent) => ent.id !== id && ent.parentId !== id,
          );
          doAction([...nextEntities, nextTableEntity, ...nextChildren]);
          return;
        }

        doAction(
          entities.map((ent) => {
            if (ent.id === id) {
              return {
                ...ent,
                ...updates,
              };
            }
            if (ent.parentId === id) {
              return {
                ...ent,
                x: ent.x + dx,
                y: ent.y + dy,
                ...(typeof updates.color === "string"
                  ? { color: updates.color }
                  : {}),
              };
            }
            return ent;
          }),
        );
        return;
      }

      doAction(
        entities.map((ent) => (ent.id === id ? { ...ent, ...updates } : ent)),
      );
    },
    [doAction, entities],
  );

  // Handler para eliminar entidad
  const handleDeleteEntity = useCallback(
    (id: string) => {
      const targetEntity = entities.find((ent) => ent.id === id);
      const targetLabel = targetEntity?.label?.trim() || "esta entidad";
      const targetType = targetEntity ? getEntityType(targetEntity) : null;
      const isContainerEntity =
        targetType === "row" ||
        targetType === "table-circle" ||
        targetType === "table-rect";
      const idsToDelete =
        targetEntity && isContainerEntity
          ? [
              id,
              ...entities
                .filter((ent) => ent.parentId === id)
                .map((child) => child.id),
            ]
          : [id];

      confirmDeleteActionRef.current = () => {
        doAction(entities.filter((ent) => !idsToDelete.includes(ent.id)));
        setSelectedEntityIds((prev) =>
          prev.filter((eid) => !idsToDelete.includes(eid)),
        );
      };
      setConfirmDeleteLabel(targetLabel);
      setConfirmDeleteOpen(true);
    },
    [doAction, entities],
  );

  const handleConfirmDelete = useCallback(() => {
    const action = confirmDeleteActionRef.current;
    confirmDeleteActionRef.current = null;
    setConfirmDeleteOpen(false);
    action?.();
  }, []);
  // Guardar en la DB y limpiar el draft local
  const handleSaveToDb = useCallback(async () => {
    if (!dashboardId) {
      toast.error("No se pudo identificar el dashboard");
      return;
    }
    if (!canEdit) {
      toast.error("Solo lectura — no tenés permiso para guardar");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`/api/${dashboardId}/dashboard`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canvasData: entities }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Limpiar el draft local porque ya está guardado en la DB
      window.localStorage.removeItem(getDraftStorageKey(dashboardId));
      setHasUnsavedChanges(false);
      toast.success("Guardado correctamente");
    } catch {
      toast.error("No se pudo guardar en el servidor");
    } finally {
      setIsSaving(false);
    }
  }, [entities, dashboardId, canEdit]);

  // Ref for handleSaveToDb to avoid resubscribing keyboard effect
  const handleSaveToDbRef = useRef(handleSaveToDb);
  useEffect(() => {
    handleSaveToDbRef.current = handleSaveToDb;
  }, [handleSaveToDb]);
  const handleCancelDelete = useCallback(() => {
    confirmDeleteActionRef.current = null;
    setConfirmDeleteOpen(false);
  }, []);
  // Undo/redo + Ctrl+S keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (e.target as HTMLElement)?.isContentEditable;
      if (isInput) return;
      if (
        (e.ctrlKey || e.metaKey) &&
        !e.shiftKey &&
        e.key.toLowerCase() === "z"
      ) {
        e.preventDefault();
        undo();
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === "y" ||
          (e.shiftKey && e.key.toLowerCase() === "z"))
      ) {
        e.preventDefault();
        redo();
      }
      // Ctrl+S / Cmd+S → guardar en DB
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSaveToDbRef.current();
      }
      // Atajo para rotar con "r"
      if (
        e.key.toLowerCase() === "r" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        if (selectedEntityIds.length > 0) {
          e.preventDefault();
          // Ejecutar la misma lógica que handleGroupRotate pero con delta 90
          const rotationDelta = 90;
          const selectedSet = new Set(selectedIdsWithRowChildren);
          const selectedById = new Map(entities.map((ent) => [ent.id, ent]));
          const circleTableIds = new Set(
            entities
              .filter(
                (ent) =>
                  selectedSet.has(ent.id) &&
                  getEntityType(ent) === "table-circle",
              )
              .map((ent) => ent.id),
          );
          const rectTableIds = new Set(
            entities
              .filter(
                (ent) =>
                  selectedSet.has(ent.id) &&
                  getEntityType(ent) === "table-rect",
              )
              .map((ent) => ent.id),
          );
          const rowIds = new Set(
            entities
              .filter(
                (ent) =>
                  selectedSet.has(ent.id) && getEntityType(ent) === "row",
              )
              .map((ent) => ent.id),
          );
          const normalizeRotation = (rotation: number) =>
            ((((rotation % 360) + 360) % 360) + 360) % 360;
          const isGroupRotationCompatible = (type: EntityType) =>
            type === "seat" || type === "row" || type === "table-rect";
          const getSeatFacingRotation = (
            seatX: number,
            seatY: number,
            centerX: number,
            centerY: number,
          ) => {
            const dx = centerX - seatX;
            const dy = centerY - seatY;
            const angleToCenter = (Math.atan2(dy, dx) * 180) / Math.PI;
            return normalizeRotation(angleToCenter - 90);
          };
          const angleRad = (rotationDelta * Math.PI) / 180;
          const cosAngle = Math.cos(angleRad);
          const sinAngle = Math.sin(angleRad);
          let didChange = false;
          const nextEntities = entities.map((ent) => {
            if (!selectedSet.has(ent.id)) return ent;
            if (
              circleTableIds.has(ent.id) ||
              (ent.parentId && circleTableIds.has(ent.parentId))
            ) {
              return ent;
            }
            const entityType = getEntityType(ent);
            if (!isGroupRotationCompatible(entityType)) {
              return ent;
            }
            if (ent.parentId && rowIds.has(ent.parentId)) {
              const row = selectedById.get(ent.parentId);
              if (!row) return ent;
              const dx = ent.x - row.x;
              const dy = ent.y - row.y;
              const rotatedX = row.x + dx * cosAngle - dy * sinAngle;
              const rotatedY = row.y + dx * sinAngle + dy * cosAngle;
              const rotatedRotation = normalizeRotation(
                (ent.rotation || 0) + rotationDelta,
              );
              if (
                rotatedX === ent.x &&
                rotatedY === ent.y &&
                rotatedRotation === (ent.rotation || 0)
              ) {
                return ent;
              }
              didChange = true;
              return {
                ...ent,
                x: rotatedX,
                y: rotatedY,
                rotation: rotatedRotation,
              };
            }
            if (ent.parentId && rectTableIds.has(ent.parentId)) {
              const table = selectedById.get(ent.parentId);
              if (!table) return ent;
              const dx = ent.x - table.x;
              const dy = ent.y - table.y;
              const rotatedX = table.x + dx * cosAngle - dy * sinAngle;
              const rotatedY = table.y + dx * sinAngle + dy * cosAngle;
              const rotatedRotation = getSeatFacingRotation(
                rotatedX,
                rotatedY,
                table.x,
                table.y,
              );
              if (
                rotatedX === ent.x &&
                rotatedY === ent.y &&
                rotatedRotation === (ent.rotation || 0)
              ) {
                return ent;
              }
              didChange = true;
              return {
                ...ent,
                x: rotatedX,
                y: rotatedY,
                rotation: rotatedRotation,
              };
            }
            const rotatedRotation = normalizeRotation(
              (ent.rotation || 0) + rotationDelta,
            );
            if (rotatedRotation === (ent.rotation || 0)) {
              return ent;
            }
            didChange = true;
            return {
              ...ent,
              rotation: rotatedRotation,
            };
          });
          if (didChange) {
            doAction(nextEntities);
          }
        }
      }

      // Mover entidades seleccionadas con flechas o WASD
      const moveKeys = {
        ArrowUp: { dx: 0, dy: -5 },
        ArrowDown: { dx: 0, dy: 5 },
        ArrowLeft: { dx: -5, dy: 0 },
        ArrowRight: { dx: 5, dy: 0 },
        w: { dx: 0, dy: -5 },
        s: { dx: 0, dy: 5 },
        a: { dx: -5, dy: 0 },
        d: { dx: 5, dy: 0 },
      };
      const key = e.key;
      if (
        Object.prototype.hasOwnProperty.call(moveKeys, key) &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        selectedEntityIds.length > 0
      ) {
        e.preventDefault();
        const { dx, dy } = moveKeys[key as keyof typeof moveKeys];
        let didChange = false;
        const nextEntities = entities.map((ent) => {
          if (!selectedIdsWithRowChildren.includes(ent.id)) return ent;
          const nextX = (typeof ent.x === "number" ? ent.x : 0) + dx;
          const nextY = (typeof ent.y === "number" ? ent.y : 0) + dy;
          if (nextX === ent.x && nextY === ent.y) return ent;
          didChange = true;
          return { ...ent, x: nextX, y: nextY };
        });
        if (didChange) {
          doAction(nextEntities);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [redo, undo, doAction, selectedEntityIds, entities]);

  // Advertir al usuario si intenta cerrar/navegar con cambios sin guardar
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Handler para selección desde Canvas
  const handleSelectionChange = useCallback((ids: string[]) => {
    setSelectedEntityIds(ids);
  }, []);

  // setEntities que registra en el historial (para Canvas)
  const setEntitiesWithHistory = React.useCallback(
    (updaterOrValue: React.SetStateAction<Entity[]>) => {
      setEntities((prev) => {
        let next: Entity[];
        if (typeof updaterOrValue === "function") {
          next = updaterOrValue(prev);
        } else {
          next = updaterOrValue;
        }
        const normalizedNext = applyAreaAssociations(next);
        if (normalizedNext !== prev) {
          setUndoStack((stack) => [...stack.slice(-49), prev]);
          setRedoStack([]);
        }
        return normalizedNext;
      });
    },
    [],
  );

  const [isSaving, setIsSaving] = useState(false);

  // Descartar draft local y recargar desde la DB
  const handleReloadFromDb = useCallback(async () => {
    if (!dashboardId) return;
    try {
      const res = await fetch(`/api/${dashboardId}/dashboard`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.canvasData))
        throw new Error("canvasData inválido");
      // Limpiar draft local y cargar estado de la DB
      window.localStorage.removeItem(getDraftStorageKey(dashboardId));
      setEntities(applyAreaAssociations(data.canvasData));
      setUndoStack([]);
      setRedoStack([]);
      setSelectedEntityIds([]);
      setHasUnsavedChanges(false);
      toast.success("Canvas recargado desde el servidor");
    } catch {
      toast.error("No se pudo recargar desde el servidor");
    }
  }, [dashboardId]);

  const handleExportText = useCallback(() => {
    try {
      const report = buildCanvasTextExport(entities);
      downloadFile(
        `canvas-export-${getExportTimestamp()}.txt`,
        report,
        "text/plain;charset=utf-8",
      );
      toast.success("Exportado como texto");
      setExportMenuOpen(false);
    } catch {
      toast.error("No se pudo exportar como texto");
    }
  }, [entities]);

  const handleExportPng = useCallback(async () => {
    if (!canvasExportRef.current) {
      toast.error("No se encontró el canvas para exportar");
      return;
    }

    setIsExporting(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(canvasExportRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        filter: shouldIncludeExportNode,
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `canvas-export-${getExportTimestamp()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Exportado como imagen PNG");
      setExportMenuOpen(false);
    } catch (error) {
      console.error("Error exportando PNG", error);
      const message =
        error instanceof Error && error.message
          ? `No se pudo exportar PNG: ${error.message}`
          : "No se pudo exportar como PNG";
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  }, []);

  const handleExportPdf = useCallback(async () => {
    if (!canvasExportRef.current) {
      toast.error("No se encontró el canvas para exportar");
      return;
    }

    setIsExporting(true);
    try {
      const { toPng } = await import("html-to-image");
      const { jsPDF } = await import("jspdf");

      const imageData = await toPng(canvasExportRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        filter: shouldIncludeExportNode,
      });
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4",
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 24;

      const exportRect = canvasExportRef.current.getBoundingClientRect();
      const imageWidth = Math.max(1, Math.round(exportRect.width * 2));
      const imageHeight = Math.max(1, Math.round(exportRect.height * 2));
      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - margin * 2;
      const ratio = Math.min(maxWidth / imageWidth, maxHeight / imageHeight);
      const renderWidth = imageWidth * ratio;
      const renderHeight = imageHeight * ratio;
      const offsetX = (pageWidth - renderWidth) / 2;
      const offsetY = (pageHeight - renderHeight) / 2;

      pdf.addImage(
        imageData,
        "PNG",
        offsetX,
        offsetY,
        renderWidth,
        renderHeight,
      );
      pdf.save(`canvas-export-${getExportTimestamp()}.pdf`);
      toast.success("Exportado como PDF");
      setExportMenuOpen(false);
    } catch (error) {
      console.error("Error exportando PDF", error);
      const message =
        error instanceof Error && error.message
          ? `No se pudo exportar PDF: ${error.message}`
          : "No se pudo exportar como PDF";
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  }, []);

  // --- Pantallas de control de acceso ---
  if (accessStatus === null) {
    return (
      <div className="h-[calc(100dvh-4rem)] flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <svg
            className="animate-spin"
            width={28}
            height={28}
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray="31.4"
              strokeDashoffset="10"
              strokeLinecap="round"
            />
          </svg>
          <span className="text-sm font-medium">Verificando acceso...</span>
        </div>
      </div>
    );
  }

  if (accessStatus === "denied") {
    return (
      <div className="h-[calc(100dvh-4rem)] flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-5 max-w-sm text-center px-6">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <svg
              width={30}
              height={30}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              className="text-destructive"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M15 9l-6 6M9 9l6 6" />
            </svg>
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold text-foreground">
              Sin acceso a este dashboard
            </h2>
            <p className="text-sm text-muted-foreground">
              Solo el dueño o las personas con acceso compartido pueden ver este
              dashboard.
            </p>
          </div>
          <a
            href="/"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    );
  }

  if (accessStatus === "not-found") {
    return (
      <div className="h-[calc(100dvh-4rem)] flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-5 max-w-sm text-center px-6">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <svg
              width={30}
              height={30}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              className="text-muted-foreground"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold text-foreground">
              Dashboard no encontrado
            </h2>
            <p className="text-sm text-muted-foreground">
              Este dashboard no existe o fue eliminado.
            </p>
          </div>
          <a
            href="/"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] bg-background flex flex-col overflow-hidden">
      <main className="relative flex flex-1 min-h-0 overflow-hidden">
        <div
          data-export-ignore="true"
          className="absolute right-3 top-3 z-30 flex items-center gap-2 sm:right-6 sm:top-4"
        >
          {/* Badge solo lectura para visitantes */}
          {!canEdit && userRole !== null && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-sky-50 border border-sky-200 px-2.5 py-1.5 text-xs font-semibold text-sky-700 select-none">
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24">
                <path
                  d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="3"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
              </svg>
              Solo lectura
            </span>
          )}

          {/* Guardar en DB — solo dueños y editores */}
          {canEdit && (
            <button
              type="button"
              data-tutorial="save-button"
              onClick={handleSaveToDb}
              disabled={isSaving}
              title={
                hasUnsavedChanges
                  ? "Guardar cambios (Ctrl+S)"
                  : "Todo guardado (Ctrl+S)"
              }
              className="rounded-md bg-primary px-3 py-2 font-semibold text-white inline-flex items-center gap-2 sm:px-4 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity relative"
            >
              {isSaving ? (
                <svg
                  className="animate-spin"
                  width={16}
                  height={16}
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray="31.4"
                    strokeDashoffset="10"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <Save size={16} />
              )}
              <span className="hidden sm:inline">
                {isSaving ? "Guardando..." : "Guardar"}
              </span>
              {/* Punto indicador de cambios sin guardar */}
              {hasUnsavedChanges && !isSaving && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-primary-foreground/20" />
              )}
            </button>
          )}

          {/* Recargar desde DB — solo dueños y editores */}
          {canEdit && (
            <div className="relative group inline-block">
              <button
                type="button"
                onClick={handleReloadFromDb}
                title="Descartar cambios locales y recargar desde el servidor"
                className="rounded-md border border-border bg-card px-3 py-2 font-semibold text-muted-foreground inline-flex items-center gap-2 sm:px-4 hover:bg-muted transition-colors"
              >
                <RefreshCcw size={16} />
                <span className="hidden sm:inline">Recargar</span>
              </button>
              <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-max px-3 py-1 rounded bg-black text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[20] whitespace-nowrap shadow-lg">
                Recargar el canvas con lo último guardado en DB
              </div>
            </div>
          )}

          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setExportMenuOpen((prev) => !prev)}
              className="rounded-md bg-primary px-3 py-2 font-semibold text-white inline-flex items-center gap-2 sm:px-4"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Export</span>
            </button>
            {exportMenuOpen && (
              <div className="absolute right-0 mt-2 z-50 w-48 sm:w-56 rounded-lg border border-border bg-card p-2 shadow-lg">
                <button
                  type="button"
                  onClick={handleExportText}
                  className="w-full px-3 py-2 rounded-md text-sm hover:bg-muted inline-flex items-center gap-2 text-left"
                  disabled={isExporting}
                >
                  <FileText size={16} />
                  Exportar texto (.txt)
                </button>
                <button
                  type="button"
                  onClick={handleExportPng}
                  className="w-full px-3 py-2 rounded-md text-sm hover:bg-muted inline-flex items-center gap-2 text-left"
                  disabled={isExporting}
                >
                  <Image size={16} />
                  Exportar imagen (.png)
                </button>
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="w-full px-3 py-2 rounded-md text-sm hover:bg-muted inline-flex items-center gap-2 text-left"
                  disabled={isExporting}
                >
                  <File size={16} />
                  Exportar PDF (.pdf)
                </button>
              </div>
            )}
          </div>
        </div>
        {/* Sidebar */}
        <aside
          data-tutorial="sidebar-tools"
          className={`bg-card/80 border-r border-border flex max-h-full min-h-0 flex-col py-4 gap-4 sm:py-6 sm:gap-6 overflow-y-auto overflow-x-hidden overscroll-contain transition-all duration-300 ${
            isSidebarCollapsed
              ? isMobileViewport
                ? "w-14 min-w-[56px] items-center"
                : "w-20 min-w-[80px] items-center"
              : "w-64 min-w-[256px] items-stretch"
          }`}
        >
          <div
            className={`hidden w-full px-3 md:flex ${
              isSidebarCollapsed ? "justify-center" : "justify-end"
            }`}
          >
            <button
              type="button"
              onClick={() => setLeftSidebarCollapsed((v) => !v)}
              className={`h-9 rounded-md border border-border bg-muted/60 hover:bg-muted transition flex items-center ${
                isSidebarCollapsed
                  ? "w-9 justify-center"
                  : "px-3 gap-2 justify-center"
              }`}
              aria-label={
                isSidebarCollapsed ? "Expandir barra" : "Contraer barra"
              }
            >
              <motion.div
                animate={{ rotate: isSidebarCollapsed ? 0 : 180 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
              >
                <ArrowRight size={16} className="text-muted-foreground" />
              </motion.div>
              {!isSidebarCollapsed && (
                <span className="text-xs font-medium text-muted-foreground">
                  Contraer
                </span>
              )}
            </button>
          </div>
          {/* Main vertical menu */}
          <div
            className={`flex flex-col gap-4 w-full ${
              isSidebarCollapsed
                ? "items-center gap-2 sm:gap-4"
                : "items-stretch px-2 sm:px-3"
            }`}
          >
            {canEdit &&
              SIDEBAR_TOOL_CONFIG.map((toolConfig) => (
                <SidebarToolItem
                  key={toolConfig.type}
                  collapsed={isSidebarCollapsed}
                  label={toolConfig.label}
                  tooltip={toolConfig.tooltip}
                  type={toolConfig.type}
                  highlighted={toolConfig.highlighted}
                  active={Boolean(
                    toolConfig.selectable && sidebarTool === toolConfig.type,
                  )}
                  onClick={
                    toolConfig.selectable
                      ? () => handleSidebarToolToggle(toolConfig.type)
                      : undefined
                  }
                />
              ))}

            {isMobileViewport && (
              <>
                <div className="my-1 h-px w-8 bg-border/80" />

                {MOUSE_MODE_OPTIONS.filter(
                  (o) => canEdit || o.mode === "pan",
                ).map((option) => (
                  <button
                    key={`mobile-mode-${option.mode}`}
                    type="button"
                    onClick={() => {
                      setMouseMode(option.mode);
                      setSidebarTool("none");
                    }}
                    aria-label={option.label}
                    className={`h-10 w-10 rounded-lg transition-colors flex items-center justify-center ${
                      mouseMode === option.mode
                        ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                        : "hover:bg-secondary text-foreground"
                    }`}
                  >
                    {option.icon}
                  </button>
                ))}

                <div className="my-1 h-px w-8 bg-border/80" />

                <button
                  type="button"
                  onClick={() =>
                    setCanvasZoom((z) => Math.max(0.2, +(z - 0.1).toFixed(2)))
                  }
                  aria-label="Alejar zoom"
                  className="h-10 w-10 rounded-lg transition-colors flex items-center justify-center hover:bg-secondary text-foreground"
                >
                  <Minus size={18} />
                </button>

                <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">
                  {Math.round(canvasZoom * 100)}%
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setCanvasZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)))
                  }
                  aria-label="Acercar zoom"
                  className="h-10 w-10 rounded-lg transition-colors flex items-center justify-center hover:bg-secondary text-foreground"
                >
                  <Plus size={18} />
                </button>

                <button
                  type="button"
                  onClick={() => setShowGrid((prev) => !prev)}
                  aria-label={
                    showGrid ? "Ocultar cuadrícula" : "Mostrar cuadrícula"
                  }
                  className={`h-10 w-10 rounded-lg transition-colors flex items-center justify-center ${
                    showGrid
                      ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                      : "hover:bg-secondary text-foreground"
                  }`}
                >
                  <Grid3x3 size={18} />
                </button>
                <button
                  type="button"
                  onClick={handleClearCanvas}
                  aria-label="Limpiar canvas"
                  className="h-10 w-10 rounded-lg transition-colors flex items-center justify-center text-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 size={18} />
                </button>
              </>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <section
          data-tutorial="canvas-area"
          ref={canvasExportRef}
          className="flex-1 min-h-0 flex flex-col items-center justify-center relative bg-dot-pattern overflow-hidden"
        >
          <Canvas
            mouseMode={mouseMode}
            sidebarTool={sidebarTool}
            setSidebarTool={setSidebarTool}
            entities={entities}
            setEntities={setEntitiesWithHistory}
            onSelectionChange={handleSelectionChange}
            selectedEntityIds={selectedEntityIds}
            onUndo={undo}
            onRedo={redo}
            canUndo={undoStack.length > 0}
            canRedo={redoStack.length > 0}
            hideCanvasFooterActions={isMobileViewport}
            hideCanvasTopControls={isMobileViewport}
            hideCanvasHistoryControls={isMobileViewport}
            showGrid={showGrid}
            onToggleGrid={() => setShowGrid((prev) => !prev)}
            zoom={canvasZoom}
            onZoomChange={setCanvasZoom}
            readOnly={!canEdit}
          />
          {/* Mouse mode selector */}
          <div
            data-export-ignore="true"
            className="absolute bottom-4 left-1/2 z-20 hidden max-w-[calc(100%-1rem)] -translate-x-1/2 items-center gap-2 overflow-visible rounded-full border border-border bg-card/80 px-3 py-2 shadow sm:bottom-6 sm:max-w-none sm:gap-4 sm:px-4 md:flex"
          >
            {MOUSE_MODE_OPTIONS.filter((o) => canEdit || o.mode === "pan").map(
              (option) => (
                <div
                  data-tutorial={`mouse-mode-${option.mode}`}
                  key={option.mode}
                >
                  <MouseModeOption
                    key={option.mode}
                    active={mouseMode === option.mode}
                    onClick={() => setMouseMode(option.mode)}
                    icon={option.icon}
                    label={option.label}
                    shortcutKeys={option.shortcutKeys}
                    activeClass={option.activeClass}
                    inactiveClass={option.inactiveClass}
                  />
                </div>
              ),
            )}
          </div>
        </section>

        {/* Properties Panel */}
        <AnimatePresence>
          {propertiesOpen ? (
            <motion.aside
              data-tutorial="properties-panel"
              key="properties-panel"
              initial={{ clipPath: "inset(0 -100% 0 100%)" }}
              animate={{ clipPath: "inset(0 0% 0 0%)" }}
              exit={{ clipPath: "inset(0 -100% 0 100%)" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className={`bg-card border border-border flex flex-col ${
                isMobileViewport
                  ? "fixed inset-x-2 bottom-2  top-16 z-40 rounded-2xl"
                  : "w-80  min-w-[400px]"
              }`}
              style={
                isMobileViewport
                  ? {
                      boxShadow:
                        "0 8px 32px 0 color-mix(in oklch, var(--primary) 10%, transparent), 0 1.5px 8px 0 rgba(0,0,0,0.04)",
                      background: "var(--card, #fff)",
                    }
                  : {
                      height: "88vh",
                      maxHeight: "900px",
                      borderRadius: "28px",
                      boxShadow:
                        "0 8px 32px 0 color-mix(in oklch, var(--primary) 10%, transparent), 0 1.5px 8px 0 rgba(0,0,0,0.04)",
                      position: "absolute",
                      top: "5vh",
                      right: "32px",
                      zIndex: 40,
                      background: "var(--card, #fff)",
                      padding: 0,
                      display: "flex",
                      flexDirection: "column",
                    }
              }
            >
              {/* Sticky header */}
              <div
                className="sticky top-0 z-10 bg-card border-b border-border px-6 pt-5 pb-3 flex items-center justify-between"
                style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28 }}
              >
                <div className="flex items-center gap-2 select-none pointer-events-auto">
                  <Settings size={22} className="text-primary" />
                  <span className="font-semibold text-lg text-foreground tracking-tight">
                    Propiedades
                  </span>
                </div>
                <button
                  className="text-muted-foreground hover:text-primary text-xl leading-none"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPropertiesOpen(false);
                  }}
                  aria-label="Cerrar panel de propiedades"
                  style={{
                    fontSize: 28,
                    lineHeight: 1,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  ×
                </button>
              </div>
              {/* Contenido scrollable único — selección, acciones grupales y lista */}
              <div className="flex-1 overflow-y-auto flex flex-col gap-2 pb-6">
                {/* Selección actual y acciones grupales */}
                <div
                  className="px-6 pt-2 pb-0 flex flex-col gap-2"
                  style={{ background: "var(--card, #fff)", zIndex: 20 }}
                >
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="rounded-lg border border-primary/10 bg-primary/5 px-4 py-3 flex items-center gap-3 mb-1"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Settings size={20} className="text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-primary mb-0.5 uppercase tracking-wide">
                        Selección actual
                      </div>
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={selectedEntities.length}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                          className="text-sm font-bold text-foreground"
                        >
                          {selectedEntities.length === 0
                            ? "Ninguna entidad seleccionada"
                            : `${selectedEntities.length} ${selectedEntities.length === 1 ? "entidad seleccionada" : "entidades seleccionadas"}`}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </motion.div>
                  <AnimatePresence>
                    {selectedEntities.length > 1 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, y: -8 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -8 }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 28,
                        }}
                        style={{
                          overflow: "hidden",
                          background: "var(--card, #fff)",
                        }}
                        className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 mb-2 flex flex-col gap-2"
                      >
                        <div
                          className="flex items-center gap-2 mb-1 cursor-pointer select-none"
                          onClick={() => setGroupMenuOpen((v) => !v)}
                        >
                          <motion.button
                            animate={{ rotate: groupMenuOpen ? 180 : 0 }}
                            className={
                              "w-6 h-6 flex items-center justify-center rounded transition " +
                              (groupMenuOpen
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground hover:bg-primary/10")
                            }
                            tabIndex={-1}
                          >
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 20 20"
                              fill="none"
                            >
                              <path
                                d="M6 8l4 4 4-4"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </motion.button>
                          <span className="font-semibold text-primary text-xs uppercase tracking-wide">
                            Acciones grupales
                          </span>
                        </div>
                        <AnimatePresence>
                          {groupMenuOpen && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{
                                type: "spring",
                                stiffness: 300,
                                damping: 28,
                              }}
                              style={{ overflow: "hidden" }}
                              className="flex flex-col gap-3 mt-1 "
                            >
                              <div className="flex flex-col gap-3">
                                <GroupNumericActionRow
                                  label="Mover X"
                                  value={groupMoveX}
                                  onChange={setGroupMoveX}
                                  onApply={handleGroupMoveX}
                                  placeholder="Ej: 100"
                                />
                                <GroupNumericActionRow
                                  label="Mover Y"
                                  value={groupMoveY}
                                  onChange={setGroupMoveY}
                                  onApply={handleGroupMoveY}
                                  placeholder="Ej: 100"
                                />
                                <GroupNumericActionRow
                                  label="Rotar"
                                  value={groupRotate}
                                  onChange={setGroupRotate}
                                  onApply={handleGroupRotate}
                                  placeholder="Ej: 15"
                                />
                                {/* Color */}
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium min-w-[70px]">
                                    Color
                                  </span>
                                  <input
                                    type="color"
                                    className="w-8 h-8 rounded-full border-2 border-border shadow-sm cursor-pointer transition hover:scale-105 focus:ring-2 focus:ring-primary/30"
                                    value={groupColor}
                                    onChange={(e) =>
                                      setGroupColor(e.target.value)
                                    }
                                  />
                                  <button
                                    className="px-2 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/80 transition flex items-center"
                                    title="Aplicar"
                                    onClick={handleGroupColor}
                                    type="button"
                                  >
                                    <svg
                                      width="16"
                                      height="16"
                                      fill="none"
                                      viewBox="0 0 16 16"
                                    >
                                      <path
                                        d="M3 8h10M11 5l2 3-2 3"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  </button>
                                </div>

                                {/* ── Etiquetado en serie ─────────────────── */}
                                <div className="flex flex-col gap-1.5 pt-2 border-t border-border/40">
                                  <span className="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-1">
                                    <svg
                                      width="13"
                                      height="13"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                      <circle
                                        cx="7"
                                        cy="7"
                                        r="1.5"
                                        fill="currentColor"
                                      />
                                    </svg>
                                    Etiquetar en serie
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <div className="flex flex-col gap-0.5 flex-1">
                                      <span className="text-[10px] text-muted-foreground font-medium">
                                        Prefijo
                                      </span>
                                      <input
                                        type="text"
                                        className="w-full px-2 py-1 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        placeholder="Ej: A-"
                                        value={groupLabelPrefix}
                                        onChange={(e) =>
                                          setGroupLabelPrefix(e.target.value)
                                        }
                                        maxLength={12}
                                      />
                                    </div>
                                    <div className="flex flex-col gap-0.5 w-14">
                                      <span className="text-[10px] text-muted-foreground font-medium">
                                        Inicio
                                      </span>
                                      <input
                                        type="number"
                                        className="w-full px-2 py-1 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 text-center"
                                        value={groupLabelStart}
                                        onChange={(e) =>
                                          setGroupLabelStart(
                                            Number(e.target.value),
                                          )
                                        }
                                        min={0}
                                        step={1}
                                      />
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-[10px] text-transparent select-none">
                                        ·
                                      </span>
                                      <button
                                        className="px-2 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/80 transition flex items-center"
                                        title="Aplicar etiquetado en serie"
                                        onClick={handleGroupLabel}
                                        type="button"
                                      >
                                        <svg
                                          width="16"
                                          height="16"
                                          fill="none"
                                          viewBox="0 0 16 16"
                                        >
                                          <path
                                            d="M3 8h10M11 5l2 3-2 3"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                  {/* Preview de cómo quedarán las etiquetas */}
                                  <p className="text-[10px] text-muted-foreground leading-snug">
                                    {groupLabelPrefix !== "" ||
                                    groupLabelStart !== 1 ? (
                                      <>
                                        Vista previa:{" "}
                                        <span className="font-semibold text-foreground">
                                          {groupLabelPrefix}
                                          {groupLabelStart}
                                        </span>
                                        ,{" "}
                                        <span className="font-semibold text-foreground">
                                          {groupLabelPrefix}
                                          {groupLabelStart + 1}
                                        </span>
                                        ,{" "}
                                        <span className="font-semibold text-foreground">
                                          {groupLabelPrefix}
                                          {groupLabelStart + 2}
                                        </span>
                                        …
                                      </>
                                    ) : (
                                      "Ingresá un prefijo y/o número de inicio."
                                    )}
                                  </p>
                                </div>

                                {/* ── Etiquetado en serie por tipo ─────────── */}
                                {(() => {
                                  const TYPE_LABELS: Record<string, string> = {
                                    seat: "Silla suelta",
                                    row: "Fila",
                                    "table-circle": "Mesa circular",
                                    "table-rect": "Mesa rectangular",
                                    area: "Área",
                                  };
                                  const topLevelSelected = entities.filter(
                                    (ent) =>
                                      selectedIdsWithRowChildren.includes(
                                        ent.id,
                                      ) && !ent.parentId,
                                  );
                                  const typesPresent = Array.from(
                                    new Set(
                                      topLevelSelected.map((ent) =>
                                        getEntityType(ent),
                                      ),
                                    ),
                                  );
                                  if (typesPresent.length < 2) return null;
                                  return (
                                    <div className="flex flex-col gap-1 pt-2 border-t border-border/40">
                                      {/* Header toggle */}
                                      <div
                                        className="flex items-center gap-2 cursor-pointer select-none"
                                        onClick={() =>
                                          setTypeLabelSectionOpen((v) => !v)
                                        }
                                      >
                                        <motion.span
                                          animate={{
                                            rotate: typeLabelSectionOpen
                                              ? 180
                                              : 0,
                                          }}
                                          className={
                                            "w-5 h-5 flex items-center justify-center rounded transition " +
                                            (typeLabelSectionOpen
                                              ? "bg-primary/10 text-primary"
                                              : "bg-muted text-muted-foreground hover:bg-primary/10")
                                          }
                                        >
                                          <svg
                                            width="14"
                                            height="14"
                                            viewBox="0 0 20 20"
                                            fill="none"
                                          >
                                            <path
                                              d="M6 8l4 4 4-4"
                                              stroke="currentColor"
                                              strokeWidth="2"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                            />
                                          </svg>
                                        </motion.span>
                                        <span className="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-1">
                                          <svg
                                            width="13"
                                            height="13"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"
                                              stroke="currentColor"
                                              strokeWidth="1.5"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                            />
                                            <circle
                                              cx="7"
                                              cy="7"
                                              r="1.5"
                                              fill="currentColor"
                                            />
                                          </svg>
                                          Etiquetar por tipo
                                        </span>
                                      </div>
                                      <AnimatePresence>
                                        {typeLabelSectionOpen && (
                                          <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{
                                              opacity: 1,
                                              height: "auto",
                                            }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{
                                              type: "spring",
                                              stiffness: 300,
                                              damping: 28,
                                            }}
                                            style={{ overflow: "hidden" }}
                                            className="flex flex-col gap-2 mt-1"
                                          >
                                            <p className="text-[10px] text-muted-foreground">
                                              Asigná una serie independiente
                                              para cada tipo de elemento
                                              seleccionado.
                                            </p>
                                            {typesPresent.map((typeKey) => {
                                              const count =
                                                topLevelSelected.filter(
                                                  (ent) =>
                                                    getEntityType(ent) ===
                                                    typeKey,
                                                ).length;
                                              const cfg = typeLabelConfigs[
                                                typeKey
                                              ] ?? { prefix: "", start: 1 };
                                              return (
                                                <div
                                                  key={typeKey}
                                                  className="flex flex-col gap-1 rounded-md border border-border/60 bg-background/60 px-2 py-1.5"
                                                >
                                                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                                                    {TYPE_LABELS[typeKey] ??
                                                      typeKey}{" "}
                                                    <span className="text-primary font-bold">
                                                      ({count})
                                                    </span>
                                                  </span>
                                                  <div className="flex items-center gap-1.5">
                                                    <div className="flex flex-col gap-0.5 flex-1">
                                                      <span className="text-[10px] text-muted-foreground font-medium">
                                                        Prefijo
                                                      </span>
                                                      <input
                                                        type="text"
                                                        className="w-full px-2 py-1 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                        placeholder="Ej: M-"
                                                        value={cfg.prefix}
                                                        onChange={(e) =>
                                                          setTypeLabelConfigs(
                                                            (prev) => ({
                                                              ...prev,
                                                              [typeKey]: {
                                                                ...cfg,
                                                                prefix:
                                                                  e.target
                                                                    .value,
                                                              },
                                                            }),
                                                          )
                                                        }
                                                        maxLength={12}
                                                      />
                                                    </div>
                                                    <div className="flex flex-col gap-0.5 w-14">
                                                      <span className="text-[10px] text-muted-foreground font-medium">
                                                        Inicio
                                                      </span>
                                                      <input
                                                        type="number"
                                                        className="w-full px-2 py-1 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 text-center"
                                                        value={cfg.start}
                                                        onChange={(e) =>
                                                          setTypeLabelConfigs(
                                                            (prev) => ({
                                                              ...prev,
                                                              [typeKey]: {
                                                                ...cfg,
                                                                start: Number(
                                                                  e.target
                                                                    .value,
                                                                ),
                                                              },
                                                            }),
                                                          )
                                                        }
                                                        min={0}
                                                        step={1}
                                                      />
                                                    </div>
                                                    <div className="flex flex-col gap-0.5">
                                                      <span className="text-[10px] text-transparent select-none">
                                                        ·
                                                      </span>
                                                      <button
                                                        className="px-2 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/80 transition flex items-center"
                                                        title={`Aplicar etiquetado en serie a ${TYPE_LABELS[typeKey] ?? typeKey}`}
                                                        onClick={() =>
                                                          handleGroupLabelByType(
                                                            typeKey,
                                                          )
                                                        }
                                                        type="button"
                                                      >
                                                        <svg
                                                          width="16"
                                                          height="16"
                                                          fill="none"
                                                          viewBox="0 0 16 16"
                                                        >
                                                          <path
                                                            d="M3 8h10M11 5l2 3-2 3"
                                                            stroke="currentColor"
                                                            strokeWidth="1.5"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                          />
                                                        </svg>
                                                      </button>
                                                    </div>
                                                  </div>
                                                  {(cfg.prefix !== "" ||
                                                    cfg.start !== 1) && (
                                                    <p className="text-[10px] text-muted-foreground">
                                                      Vista previa:{" "}
                                                      <span className="font-semibold text-foreground">
                                                        {cfg.prefix}
                                                        {cfg.start}
                                                      </span>
                                                      ,{" "}
                                                      <span className="font-semibold text-foreground">
                                                        {cfg.prefix}
                                                        {cfg.start + 1}
                                                      </span>
                                                      ,{" "}
                                                      <span className="font-semibold text-foreground">
                                                        {cfg.prefix}
                                                        {cfg.start + 2}
                                                      </span>
                                                      …
                                                    </p>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  );
                                })()}
                              </div>
                              {/* fin scroll container */}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                {/* Lista de entidades seleccionadas — agrupada por tipo */}
                {selectedEntities.length > 0 && (
                  <div className="px-6 pt-2 flex flex-col gap-2">
                    {(() => {
                      const TYPE_META: Record<
                        string,
                        { label: string; labelPlural: string }
                      > = {
                        seat: {
                          label: "Silla suelta",
                          labelPlural: "Sillas sueltas",
                        },
                        row: { label: "Fila", labelPlural: "Filas" },
                        "table-circle": {
                          label: "Mesa circular",
                          labelPlural: "Mesas circulares",
                        },
                        "table-rect": {
                          label: "Mesa rectangular",
                          labelPlural: "Mesas rectangulares",
                        },
                        area: { label: "Área", labelPlural: "Áreas" },
                      };
                      // Agrupar por tipo manteniendo el orden original
                      const groups: {
                        typeKey: string;
                        entities: typeof selectedEntities;
                      }[] = [];
                      const seen = new Set<string>();
                      selectedEntities.forEach((ent) => {
                        const t = getEntityType(ent);
                        if (!seen.has(t)) {
                          seen.add(t);
                          groups.push({ typeKey: t, entities: [] });
                        }
                        groups.find((g) => g.typeKey === t)!.entities.push(ent);
                      });

                      // Si solo hay un tipo, mostrar directo sin agrupar
                      if (groups.length === 1) {
                        return groups[0].entities.map((ent, i) => (
                          <motion.div
                            key={ent.id || i}
                            transition={{
                              type: "spring",
                              stiffness: 300,
                              damping: 28,
                              delay: i * 0.04,
                            }}
                            className="relative group"
                          >
                            <div className="relative pr-8">
                              <EntityDropdown
                                ent={ent}
                                onUpdate={handleUpdateEntity}
                                onDelete={handleDeleteEntity}
                                allEntities={entities}
                              />
                              {selectedEntities.length > 1 && (
                                <button
                                  type="button"
                                  className="absolute top-2 right-2 z-10 opacity-60 hover:opacity-100 transition-opacity bg-destructive/10 text-destructive rounded-full p-1 group-hover:opacity-100"
                                  title="Quitar de la selección"
                                  onClick={() =>
                                    setSelectedEntityIds((prev) =>
                                      prev.filter((id) => id !== ent.id),
                                    )
                                  }
                                >
                                  <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 20 20"
                                    fill="none"
                                  >
                                    <path
                                      d="M6 6l8 8M14 6l-8 8"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </motion.div>
                        ));
                      }

                      // Múltiples tipos → mostrar acordeones por tipo
                      return groups.map(({ typeKey, entities: groupEnts }) => {
                        const meta = TYPE_META[typeKey] ?? {
                          label: typeKey,
                          labelPlural: typeKey,
                        };
                        const isOpen = openTypeGroups[typeKey] !== false; // abierto por defecto
                        const toggle = () =>
                          setOpenTypeGroups((prev) => ({
                            ...prev,
                            [typeKey]: !isOpen,
                          }));
                        return (
                          <div
                            key={typeKey}
                            className="flex flex-col rounded-lg border border-border/60 overflow-hidden"
                          >
                            {/* Header del grupo */}
                            <button
                              type="button"
                              onClick={toggle}
                              className="flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted transition-colors text-left w-full"
                            >
                              <motion.span
                                animate={{ rotate: isOpen ? 180 : 0 }}
                                transition={{
                                  type: "spring",
                                  stiffness: 300,
                                  damping: 28,
                                }}
                                className="w-4 h-4 flex items-center justify-center text-muted-foreground shrink-0"
                              >
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 20 20"
                                  fill="none"
                                >
                                  <path
                                    d="M6 8l4 4 4-4"
                                    stroke="currentColor"
                                    strokeWidth="2.2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </motion.span>
                              <EntitySvgIcon
                                type={typeKey as EntityType}
                                size={16}
                                color="currentColor"
                                className="text-primary shrink-0"
                              />
                              <span className="text-xs font-semibold text-foreground flex-1">
                                {groupEnts.length === 1
                                  ? meta.label
                                  : meta.labelPlural}
                              </span>
                              <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-full px-2 py-0.5 shrink-0">
                                {groupEnts.length}
                              </span>
                            </button>
                            {/* Contenido colapsable */}
                            <AnimatePresence>
                              {isOpen && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{
                                    type: "spring",
                                    stiffness: 300,
                                    damping: 28,
                                  }}
                                  style={{ overflow: "hidden" }}
                                  className="flex flex-col gap-2 px-2 py-2"
                                >
                                  {groupEnts.map((ent, i) => (
                                    <motion.div
                                      key={ent.id || i}
                                      transition={{
                                        type: "spring",
                                        stiffness: 300,
                                        damping: 28,
                                        delay: i * 0.03,
                                      }}
                                      className="relative group"
                                    >
                                      <div className="relative pr-8">
                                        <EntityDropdown
                                          ent={ent}
                                          onUpdate={handleUpdateEntity}
                                          onDelete={handleDeleteEntity}
                                          allEntities={entities}
                                        />
                                        <button
                                          type="button"
                                          className="absolute top-2 right-2 z-10 opacity-60 hover:opacity-100 transition-opacity bg-destructive/10 text-destructive rounded-full p-1 group-hover:opacity-100"
                                          title="Quitar de la selección"
                                          onClick={() =>
                                            setSelectedEntityIds((prev) =>
                                              prev.filter(
                                                (id) => id !== ent.id,
                                              ),
                                            )
                                          }
                                        >
                                          <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 20 20"
                                            fill="none"
                                          >
                                            <path
                                              d="M6 6l8 8M14 6l-8 8"
                                              stroke="currentColor"
                                              strokeWidth="2"
                                              strokeLinecap="round"
                                            />
                                          </svg>
                                        </button>
                                      </div>
                                    </motion.div>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
              {/* fin scroll único */}
            </motion.aside>
          ) : (
            // Botón flotante para abrir el panel
            <button
              onClick={() => setPropertiesOpen(true)}
              style={{
                position: "absolute",
                top: isMobileViewport ? "auto" : "9vh",
                bottom: isMobileViewport ? 16 : "auto",
                right: isMobileViewport ? 16 : 36,
                zIndex: 41,
                background: "var(--card)",
                border: "1.5px solid var(--border)",
                boxShadow:
                  "0 4px 16px color-mix(in oklch, var(--primary) 10%, transparent)",

                borderRadius: 18,
                width: isMobileViewport ? 44 : 48,
                height: isMobileViewport ? 44 : 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "box-shadow 0.15s, background 0.15s",
              }}
              aria-label="Abrir panel de propiedades"
            >
              <PanelRight size={28} className="text-primary" />
            </button>
          )}
        </AnimatePresence>
      </main>
      {/* Footer minimal exclusivo para dashboard */}
      <footer className="min-h-10 flex flex-col items-start justify-center gap-1 px-4 py-2 text-[11px] text-muted-foreground border-t border-border bg-card/60 sm:h-10 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-0 sm:text-xs">
        <div className="font-medium">Lautaro Octavio Faure</div>
        <div className="font-medium">Prueba técnica // Fanz</div>
      </footer>
      <ConfirmModal
        open={confirmDeleteOpen}
        title="Confirmar eliminación"
        description={`¿Seguro que querés eliminar ${confirmDeleteLabel}?`}
        confirmText="Eliminar"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
      {showTutorial && (
        <CanvasTutorial
          onDone={handleTutorialDone}
          isMobile={isMobileViewport}
        />
      )}
    </div>
  );
}

// Componente fuera de DashboardPage para cumplir reglas de hooks
const EntityDropdown = React.memo(function EntityDropdown({
  ent,
  onUpdate,
  onDelete,
  allEntities = [],
}: {
  ent: Entity;
  onUpdate: (id: string, updates: EntityUpdate) => void;
  onDelete: (id: string) => void;
  allEntities?: Entity[];
}) {
  const [open, setOpen] = React.useState(false);
  const entityType: EntityType = ent.type ?? "seat";

  // Handlers para actualizar el estado global
  const [localLabel, setLocalLabel] = React.useState(ent.label ?? "");
  React.useEffect(() => {
    setLocalLabel(ent.label ?? "");
  }, [ent.label]);
  const handleLabelBlur = () => {
    const trimmed = localLabel.trim();
    if (trimmed === "") {
      // Vacío: restaurar el label anterior
      setLocalLabel(ent.label ?? "");
    } else {
      onUpdate(ent.id, { label: trimmed });
    }
  };
  const handleXChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    onUpdate(ent.id, { x: Number(e.target.value) });
  const handleYChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    onUpdate(ent.id, { y: Number(e.target.value) });
  const handleRotationChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    onUpdate(ent.id, { rotation: Number(e.target.value) });
  const handleAreaWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextWidth = Number(e.target.value);
    if (!Number.isFinite(nextWidth)) return;
    const clampedWidth = Math.max(32, nextWidth);
    const shape = ent.areaShape ?? "rectangle";
    if (shape === "square" || shape === "circle") {
      onUpdate(ent.id, { areaWidth: clampedWidth, areaHeight: clampedWidth });
      return;
    }
    onUpdate(ent.id, { areaWidth: clampedWidth });
  };
  const handleAreaHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextHeight = Number(e.target.value);
    if (!Number.isFinite(nextHeight)) return;
    const clampedHeight = Math.max(32, nextHeight);
    const shape = ent.areaShape ?? "rectangle";
    if (shape === "square" || shape === "circle") {
      onUpdate(ent.id, { areaWidth: clampedHeight, areaHeight: clampedHeight });
      return;
    }
    onUpdate(ent.id, { areaHeight: clampedHeight });
  };
  const handleAreaShapeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextShape = e.target.value as AreaShape;
    const nextVectorPoints =
      nextShape === "circle"
        ? undefined
        : nextShape === "triangle"
          ? [
              { x: 0, y: -0.48 },
              { x: -0.46, y: 0.46 },
              { x: 0.46, y: 0.46 },
            ]
          : [
              { x: -0.5, y: -0.5 },
              { x: 0.5, y: -0.5 },
              { x: 0.5, y: 0.5 },
              { x: -0.5, y: 0.5 },
            ];

    if (nextShape === "square" || nextShape === "circle") {
      const side = Math.max(32, Math.min(areaWidth, areaHeight));
      onUpdate(ent.id, {
        areaShape: nextShape,
        areaWidth: side,
        areaHeight: side,
        areaVectorPoints: nextVectorPoints,
      });
      return;
    }

    if (nextShape === "rectangle") {
      const nextWidth = Math.max(32, areaWidth);
      const nextHeight =
        Math.abs(areaWidth - areaHeight) < 1
          ? Math.max(32, Math.round(nextWidth * 0.72))
          : Math.max(32, areaHeight);

      onUpdate(ent.id, {
        areaShape: nextShape,
        areaWidth: nextWidth,
        areaHeight: nextHeight,
        areaVectorPoints: nextVectorPoints,
      });
      return;
    }

    onUpdate(ent.id, {
      areaShape: nextShape,
      areaVectorPoints: nextVectorPoints,
    });
  };
  const handleAreaLockToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(ent.id, { areaLocked: e.target.checked });
  };
  const handleTableWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextWidth = Number(e.target.value);
    if (!Number.isFinite(nextWidth)) return;
    onUpdate(ent.id, { tableWidth: Math.max(32, nextWidth) });
  };
  const handleTableHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextHeight = Number(e.target.value);
    if (!Number.isFinite(nextHeight)) return;
    onUpdate(ent.id, { tableHeight: Math.max(24, nextHeight) });
  };
  const handleRowSeatCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextCount = Number(e.target.value);
    if (!Number.isFinite(nextCount)) return;
    onUpdate(ent.id, { rowSeatCount: Math.max(1, Math.round(nextCount)) });
  };
  const handleRowSeatSpacingChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const nextSpacing = Number(e.target.value);
    if (!Number.isFinite(nextSpacing)) return;
    const roundedSpacing = Math.round(nextSpacing);
    const clampedSpacing = Math.min(
      ROW_SEAT_SPACING_MAX,
      Math.max(ROW_SEAT_SPACING_MIN, roundedSpacing),
    );

    if (roundedSpacing !== clampedSpacing) {
      setRowSpacingFeedback(
        `La separación se ajustó al rango permitido (${ROW_SEAT_SPACING_MIN} - ${ROW_SEAT_SPACING_MAX}).`,
      );
    } else {
      setRowSpacingFeedback(null);
    }

    onUpdate(ent.id, { rowSeatSpacing: clampedSpacing });
  };
  const handleRowCurvatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextCurvature = Number(e.target.value);
    if (!Number.isFinite(nextCurvature)) return;
    const roundedCurvature = Math.round(nextCurvature);
    onUpdate(ent.id, {
      rowCurvature: Math.min(
        ROW_CURVATURE_MAX,
        Math.max(ROW_CURVATURE_MIN, roundedCurvature),
      ),
    });
  };
  const handleCircleSeatCountChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const nextCount = Number(e.target.value);
    if (!Number.isFinite(nextCount)) return;
    const nextCircleSeatMax = getCircleSeatMaxByRadius(circleSeatRadius);
    onUpdate(ent.id, {
      circleSeatCount: Math.min(
        nextCircleSeatMax,
        Math.max(CIRCLE_SEAT_COUNT_MIN, Math.round(nextCount)),
      ),
    });
  };
  const handleCircleSeatRadiusChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setCircleRadiusInput(e.target.value);
    setCircleRadiusFeedback(null);
  };
  const commitCircleSeatRadius = () => {
    const parsedRadius = Number(circleRadiusInput);
    if (!Number.isFinite(parsedRadius)) {
      setCircleRadiusInput(String(circleSeatRadius));
      return;
    }

    const roundedRadius = Math.round(parsedRadius);
    const clampedRadius = Math.min(
      CIRCLE_SEAT_RADIUS_MAX,
      Math.max(CIRCLE_SEAT_RADIUS_MIN, roundedRadius),
    );

    if (roundedRadius !== clampedRadius) {
      setCircleRadiusFeedback(
        `El radio se ajustó al rango permitido (${CIRCLE_SEAT_RADIUS_MIN} - ${CIRCLE_SEAT_RADIUS_MAX}).`,
      );
    } else {
      setCircleRadiusFeedback(null);
    }

    setCircleRadiusInput(String(clampedRadius));
    onUpdate(ent.id, { circleSeatRadius: clampedRadius });
  };
  const handleRectLayoutChange = (
    side: keyof RectTableLayout,
    value: number,
  ) => {
    if (!Number.isFinite(value)) return;
    const seatSize = getEntityRenderSize("seat");
    const currentTableWidth =
      typeof ent.tableWidth === "number"
        ? ent.tableWidth
        : getEntityRenderSize("table-rect");
    const currentTableHeight =
      typeof ent.tableHeight === "number"
        ? ent.tableHeight
        : Math.round(getEntityRenderSize("table-rect") * 0.55);
    const maxHorizontalSeats = Math.max(
      1,
      Math.floor(currentTableWidth / seatSize),
    );
    const maxVerticalSeats = Math.max(
      1,
      Math.floor(currentTableHeight / seatSize),
    );
    const maxForSide =
      side === "topSeats" || side === "bottomSeats"
        ? maxHorizontalSeats
        : maxVerticalSeats;

    const currentLayout: RectTableLayout = {
      topSeats: Math.max(1, ent.rectLayout?.topSeats ?? 3),
      bottomSeats: Math.max(1, ent.rectLayout?.bottomSeats ?? 3),
      leftSeats: Math.max(1, ent.rectLayout?.leftSeats ?? 1),
      rightSeats: Math.max(1, ent.rectLayout?.rightSeats ?? 1),
    };

    onUpdate(ent.id, {
      rectLayout: {
        ...currentLayout,
        [side]: Math.min(maxForSide, Math.max(1, Math.round(value))),
      },
    });
  };
  const canRotate =
    entityType === "seat" ||
    entityType === "row" ||
    entityType === "table-rect";
  const isSeat = entityType === "seat";
  const isArea = entityType === "area";
  const isRow = entityType === "row";
  const isCircleTable = entityType === "table-circle";
  const isRectTable = entityType === "table-rect";

  // Sillas hijas de esta mesa
  const childSeats = React.useMemo(
    () =>
      isCircleTable || isRectTable
        ? allEntities.filter((e) => e.parentId === ent.id)
        : [],
    [allEntities, ent.id, isCircleTable, isRectTable],
  );
  const [seatsOpen, setSeatsOpen] = React.useState(false);
  // Labels locales para las sillas hijas (para edición onBlur)
  const [seatLocalLabels, setSeatLocalLabels] = React.useState<
    Record<string, string>
  >(() => Object.fromEntries(childSeats.map((s) => [s.id, s.label ?? ""])));
  React.useEffect(() => {
    setSeatLocalLabels(
      Object.fromEntries(childSeats.map((s) => [s.id, s.label ?? ""])),
    );
  }, [childSeats]);
  const areaShape: AreaShape = ent.areaShape ?? "rectangle";
  const areaLocked = Boolean(ent.areaLocked);
  const areaWidth =
    typeof ent.areaWidth === "number" ? ent.areaWidth : ENTITY_GRID_SIZE * 4;
  const areaHeight =
    typeof ent.areaHeight === "number" ? ent.areaHeight : ENTITY_GRID_SIZE * 3;
  const tableWidth =
    typeof ent.tableWidth === "number"
      ? ent.tableWidth
      : getEntityRenderSize("table-rect");
  const tableHeight =
    typeof ent.tableHeight === "number"
      ? ent.tableHeight
      : Math.round(getEntityRenderSize("table-rect") * 0.55);
  const rectLayout: RectTableLayout = {
    topSeats: Math.max(1, ent.rectLayout?.topSeats ?? 3),
    bottomSeats: Math.max(1, ent.rectLayout?.bottomSeats ?? 3),
    leftSeats: Math.max(1, ent.rectLayout?.leftSeats ?? 1),
    rightSeats: Math.max(1, ent.rectLayout?.rightSeats ?? 1),
  };
  const rowSeatCount = Math.max(1, ent.rowSeatCount ?? 8);
  const rowSeatSpacing = Math.min(
    ROW_SEAT_SPACING_MAX,
    Math.max(ROW_SEAT_SPACING_MIN, ent.rowSeatSpacing ?? ENTITY_GRID_SIZE),
  );
  const rowCurvature = Math.min(
    ROW_CURVATURE_MAX,
    Math.max(ROW_CURVATURE_MIN, Math.round(ent.rowCurvature ?? 0)),
  );
  const circleSeatRadius = Math.min(
    CIRCLE_SEAT_RADIUS_MAX,
    Math.max(
      CIRCLE_SEAT_RADIUS_MIN,
      ent.circleSeatRadius ?? CIRCLE_SEAT_RADIUS_MIN,
    ),
  );
  const circleSeatMaxByRadius = getCircleSeatMaxByRadius(circleSeatRadius);
  const circleSeatCount = Math.min(
    circleSeatMaxByRadius,
    Math.max(CIRCLE_SEAT_COUNT_MIN, ent.circleSeatCount ?? 8),
  );
  const seatSize = getEntityRenderSize("seat");
  const maxHorizontalSeats = Math.max(1, Math.floor(tableWidth / seatSize));
  const maxVerticalSeats = Math.max(1, Math.floor(tableHeight / seatSize));
  const horizontalMaxTooltip =
    "Máximo según ancho de mesa: floor(ancho / tamaño de silla).";
  const verticalMaxTooltip =
    "Máximo según alto de mesa: floor(alto / tamaño de silla).";
  const [rowSpacingFeedback, setRowSpacingFeedback] = React.useState<
    string | null
  >(null);
  const [circleRadiusFeedback, setCircleRadiusFeedback] = React.useState<
    string | null
  >(null);
  const [circleRadiusInput, setCircleRadiusInput] = React.useState(
    String(circleSeatRadius),
  );
  // Color picker: solo guardar en undo/redo al finalizar
  const [tempColor, setTempColor] = React.useState(ent.color || "#2563eb");
  React.useEffect(() => {
    setTempColor(ent.color || "#2563eb");
  }, [ent.color]);
  React.useEffect(() => {
    setCircleRadiusInput(String(circleSeatRadius));
  }, [circleSeatRadius, ent.id]);
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempColor(e.target.value);
  };
  const handleColorCommit = () => {
    if (tempColor !== (ent.color || "#2563eb")) {
      onUpdate(ent.id, { color: tempColor });
    }
  };
  const handleResetRowDefaults = () => {
    if (!isRow) return;
    onUpdate(ent.id, {
      rowSeatCount: 8,
      rowSeatSpacing: ENTITY_GRID_SIZE,
      rowCurvature: 0,
      rotation: 0,
      color: "#2563eb",
    });
  };
  const handleResetSeatDefaults = () => {
    if (!isSeat) return;
    onUpdate(ent.id, {
      rotation: 0,
      color: "#2563eb",
    });
  };
  const handleResetCircleTableDefaults = () => {
    if (!isCircleTable) return;
    const defaultRadius = CIRCLE_SEAT_RADIUS_MIN;
    const defaultSeatCount = Math.min(
      8,
      getCircleSeatMaxByRadius(defaultRadius),
    );
    onUpdate(ent.id, {
      rotation: 0,
      color: "#2563eb",
      circleSeatRadius: defaultRadius,
      circleSeatCount: defaultSeatCount,
    });
  };
  const handleResetRectTableDefaults = () => {
    if (!isRectTable) return;
    onUpdate(ent.id, {
      rotation: 0,
      color: "#2563eb",
      tableWidth: getEntityRenderSize("table-rect"),
      tableHeight: Math.round(getEntityRenderSize("table-rect") * 0.55),
      rectLayout: {
        topSeats: 3,
        bottomSeats: 3,
        leftSeats: 1,
        rightSeats: 1,
      },
    });
  };

  return (
    <motion.div
      layout
      className={
        "rounded-xl border border-border overflow-auto bg-card/90 px-4 py-2 flex flex-col gap-2 transition hover:bg-muted/60 relative " +
        (open ? "ring-2 ring-primary/40" : "cursor-pointer")
      }
      onClick={() => !open && setOpen(true)}
    >
      {/* Header - siempre visible, tamaño fijo */}
      <div
        className="flex items-center gap-3 w-full"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <div className="flex items-center gap-2 min-w-[48px]">
          <EntityIcon type={entityType} />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <span
            className="text-xs font-semibold text-foreground break-words leading-snug max-h-[2.5em] overflow-hidden"
            style={{
              wordBreak: "break-word",
              whiteSpace: "normal",
              display: "block",
            }}
          >
            {ent.label || ent.id || "Sin ID"}
          </span>
          <span className="text-[11px] text-muted-foreground capitalize">
            {ent.type ? ent.type.replace("-", " ") : "silla"}
          </span>
        </div>
        <motion.div
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <ArrowRight size={22} className="ml-2 text-muted-foreground" />
        </motion.div>
      </div>

      {/* Contenido animado */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{
              opacity: { duration: 0.15 },
            }}
            style={{ overflow: "hidden" }}
            className="flex flex-col gap-5 bg-background/90 rounded-lg border border-border/40 px-3 pb-4 pt-3"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Identidad: Label */}
            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-1 text-xs font-semibold text-primary mb-0.5">
                <Tag size={15} className="text-primary" />
                Etiqueta
              </label>
              <input
                type="text"
                className="w-full px-2 py-1.5 rounded-md border border-border bg-card text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition placeholder:text-muted-foreground"
                value={localLabel}
                onChange={(e) => setLocalLabel(e.target.value)}
                onBlur={handleLabelBlur}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                placeholder="Ej: A-12"
                required
                maxLength={24}
              />
            </div>
            {/* Posicionamiento preciso */}
            <div className="flex gap-2">
              <div className="flex-1 flex flex-col items-start">
                <label className="flex items-center gap-1 text-[11px] font-semibold mb-1 text-muted-foreground">
                  <Move size={14} />X
                </label>
                <input
                  type="number"
                  className="w-full px-2 py-1 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-center"
                  value={ent.x}
                  onChange={handleXChange}
                  step={1}
                />
              </div>
              <div className="flex-1 flex flex-col items-start">
                <label className="flex items-center gap-1 text-[11px] font-semibold mb-1 text-muted-foreground">
                  <Move size={14} />Y
                </label>
                <input
                  type="number"
                  className="w-full px-2 py-1 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-center"
                  value={ent.y}
                  onChange={handleYChange}
                  step={1}
                />
              </div>
              {canRotate && (
                <div className="flex-1 flex flex-col items-start">
                  <label className="flex items-center gap-1 text-[11px] font-semibold mb-1 text-muted-foreground">
                    <RotateCcw size={14} />
                    Rot
                  </label>
                  <input
                    type="number"
                    className="w-full px-2 py-1 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-center"
                    value={ent.rotation || 0}
                    onChange={handleRotationChange}
                    step={1}
                    min={0}
                    max={359}
                  />
                </div>
              )}
            </div>
            {isArea && (
              <div className="flex flex-col gap-2">
                <label
                  className="inline-flex items-center justify-between gap-2 rounded-md border border-border bg-background/70 px-2 py-1.5"
                  title="Bloquea mover y editar forma/tamaño desde el canvas."
                >
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Bloquear edición en canvas
                  </span>
                  <span className="relative inline-flex items-center">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={areaLocked}
                      onChange={handleAreaLockToggle}
                    />
                    <span className="h-5 w-9 rounded-full bg-muted transition-colors peer-checked:bg-primary/80" />
                    <span className="pointer-events-none absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                  </span>
                </label>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">
                    Forma área
                  </label>
                  <select
                    className="w-full appearance-none px-3 py-2 rounded-md border border-border bg-card text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={areaShape}
                    onChange={handleAreaShapeChange}
                    title="Seleccioná la forma base del área"
                  >
                    <option value="rectangle">Rectangular</option>
                    <option value="circle">Circular</option>
                    <option value="square">Cuadrada</option>
                    <option value="triangle">Triangular</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      Ancho área
                    </label>
                    <input
                      type="number"
                      className="w-full px-2 py-1 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-center"
                      value={areaWidth}
                      onChange={handleAreaWidthChange}
                      step={1}
                      min={32}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      Alto área
                    </label>
                    <input
                      type="number"
                      className="w-full px-2 py-1 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-center"
                      value={areaHeight}
                      onChange={handleAreaHeightChange}
                      step={1}
                      min={32}
                    />
                  </div>
                </div>
              </div>
            )}
            {isRow && (
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">
                    Cantidad sillas
                  </label>
                  <input
                    type="number"
                    className="w-full px-2 py-1 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-center"
                    value={rowSeatCount}
                    onChange={handleRowSeatCountChange}
                    step={1}
                    min={1}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">
                    Separación
                  </label>
                  <input
                    type="number"
                    className="w-full px-2 py-1 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-center"
                    value={rowSeatSpacing}
                    onChange={handleRowSeatSpacingChange}
                    step={1}
                    min={ROW_SEAT_SPACING_MIN}
                    max={ROW_SEAT_SPACING_MAX}
                  />
                </div>
                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">
                    Curvatura
                  </label>
                  <input
                    type="number"
                    className="w-full px-2 py-1 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-center"
                    value={rowCurvature}
                    onChange={handleRowCurvatureChange}
                    step={1}
                    min={ROW_CURVATURE_MIN}
                    max={ROW_CURVATURE_MAX}
                  />
                </div>
                {rowSpacingFeedback && (
                  <div className="col-span-2 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
                    {rowSpacingFeedback}
                  </div>
                )}
              </div>
            )}
            {isCircleTable && (
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">
                    Cantidad sillas
                  </label>
                  <input
                    type="number"
                    className="w-full px-2 py-1 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-center"
                    value={circleSeatCount}
                    onChange={handleCircleSeatCountChange}
                    step={1}
                    min={CIRCLE_SEAT_COUNT_MIN}
                    max={circleSeatMaxByRadius}
                    title="Máximo según radio de mesa (circunferencia disponible)."
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">
                    Radio sillas
                  </label>
                  <input
                    type="number"
                    className="w-full px-2 py-1 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-center"
                    value={circleRadiusInput}
                    onChange={handleCircleSeatRadiusChange}
                    onBlur={commitCircleSeatRadius}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        commitCircleSeatRadius();
                      }
                    }}
                    step={1}
                    min={CIRCLE_SEAT_RADIUS_MIN}
                    max={CIRCLE_SEAT_RADIUS_MAX}
                  />
                </div>
                <div className="col-span-2 flex flex-wrap gap-2 pt-1">
                  <span
                    className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary"
                    title="El máximo de sillas se calcula por la circunferencia del radio actual."
                  >
                    Máximo actual de sillas: {circleSeatMaxByRadius}
                  </span>
                </div>
                {circleRadiusFeedback && (
                  <div className="col-span-2 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
                    {circleRadiusFeedback}
                  </div>
                )}
              </div>
            )}
            {isRectTable && (
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">
                    Ancho mesa
                  </label>
                  <input
                    type="number"
                    className="w-full px-2 py-1 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-center"
                    value={tableWidth}
                    onChange={handleTableWidthChange}
                    step={1}
                    min={32}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">
                    Alto mesa
                  </label>
                  <input
                    type="number"
                    className="w-full px-2 py-1 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-center"
                    value={tableHeight}
                    onChange={handleTableHeightChange}
                    step={1}
                    min={24}
                  />
                </div>
                <div className="col-span-2 grid grid-cols-2 gap-2 pt-1">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      Sillas arriba
                    </label>
                    <input
                      type="number"
                      className="w-full px-2 py-1 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-center"
                      value={rectLayout.topSeats}
                      onChange={(e) =>
                        handleRectLayoutChange(
                          "topSeats",
                          Number(e.target.value),
                        )
                      }
                      step={1}
                      min={1}
                      max={maxHorizontalSeats}
                      title={horizontalMaxTooltip}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      Sillas abajo
                    </label>
                    <input
                      type="number"
                      className="w-full px-2 py-1 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-center"
                      value={rectLayout.bottomSeats}
                      onChange={(e) =>
                        handleRectLayoutChange(
                          "bottomSeats",
                          Number(e.target.value),
                        )
                      }
                      step={1}
                      min={1}
                      max={maxHorizontalSeats}
                      title={horizontalMaxTooltip}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      Sillas izquierda
                    </label>
                    <input
                      type="number"
                      className="w-full px-2 py-1 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-center"
                      value={rectLayout.leftSeats}
                      onChange={(e) =>
                        handleRectLayoutChange(
                          "leftSeats",
                          Number(e.target.value),
                        )
                      }
                      step={1}
                      min={1}
                      max={maxVerticalSeats}
                      title={verticalMaxTooltip}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      Sillas derecha
                    </label>
                    <input
                      type="number"
                      className="w-full px-2 py-1 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-center"
                      value={rectLayout.rightSeats}
                      onChange={(e) =>
                        handleRectLayoutChange(
                          "rightSeats",
                          Number(e.target.value),
                        )
                      }
                      step={1}
                      min={1}
                      max={maxVerticalSeats}
                      title={verticalMaxTooltip}
                    />
                  </div>
                  <div className="col-span-2 flex flex-wrap gap-2 pt-1">
                    <span
                      className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary"
                      title={horizontalMaxTooltip}
                    >
                      Máximo arriba/abajo: {maxHorizontalSeats}
                    </span>
                    <span
                      className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary"
                      title={verticalMaxTooltip}
                    >
                      Máximo izquierda/derecha: {maxVerticalSeats}
                    </span>
                  </div>
                </div>
              </div>
            )}
            {/* ── Etiquetas de sillas de la mesa ─────── */}
            {(isCircleTable || isRectTable) && childSeats.length > 0 && (
              <div className="flex flex-col gap-1 pt-2 border-t border-border/40">
                <div
                  className="flex items-center gap-2 cursor-pointer select-none"
                  onClick={() => setSeatsOpen((v) => !v)}
                >
                  <motion.span
                    animate={{ rotate: seatsOpen ? 180 : 0 }}
                    className={
                      "w-5 h-5 flex items-center justify-center rounded transition " +
                      (seatsOpen
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground hover:bg-primary/10")
                    }
                  >
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                      <path
                        d="M6 8l4 4 4-4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </motion.span>
                  <span className="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-1">
                    <Tag size={13} className="text-primary" />
                    Sillas ({childSeats.length})
                  </span>
                </div>
                <AnimatePresence>
                  {seatsOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 28,
                      }}
                      style={{ overflow: "hidden" }}
                      className="flex flex-col gap-1.5 mt-1"
                    >
                      {childSeats.map((seat, idx) => (
                        <div key={seat.id} className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground font-medium w-5 text-right shrink-0">
                            {idx + 1}.
                          </span>
                          <input
                            type="text"
                            className="flex-1 px-2 py-1 rounded-md border border-border bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                            value={seatLocalLabels[seat.id] ?? seat.label ?? ""}
                            onChange={(e) =>
                              setSeatLocalLabels((prev) => ({
                                ...prev,
                                [seat.id]: e.target.value,
                              }))
                            }
                            onBlur={() => {
                              const trimmed = (
                                seatLocalLabels[seat.id] ?? ""
                              ).trim();
                              if (trimmed === "") {
                                setSeatLocalLabels((prev) => ({
                                  ...prev,
                                  [seat.id]: seat.label ?? "",
                                }));
                              } else {
                                onUpdate(seat.id, { label: trimmed });
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") e.currentTarget.blur();
                            }}
                            maxLength={32}
                          />
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            {/* Color picker mejorado */}
            <div className="flex items-center gap-3 mt-1">
              <Palette size={16} className="text-primary" />
              <div className="relative flex items-center gap-2">
                <input
                  type="color"
                  className="w-8 h-8 rounded-full border-2 border-border shadow-sm cursor-pointer transition hover:scale-105 focus:ring-2 focus:ring-primary/30"
                  value={tempColor}
                  onChange={handleColorChange}
                  onBlur={handleColorCommit}
                  onMouseUp={handleColorCommit}
                  style={{ background: "none" }}
                />
                <span
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none w-6 h-6 rounded-full border border-border"
                  style={{ background: tempColor, opacity: 0.15 }}
                ></span>
              </div>
              <span className="ml-2 text-xs font-mono text-muted-foreground select-all px-1 py-0.5 rounded bg-muted/60 border border-border">
                {tempColor.toUpperCase()}
              </span>
            </div>
            {/* Eliminar botón mejorado */}
            <div className="flex flex-col items-end gap-2 mt-2">
              <div className="flex gap-2">
                {isSeat && (
                  <button
                    className="px-3 py-1.5 rounded-md border border-border bg-transparent text-foreground font-semibold flex items-center gap-2 transition hover:bg-muted/70 hover:shadow focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs"
                    onClick={handleResetSeatDefaults}
                    type="button"
                    title="Restablecer valores por defecto de la silla"
                  >
                    <RotateCcw size={16} /> Restablecer silla
                  </button>
                )}
                {isRow && (
                  <button
                    className="px-3 py-1.5 rounded-md border border-border bg-transparent text-foreground font-semibold flex items-center gap-2 transition hover:bg-muted/70 hover:shadow focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs"
                    onClick={handleResetRowDefaults}
                    type="button"
                    title="Restablecer valores por defecto de la fila"
                  >
                    <RotateCcw size={16} /> Restablecer fila
                  </button>
                )}
                {isCircleTable && (
                  <button
                    className="px-3 py-1.5 rounded-md border border-border bg-transparent text-foreground font-semibold flex items-center gap-2 transition hover:bg-muted/70 hover:shadow focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs"
                    onClick={handleResetCircleTableDefaults}
                    type="button"
                    title="Restablecer valores por defecto de la mesa circular"
                  >
                    <RotateCcw size={16} /> Restablecer mesa circular
                  </button>
                )}
                {isRectTable && (
                  <button
                    className="px-3 py-1.5 rounded-md border border-border bg-transparent text-foreground font-semibold flex items-center gap-2 transition hover:bg-muted/70 hover:shadow focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs"
                    onClick={handleResetRectTableDefaults}
                    type="button"
                    title="Restablecer valores por defecto de la mesa rectangular"
                  >
                    <RotateCcw size={16} /> Restablecer mesa rectangular
                  </button>
                )}
              </div>
              <button
                className="px-3 py-1.5 rounded-md border border-destructive bg-transparent text-destructive font-semibold flex items-center gap-2 transition hover:bg-destructive/10 hover:shadow focus:outline-none focus:ring-2 focus:ring-destructive/30 text-xs"
                onClick={() => onDelete(ent.id)}
                type="button"
              >
                <Trash2 size={16} /> Eliminar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
