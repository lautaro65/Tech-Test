"use client";
import React, { useState, useRef } from "react";
import toast from "react-hot-toast";
import {
  RotateCw,
  FlipHorizontal,
  Trash2,
  Plus,
  Minus,
  MoveHorizontal,
  MoveDiagonal2,
} from "lucide-react";
import type { MouseEvent } from "react";
import ConfirmModal from "./ConfirmModal";
import {
  ENTITY_GRID_SIZE,
  type AreaShape,
  type Entity,
  type SidebarTool,
  getEntityType,
  getEntityRenderSize,
  createEntitiesFromTool,
  hasAnyEntityCollision,
  getSelectableEntityId,
  expandSelectionWithRowChildren,
  getRowChildren,
} from "./entities";
import {
  applyAreaAssociations,
  clampAreaVectorCoord,
  getAreaRenderDimensions,
  getDefaultAreaVectorPoints,
  getAreaVectorPoints,
} from "./areaAssociations";

type EntitiesStateUpdater = React.SetStateAction<Entity[]>;
type SetEntitiesFn = ((updaterOrValue: EntitiesStateUpdater) => void) & {
  withHistory?: (updaterOrValue: EntitiesStateUpdater) => void;
};

type Point = { x: number; y: number };
type AreaResizeHandle =
  | "bottom-right"
  | "top-left"
  | "top-right"
  | "bottom-left";
type SnapLines = {
  x: number | null;
  y: number | null;
  xPerfect: boolean;
  yPerfect: boolean;
};

const SNAP_TOL_SCREEN = 6;
const MAX_ERROR_TOASTS = 2;
const COLLISION_ERROR_MESSAGE =
  "No se puede poner un elemento sobre otro elemento";
const ROW_CURVATURE_MIN = -120;
const ROW_CURVATURE_MAX = 120;

type ConfirmDialogState = {
  open: boolean;
  title: string;
  description: string;
  confirmText: string;
  destructive: boolean;
};

const CLOSED_CONFIRM_DIALOG: ConfirmDialogState = {
  open: false,
  title: "",
  description: "",
  confirmText: "",
  destructive: true,
};

const getEmptySnapLines = (): SnapLines => ({
  x: null,
  y: null,
  xPerfect: false,
  yPerfect: false,
});

const getNextZoom = (currentZoom: number, delta: number) => {
  return Math.max(0.2, Math.min(2, +(currentZoom + delta).toFixed(2)));
};

const normalizeRotation = (rotation: number) => ((rotation % 360) + 360) % 360;

const snapValueToGrid = (value: number, gridSize: number) => {
  return (
    Math.round((value - gridSize / 2) / gridSize) * gridSize + gridSize / 2
  );
};

const getDistributedOffsets = (count: number, span: number) => {
  if (count <= 1) return [0];
  const step = span / (count - 1);
  return Array.from({ length: count }, (_, index) => -span / 2 + step * index);
};

const getAreaClipPath = (entity: Entity) => {
  const shape = entity.areaShape ?? "rectangle";
  if (shape === "circle") return undefined;

  const points = getAreaVectorPoints(entity);
  if (points.length < 3) return undefined;

  return `polygon(${points
    .map((point) => `${(point.x + 0.5) * 100}% ${(point.y + 0.5) * 100}%`)
    .join(", ")})`;
};

const getCanvasCoordsFromEvent = (
  e: MouseEvent | PointerEvent | React.MouseEvent | React.PointerEvent,
  canvasElement: HTMLDivElement | null,
  offset: Point,
  zoom: number,
): Point => {
  if (!canvasElement) return { x: 0, y: 0 };
  const rect = canvasElement.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left - offset.x) / zoom,
    y: (e.clientY - rect.top - offset.y) / zoom,
  };
};

const calculateSnapLines = (
  refPoint: Point,
  entities: Entity[],
  selectedIds: string[],
  zoom: number,
): SnapLines => {
  const snapTolerance = SNAP_TOL_SCREEN / zoom;
  let snapX: number | null = null;
  let snapY: number | null = null;
  let xPerfect = false;
  let yPerfect = false;

  for (const entity of entities) {
    if (selectedIds.includes(entity.id)) continue;
    if (Math.abs(entity.x - refPoint.x) < snapTolerance) snapX = entity.x;
    if (Math.abs(entity.y - refPoint.y) < snapTolerance) snapY = entity.y;
    if (Math.abs(entity.x - refPoint.x) < 0.5) xPerfect = true;
    if (Math.abs(entity.y - refPoint.y) < 0.5) yPerfect = true;
  }

  return { x: snapX, y: snapY, xPerfect, yPerfect };
};

const pushCollisionToast = (
  errorToastIds: React.MutableRefObject<string[]>,
) => {
  if (errorToastIds.current.length >= MAX_ERROR_TOASTS) return;
  const id = toast.error(COLLISION_ERROR_MESSAGE, {
    duration: 2000,
    id: `error-${Date.now()}-${Math.random()}`,
  });
  errorToastIds.current.push(id);
  setTimeout(() => {
    errorToastIds.current = errorToastIds.current.filter((tid) => tid !== id);
  }, 2100);
};

const getEntityHalfSize = (entity: Entity) => {
  const type = getEntityType(entity);

  if (type === "table-rect") {
    const width =
      typeof entity.tableWidth === "number"
        ? entity.tableWidth
        : getEntityRenderSize(type);
    const height =
      typeof entity.tableHeight === "number"
        ? entity.tableHeight
        : Math.round(getEntityRenderSize(type) * 0.55);
    return { halfWidth: width / 2, halfHeight: height / 2 };
  }

  if (type === "area") {
    const { width, height } = getAreaRenderDimensions(entity);
    return { halfWidth: width / 2, halfHeight: height / 2 };
  }

  const size = getEntityRenderSize(type);
  return { halfWidth: size / 2, halfHeight: size / 2 };
};

const getHexColorWithAlpha = (color: string, alphaHex: string) => {
  const normalized = color.trim();
  const shortHexMatch = /^#([0-9a-fA-F]{3})$/.exec(normalized);
  if (shortHexMatch) {
    const expanded = shortHexMatch[1]
      .split("")
      .map((char) => `${char}${char}`)
      .join("");
    return `#${expanded}${alphaHex}`;
  }

  const longHexMatch = /^#([0-9a-fA-F]{6})$/.exec(normalized);
  if (longHexMatch) {
    return `${normalized}${alphaHex}`;
  }

  return normalized;
};

const isEditableTarget = (element: Element | null) => {
  if (!element) return false;
  const htmlElement = element as HTMLElement;
  const tagName = htmlElement.tagName;
  return (
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT" ||
    htmlElement.isContentEditable ||
    htmlElement.getAttribute("contenteditable") === "true"
  );
};

const isPointInsideEntityBounds = (x: number, y: number, entity: Entity) => {
  const { halfWidth, halfHeight } = getEntityHalfSize(entity);
  if (halfWidth <= 0 || halfHeight <= 0) return false;

  const rotationRad = ((entity.rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(rotationRad);
  const sin = Math.sin(rotationRad);
  const dx = x - entity.x;
  const dy = y - entity.y;
  const localX = dx * cos + dy * sin;
  const localY = -dx * sin + dy * cos;

  return Math.abs(localX) <= halfWidth && Math.abs(localY) <= halfHeight;
};

const getCircleTableCoreSize = (entity: Entity) => {
  const baseSize = getEntityRenderSize("table-circle");
  const seatRadius =
    typeof entity.circleSeatRadius === "number"
      ? entity.circleSeatRadius
      : CIRCLE_TABLE_RADIUS_MIN;

  const radiusGrowth = Math.pow(
    Math.max(seatRadius, CIRCLE_TABLE_RADIUS_MIN),
    0.9,
  );
  const baseGrowth = Math.pow(CIRCLE_TABLE_RADIUS_MIN, 0.9);
  const normalizedGrowth = radiusGrowth - baseGrowth;
  const sharpLowRadiusProgress = Math.max(
    0,
    Math.min(
      1,
      (seatRadius - CIRCLE_TABLE_RADIUS_MIN) /
        (CIRCLE_TABLE_RADIUS_EXTRA_SHRINK_THRESHOLD - CIRCLE_TABLE_RADIUS_MIN),
    ),
  );
  const lowRadiusFactor =
    seatRadius <= CIRCLE_TABLE_RADIUS_EXTRA_SHRINK_THRESHOLD
      ? 0.08 + 0.52 * Math.pow(sharpLowRadiusProgress, 1.55)
      : seatRadius <= CIRCLE_TABLE_RADIUS_SHRINK_THRESHOLD
        ? 0.6 +
          0.3 *
            ((seatRadius - CIRCLE_TABLE_RADIUS_EXTRA_SHRINK_THRESHOLD) /
              (CIRCLE_TABLE_RADIUS_SHRINK_THRESHOLD -
                CIRCLE_TABLE_RADIUS_EXTRA_SHRINK_THRESHOLD))
        : 1;
  const extraLowRadiusShrink =
    seatRadius <= CIRCLE_TABLE_RADIUS_EXTRA_SHRINK_THRESHOLD
      ? (1 - sharpLowRadiusProgress) * 8
      : 0;
  const coreSize =
    baseSize + normalizedGrowth * 1.35 * lowRadiusFactor - extraLowRadiusShrink;
  const minCoreSize = Math.max(16, Math.round(baseSize * 0.65));

  return Math.max(minCoreSize, Math.min(240, Math.round(coreSize)));
};

const CIRCLE_TABLE_RADIUS_MIN = 50;
const CIRCLE_TABLE_RADIUS_MAX = 320;
const CIRCLE_SEAT_COUNT_MIN = 2;
const CIRCLE_SEAT_COUNT_MAX = 48;
const CIRCLE_TABLE_RADIUS_EXTRA_SHRINK_THRESHOLD = 55;
const CIRCLE_TABLE_RADIUS_SHRINK_THRESHOLD = 60;

const getCircleSeatMaxByRadius = (radius: number) => {
  const seatSize = getEntityRenderSize("seat");
  const circumference = 2 * Math.PI * radius;
  const capacity = Math.floor(circumference / seatSize);

  return Math.max(
    CIRCLE_SEAT_COUNT_MIN,
    Math.min(CIRCLE_SEAT_COUNT_MAX, capacity),
  );
};

const getOverlapResolutionVector = (moved: Entity, fixed: Entity) => {
  const movedSize = getEntityHalfSize(moved);
  const fixedSize = getEntityHalfSize(fixed);

  const dx = moved.x - fixed.x;
  const dy = moved.y - fixed.y;

  const overlapX = movedSize.halfWidth + fixedSize.halfWidth - Math.abs(dx);
  const overlapY = movedSize.halfHeight + fixedSize.halfHeight - Math.abs(dy);

  if (overlapX <= 0 || overlapY <= 0) return null;

  if (overlapX <= overlapY) {
    return { x: dx >= 0 ? 1 : -1, y: 0 };
  }

  return { x: 0, y: dy >= 0 ? 1 : -1 };
};

const getOverlapDepth = (first: Entity, second: Entity) => {
  const firstSize = getEntityHalfSize(first);
  const secondSize = getEntityHalfSize(second);

  const dx = Math.abs(first.x - second.x);
  const dy = Math.abs(first.y - second.y);
  const overlapX = firstSize.halfWidth + secondSize.halfWidth - dx;
  const overlapY = firstSize.halfHeight + secondSize.halfHeight - dy;

  if (overlapX <= 0 || overlapY <= 0) return null;
  return { overlapX, overlapY };
};

const getPreferredCollisionVector = (
  movedCandidates: Entity[],
  fixedEntities: Entity[],
  anchorId: string,
) => {
  const orderedMoved = [
    ...movedCandidates.filter((entity) => entity.id === anchorId),
    ...movedCandidates.filter((entity) => entity.id !== anchorId),
  ];

  let best: {
    vector: { x: number; y: number };
    anchorPriority: number;
    pairDistance: number;
    primaryDepth: number;
    secondaryDepth: number;
  } | null = null;

  for (const moved of orderedMoved) {
    for (const fixed of fixedEntities) {
      if (!hasAnyEntityCollision([moved], [fixed])) continue;
      const depth = getOverlapDepth(moved, fixed);
      if (!depth) continue;

      const vector = getOverlapResolutionVector(moved, fixed);
      if (!vector) continue;

      const candidate = {
        vector,
        anchorPriority: moved.id === anchorId ? 1 : 0,
        pairDistance: Math.hypot(moved.x - fixed.x, moved.y - fixed.y),
        primaryDepth: Math.min(depth.overlapX, depth.overlapY),
        secondaryDepth: Math.max(depth.overlapX, depth.overlapY),
      };

      if (!best) {
        best = candidate;
        continue;
      }

      if (candidate.anchorPriority !== best.anchorPriority) {
        if (candidate.anchorPriority > best.anchorPriority) {
          best = candidate;
        }
        continue;
      }

      if (candidate.pairDistance !== best.pairDistance) {
        if (candidate.pairDistance < best.pairDistance) {
          best = candidate;
        }
        continue;
      }

      if (candidate.primaryDepth !== best.primaryDepth) {
        if (candidate.primaryDepth > best.primaryDepth) {
          best = candidate;
        }
        continue;
      }

      if (candidate.secondaryDepth > best.secondaryDepth) {
        best = candidate;
      }
    }
  }

  return best?.vector ?? null;
};

const getRectTableSeatRotationBySide = (
  seatX: number,
  seatY: number,
  tableX: number,
  tableY: number,
  tableRotationDeg = 0,
  tableWidth = getEntityRenderSize("table-rect"),
  tableHeight = Math.round(getEntityRenderSize("table-rect") * 0.55),
) => {
  const rotationRad = (tableRotationDeg * Math.PI) / 180;
  const cos = Math.cos(rotationRad);
  const sin = Math.sin(rotationRad);
  const dx = seatX - tableX;
  const dy = seatY - tableY;
  const localX = dx * cos + dy * sin;
  const localY = -dx * sin + dy * cos;

  const halfWidth = Math.max(1, tableWidth / 2);
  const halfHeight = Math.max(1, tableHeight / 2);
  const normalizedX = Math.abs(localX) / halfWidth;
  const normalizedY = Math.abs(localY) / halfHeight;

  const localRotation =
    normalizedX >= normalizedY
      ? localX >= 0
        ? 90
        : 270
      : localY >= 0
        ? 180
        : 0;

  return normalizeRotation(localRotation + tableRotationDeg);
};

function* spiralOffsets(
  step = ENTITY_GRID_SIZE,
  maxRadius = ENTITY_GRID_SIZE * 10,
) {
  yield [0, 0] as const;
  for (let radius = step; radius <= maxRadius; radius += step) {
    for (let dx = -radius; dx <= radius; dx += step) {
      yield [dx, -radius] as const;
      yield [dx, radius] as const;
    }
    for (let dy = -radius + step; dy <= radius - step; dy += step) {
      yield [-radius, dy] as const;
      yield [radius, dy] as const;
    }
  }
}

// Canvas con cuadrícula y zoom
interface CanvasProps {
  mouseMode: "select" | "pan" | "delete";
  sidebarTool?: SidebarTool;
  setSidebarTool?: (tool: SidebarTool) => void;
  entities: Entity[];
  setEntities: SetEntitiesFn;
  selectedEntityIds: string[];
  hideCanvasFooterActions?: boolean;
  hideCanvasTopControls?: boolean;
  showGrid?: boolean;
  onToggleGrid?: () => void;
  zoom?: number;
  onZoomChange?: (nextZoom: number) => void;
  hideCanvasHistoryControls?: boolean;
  readOnly?: boolean;
}

function GridSVG({
  zoom,
  offset,
}: {
  zoom: number;
  offset: { x: number; y: number };
}) {
  // Tamaño de celda de la cuadrícula
  const baseGridSize = ENTITY_GRID_SIZE;
  const gridSize = baseGridSize * zoom; // Escala con el zoom
  const width = 2000;
  const height = 1200;
  // Offset para que la cuadrícula se mueva con el pan y el zoom
  const xOffset = (offset.x * zoom) % gridSize;
  const yOffset = (offset.y * zoom) % gridSize;
  const linesX = [];
  const linesY = [];
  for (let x = xOffset; x < width; x += gridSize) {
    linesX.push(
      <line
        key={x}
        x1={x}
        y1={0}
        x2={x}
        y2={height}
        stroke="var(--border)"
        strokeWidth={1}
      />,
    );
  }

  for (let y = yOffset; y < height; y += gridSize) {
    linesY.push(
      <line
        key={y}
        x1={0}
        y1={y}
        x2={width}
        y2={y}
        stroke="var(--border)"
        strokeWidth={1}
      />,
    );
  }
  return (
    <svg
      width={width}
      height={height}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        zIndex: 1,
        pointerEvents: "none",
      }}
    >
      {linesX}
      {linesY}
    </svg>
  );
}
export default function Canvas({
  mouseMode,
  sidebarTool,
  setSidebarTool,
  entities,
  setEntities,
  selectedEntityIds,
  hideCanvasFooterActions = false,
  hideCanvasTopControls = false,
  showGrid,
  onToggleGrid,
  zoom: zoomProp,
  onZoomChange,
  hideCanvasHistoryControls = false,
  readOnly = false,
  onSelectionChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: CanvasProps & {
  onSelectionChange?: (ids: string[]) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}) {
  // Permitir setEntitiesWithHistory si está disponible (para guardar en historial solo en onMouseUp)
  // Si setEntities tiene una propiedad originalSetEntities, la usamos para mutaciones internas
  const setEntitiesWithHistory = setEntities.withHistory ?? setEntities;
  const [zoomLocal, setZoomLocal] = useState(1);
  const zoom = typeof zoomProp === "number" ? zoomProp : zoomLocal;
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [showGridLocal, setShowGridLocal] = useState(true);
  const isGridVisible = showGrid ?? showGridLocal;
  const toggleGridVisibility =
    onToggleGrid ?? (() => setShowGridLocal((g) => !g));
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const renderEntitySvg = (entity: Entity) => {
    const color = entity.color || "#2563eb";
    const type = getEntityType(entity);
    const renderSize = getEntityRenderSize(type);

    if (type === "row") {
      return (
        <svg
          width={renderSize}
          height={renderSize}
          viewBox="0 0 28 28"
          fill="none"
        >
          <rect x="4" y="7" width="20" height="3" rx="1.5" fill={color} />
          <rect x="4" y="13" width="20" height="3" rx="1.5" fill={color} />
          <rect x="4" y="19" width="20" height="3" rx="1.5" fill={color} />
        </svg>
      );
    }

    if (type === "table-circle") {
      const coreSize = getCircleTableCoreSize(entity);
      const markerLength = Math.max(5, Math.round(coreSize * 0.16));
      const markerThickness = Math.max(2, Math.round(coreSize * 0.07));

      return (
        <div
          style={{
            width: coreSize,
            height: coreSize,
            borderRadius: "50%",
            background: getHexColorWithAlpha(color, "1F"),
            border: `2px solid ${color}`,
            boxSizing: "border-box",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: markerLength,
              height: markerThickness,
              borderRadius: 999,
              background: color,
              top: Math.max(2, Math.round(coreSize * 0.16)),
              left: "50%",
              transform: "translateX(-50%)",
            }}
          />
          <div
            style={{
              width: Math.max(8, Math.round(coreSize * 0.2)),
              height: Math.max(8, Math.round(coreSize * 0.2)),
              borderRadius: "50%",
              background: color,
              opacity: 0.7,
            }}
          />
        </div>
      );
    }

    if (type === "table-rect") {
      const tableWidth =
        typeof entity.tableWidth === "number"
          ? entity.tableWidth
          : getEntityRenderSize(type);
      const tableHeight =
        typeof entity.tableHeight === "number"
          ? entity.tableHeight
          : Math.round(getEntityRenderSize(type) * 0.55);

      return (
        <div
          style={{
            width: tableWidth,
            height: tableHeight,
            borderRadius: 8,
            background: getHexColorWithAlpha(color, "24"),
            border: `2.2px solid ${color}`,
            boxSizing: "border-box",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -5,
              left: "50%",
              transform: "translateX(-50%)",
              width: Math.max(22, tableWidth * 0.45),
              height: 3,
              borderRadius: 999,
              background: color,
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -5,
              left: "50%",
              transform: "translateX(-50%)",
              width: Math.max(22, tableWidth * 0.45),
              height: 3,
              borderRadius: 999,
              background: color,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: -5,
              top: "50%",
              transform: "translateY(-50%)",
              width: 3,
              height: Math.max(18, tableHeight * 0.45),
              borderRadius: 999,
              background: color,
            }}
          />
          <div
            style={{
              position: "absolute",
              right: -5,
              top: "50%",
              transform: "translateY(-50%)",
              width: 3,
              height: Math.max(18, tableHeight * 0.45),
              borderRadius: 999,
              background: color,
            }}
          />
        </div>
      );
    }

    if (type === "area") {
      const areaShape = entity.areaShape ?? "rectangle";
      const { width: areaWidth, height: areaHeight } =
        getAreaRenderDimensions(entity);
      const areaClipPath = getAreaClipPath(entity);
      const areaBackground = getHexColorWithAlpha(color, "1A");
      const areaBorder = getHexColorWithAlpha(color, "D1");

      return (
        <div
          style={{
            width: areaWidth,
            height: areaHeight,
            borderRadius: areaShape === "circle" ? "50%" : 0,
            background: areaBackground,
            border: `2px dashed ${areaBorder}`,
            clipPath: areaClipPath,
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        />
      );
    }

    return (
      <svg
        width={renderSize}
        height={renderSize}
        viewBox="0 0 28 28"
        fill="none"
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
  };

  // Estado local para drag: si está activo, se renderiza entitiesLocal, sino entities global
  const [entitiesLocal, setEntitiesLocal] = useState<Entity[] | null>(null);
  const canvasEntities = entitiesLocal ?? entities;
  // setCanvasEntities solo muta el estado local durante drag, setEntitiesWithHistory solo al soltar
  const setCanvasEntities = (updater: EntitiesStateUpdater) => {
    setEntitiesLocal((prev) => {
      if (typeof updater === "function") {
        return updater(prev ?? entities);
      } else {
        return updater;
      }
    });
  };

  // Estado para mostrar el menú contextual
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  // Estado para drag de entidad
  const [draggingEntityId, setDraggingEntityId] = useState<string | null>(null);
  const [rotatingRowId, setRotatingRowId] = useState<string | null>(null);
  const [rotatingRectTableId, setRotatingRectTableId] = useState<string | null>(
    null,
  );
  const [rotatingSeatId, setRotatingSeatId] = useState<string | null>(null);
  const [resizingCircleTableId, setResizingCircleTableId] = useState<
    string | null
  >(null);
  const [resizingAreaId, setResizingAreaId] = useState<string | null>(null);
  const [editingAreaVectorPoint, setEditingAreaVectorPoint] = useState<{
    areaId: string;
    pointIndex: number;
  } | null>(null);
  const rotatingRowStart = useRef<{
    rowId: string;
    center: Point;
    baseAngle: number;
    rowBaseRotation: number;
    affectedIds: Set<string>;
    snapshotById: Map<string, Entity>;
  } | null>(null);
  const rotatingRowDidChange = useRef(false);
  const rotatingRectTableStart = useRef<{
    tableId: string;
    center: Point;
    baseAngle: number;
    tableBaseRotation: number;
    affectedIds: Set<string>;
    snapshotById: Map<string, Entity>;
  } | null>(null);
  const rotatingRectTableDidChange = useRef(false);
  const rotatingSeatStart = useRef<{
    seatId: string;
    center: Point;
    baseAngle: number;
    baseRotation: number;
  } | null>(null);
  const rotatingSeatDidChange = useRef(false);
  const resizingCircleTableStart = useRef<{
    tableId: string;
    center: Point;
  } | null>(null);
  const resizingCircleTableDidChange = useRef(false);
  const resizingAreaStart = useRef<{
    areaId: string;
    center: Point;
    baseRotationDeg: number;
    axisX: Point;
    axisY: Point;
    oppositeCornerWorld: Point;
    activeSignX: -1 | 1;
    activeSignY: -1 | 1;
  } | null>(null);
  const resizingAreaDidChange = useRef(false);
  const editingAreaVectorPointDidChange = useRef(false);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  // Guardar la posición original al iniciar drag
  const originalEntityPos = useRef<{ x: number; y: number } | null>(null);
  // Estado para snap lines
  const [snapLines, setSnapLines] = useState<{
    x: number | null;
    y: number | null;
    xPerfect: boolean;
    yPerfect: boolean;
  }>(getEmptySnapLines());
  const [isSelectingArea, setIsSelectingArea] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [selectionRect, setSelectionRect] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  // Usar selectedEntityIds y notificar cambios al padre
  const selectedCanvasEntityIds = selectedEntityIds;
  // setSelectedCanvasEntityIds solo acepta arrays, no función updater
  const setSelectedCanvasEntityIds = React.useCallback(
    (ids: string[]) => {
      if (onSelectionChange) onSelectionChange(ids);
    },
    [onSelectionChange],
  );

  // Ya no es necesario notificar entidades seleccionadas, solo ids
  const groupDragStart = useRef<{ [id: string]: { x: number; y: number } }>({});
  const [isShiftDown, setIsShiftDown] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isCoarsePointerDevice, setIsCoarsePointerDevice] = useState(false);
  const lastPointerTypeRef = useRef<"mouse" | "touch" | "pen" | null>(null);
  const lastAreaTapRef = useRef<{ areaId: string; timestamp: number } | null>(
    null,
  );
  const focusCanvas = React.useCallback(() => {
    canvasRef.current?.focus();
  }, []);
  const ignoreNextCanvasDeselectClick = useRef(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(
    CLOSED_CONFIRM_DIALOG,
  );
  const confirmActionRef = useRef<(() => void) | null>(null);
  const selectedIdsWithRowChildren = React.useMemo(
    () =>
      expandSelectionWithRowChildren(selectedCanvasEntityIds, canvasEntities),
    [canvasEntities, selectedCanvasEntityIds],
  );
  const entityById = React.useMemo(
    () => new Map(canvasEntities.map((entity) => [entity.id, entity])),
    [canvasEntities],
  );
  const selectedAreaIds = React.useMemo(() => {
    const ids = new Set<string>();
    selectedCanvasEntityIds.forEach((id) => {
      const entity = entityById.get(id);
      if (entity && getEntityType(entity) === "area") {
        ids.add(entity.id);
      }
    });
    return ids;
  }, [entityById, selectedCanvasEntityIds]);
  const layeredCanvasEntities = React.useMemo(() => {
    const areas = canvasEntities.filter(
      (entity) => getEntityType(entity) === "area",
    );
    const rest = canvasEntities.filter(
      (entity) => getEntityType(entity) !== "area",
    );
    return [...areas, ...rest];
  }, [canvasEntities]);
  const confirmDialogOpenRef = useRef(confirmDialog.open);
  const menuPosRef = useRef(menuPos);
  const editingAreaVectorPointRef = useRef(editingAreaVectorPoint);
  const canvasEntitiesRef = useRef(canvasEntities);
  const selectedCanvasEntityIdsRef = useRef(selectedCanvasEntityIds);
  const selectedIdsWithRowChildrenRef = useRef(selectedIdsWithRowChildren);

  React.useEffect(() => {
    confirmDialogOpenRef.current = confirmDialog.open;
    menuPosRef.current = menuPos;
    editingAreaVectorPointRef.current = editingAreaVectorPoint;
    canvasEntitiesRef.current = canvasEntities;
    selectedCanvasEntityIdsRef.current = selectedCanvasEntityIds;
    selectedIdsWithRowChildrenRef.current = selectedIdsWithRowChildren;
  }, [
    confirmDialog.open,
    menuPos,
    editingAreaVectorPoint,
    canvasEntities,
    selectedCanvasEntityIds,
    selectedIdsWithRowChildren,
  ]);

  React.useEffect(() => {
    setMenuPos((prev) => {
      if (!prev) return prev;
      if (selectedCanvasEntityIds.length === 0) return null;

      const anchorEntityId = getSelectableEntityId(
        selectedCanvasEntityIds[0],
        canvasEntities,
      );
      const anchorEntity = entityById.get(anchorEntityId);
      if (!anchorEntity) return null;

      const nextPos = { x: anchorEntity.x, y: anchorEntity.y + 40 };
      if (prev.x === nextPos.x && prev.y === nextPos.y) {
        return prev;
      }
      return nextPos;
    });
  }, [canvasEntities, entityById, selectedCanvasEntityIds]);

  const openDeleteConfirm = React.useCallback(
    (
      options: {
        title: string;
        description: string;
        confirmText?: string;
        destructive?: boolean;
      },
      onConfirm: () => void,
    ) => {
      confirmActionRef.current = onConfirm;
      setConfirmDialog({
        open: true,
        title: options.title,
        description: options.description,
        confirmText: options.confirmText ?? "Eliminar",
        destructive: options.destructive ?? true,
      });
    },
    [],
  );

  const handleConfirmDelete = React.useCallback(() => {
    const action = confirmActionRef.current;
    confirmActionRef.current = null;
    setConfirmDialog(CLOSED_CONFIRM_DIALOG);
    action?.();
  }, []);

  const handleCancelDelete = React.useCallback(() => {
    confirmActionRef.current = null;
    setConfirmDialog(CLOSED_CONFIRM_DIALOG);
  }, []);
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") setIsShiftDown(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") setIsShiftDown(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
    const anyCoarsePointerQuery = window.matchMedia("(any-pointer: coarse)");
    const hoverNoneQuery = window.matchMedia("(hover: none)");

    const updatePointerCapability = () => {
      setIsCoarsePointerDevice(
        coarsePointerQuery.matches ||
          anyCoarsePointerQuery.matches ||
          hoverNoneQuery.matches,
      );
    };

    updatePointerCapability();

    const addChangeListener = (query: MediaQueryList) => {
      if (typeof query.addEventListener === "function") {
        query.addEventListener("change", updatePointerCapability);
        return () =>
          query.removeEventListener("change", updatePointerCapability);
      }

      query.addListener(updatePointerCapability);
      return () => query.removeListener(updatePointerCapability);
    };

    const cleanups = [
      addChangeListener(coarsePointerQuery),
      addChangeListener(anyCoarsePointerQuery),
      addChangeListener(hoverNoneQuery),
    ];

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);
  const baseGridSize = ENTITY_GRID_SIZE;
  // El snapToGrid debe alinear al centro de la celda base, igual que la cuadrícula visual
  function snapToGrid(val: number) {
    return snapValueToGrid(val, baseGridSize);
  }

  // Manejar zoom in/out
  const handleZoom = (delta: number) => {
    const next = getNextZoom(zoom, delta);
    if (onZoomChange) {
      onZoomChange(next);
      return;
    }
    setZoomLocal(next);
  };

  const markPointerInteraction = React.useCallback(
    (event: React.PointerEvent | PointerEvent | null | undefined) => {
      if (!event) return;
      const pointerType = event.pointerType;
      if (
        pointerType === "mouse" ||
        pointerType === "touch" ||
        pointerType === "pen"
      ) {
        lastPointerTypeRef.current = pointerType;
      }
    },
    [],
  );

  const isTouchLikeInteraction = React.useCallback(
    (event?: React.MouseEvent | React.PointerEvent) => {
      const nativeEvent = event?.nativeEvent as
        | (MouseEvent & {
            pointerType?: string;
            sourceCapabilities?: { firesTouchEvents?: boolean };
          })
        | undefined;

      const pointerType =
        nativeEvent?.pointerType ?? lastPointerTypeRef.current ?? null;

      if (pointerType === "touch" || pointerType === "pen") {
        return true;
      }

      if (nativeEvent?.sourceCapabilities?.firesTouchEvents) {
        return true;
      }

      return isCoarsePointerDevice;
    },
    [isCoarsePointerDevice],
  );

  const handleNonMousePointer = React.useCallback(
    (
      event: React.PointerEvent,
      callback: (normalizedEvent: React.MouseEvent) => void,
    ) => {
      markPointerInteraction(event);
      if (event.pointerType === "mouse") return;
      callback(event as unknown as React.MouseEvent);
    },
    [markPointerInteraction],
  );

  // Pan: mouse drag para mover el canvas
  const handleMouseDown = (e: React.MouseEvent) => {
    if (mouseMode === "pan") {
      setDragging(true);
      lastPos.current = { x: e.clientX, y: e.clientY };
    }
  };
  const clipboardEntities = useRef<Entity[] | null>(null);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (mouseMode === "pan" && dragging && lastPos.current) {
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPos.current = { x: e.clientX, y: e.clientY };
    }

    if (mouseMode === "select" && rotatingRowId && rotatingRowStart.current) {
      const rotationState = rotatingRowStart.current;
      const { x: mouseX, y: mouseY } = getCanvasCoords(e);
      const currentAngle = Math.atan2(
        mouseY - rotationState.center.y,
        mouseX - rotationState.center.x,
      );
      const deltaAngle = currentAngle - rotationState.baseAngle;
      const deltaRotation = (deltaAngle * 180) / Math.PI;

      if (!Number.isFinite(deltaRotation)) return;
      if (Math.abs(deltaRotation) > 0.1) {
        rotatingRowDidChange.current = true;
      }

      const cosAngle = Math.cos(deltaAngle);
      const sinAngle = Math.sin(deltaAngle);

      setCanvasEntities((prev) =>
        prev.map((entity) => {
          if (!rotationState.affectedIds.has(entity.id)) return entity;

          const snapshot = rotationState.snapshotById.get(entity.id);
          if (!snapshot) return entity;

          if (entity.id === rotationState.rowId) {
            return {
              ...entity,
              rotation: normalizeRotation(
                rotationState.rowBaseRotation + deltaRotation,
              ),
            };
          }

          const dx = snapshot.x - rotationState.center.x;
          const dy = snapshot.y - rotationState.center.y;
          const rotatedX =
            rotationState.center.x + dx * cosAngle - dy * sinAngle;
          const rotatedY =
            rotationState.center.y + dx * sinAngle + dy * cosAngle;

          return {
            ...entity,
            x: rotatedX,
            y: rotatedY,
            rotation: normalizeRotation(
              (snapshot.rotation || 0) + deltaRotation,
            ),
          };
        }),
      );

      return;
    }

    if (
      mouseMode === "select" &&
      resizingCircleTableId &&
      resizingCircleTableStart.current
    ) {
      const resizeState = resizingCircleTableStart.current;
      const { x: mouseX, y: mouseY } = getCanvasCoords(e);

      setCanvasEntities((prev) => {
        const tableEntity = prev.find(
          (entity) =>
            entity.id === resizeState.tableId &&
            getEntityType(entity) === "table-circle",
        );
        if (!tableEntity) return prev;

        const currentRadius = Math.min(
          CIRCLE_TABLE_RADIUS_MAX,
          Math.max(
            CIRCLE_TABLE_RADIUS_MIN,
            typeof tableEntity.circleSeatRadius === "number"
              ? tableEntity.circleSeatRadius
              : CIRCLE_TABLE_RADIUS_MIN,
          ),
        );
        const nextRadius = Math.min(
          CIRCLE_TABLE_RADIUS_MAX,
          Math.max(
            CIRCLE_TABLE_RADIUS_MIN,
            Math.round(
              Math.hypot(
                mouseX - resizeState.center.x,
                mouseY - resizeState.center.y,
              ),
            ),
          ),
        );

        if (nextRadius === currentRadius) return prev;
        resizingCircleTableDidChange.current = true;

        const existingChildren = prev.filter(
          (entity) =>
            getEntityType(entity) === "seat" &&
            entity.parentId === resizeState.tableId,
        );
        const currentSeatCount = Math.min(
          getCircleSeatMaxByRadius(currentRadius),
          Math.max(
            CIRCLE_SEAT_COUNT_MIN,
            Math.round(
              typeof tableEntity.circleSeatCount === "number"
                ? tableEntity.circleSeatCount
                : existingChildren.length > 0
                  ? existingChildren.length
                  : 8,
            ),
          ),
        );
        const nextSeatCount = Math.min(
          getCircleSeatMaxByRadius(nextRadius),
          currentSeatCount,
        );

        const nextChildren = Array.from(
          { length: nextSeatCount },
          (_, index) => {
            const existingChild = existingChildren[index];
            const angle = (index / nextSeatCount) * Math.PI * 2;
            const childX = tableEntity.x + Math.cos(angle) * nextRadius;
            const childY = tableEntity.y + Math.sin(angle) * nextRadius;

            return {
              ...(existingChild ?? {
                id: `seat-${Date.now()}-${Math.random()}-${index}`,
                type: "seat" as const,
                parentId: resizeState.tableId,
              }),
              label: `${tableEntity.label} - Silla ${index + 1}`,
              x: childX,
              y: childY,
              color: existingChild?.color ?? tableEntity.color ?? "#2563eb",
              parentId: resizeState.tableId,
              type: "seat" as const,
            };
          },
        );

        const nextTableEntity: Entity = {
          ...tableEntity,
          circleSeatCount: nextSeatCount,
          circleSeatRadius: nextRadius,
        };

        const nextEntities = prev.filter(
          (entity) =>
            entity.id !== resizeState.tableId &&
            entity.parentId !== resizeState.tableId,
        );

        return [...nextEntities, nextTableEntity, ...nextChildren];
      });

      return;
    }

    if (mouseMode === "select" && resizingAreaId && resizingAreaStart.current) {
      const resizeState = resizingAreaStart.current;
      const { x: mouseX, y: mouseY } = getCanvasCoords(e);

      setCanvasEntities((prev) =>
        prev.map((entity) => {
          if (
            entity.id !== resizeState.areaId ||
            getEntityType(entity) !== "area"
          ) {
            return entity;
          }

          const shape = entity.areaShape ?? "rectangle";
          const baseWidth =
            typeof entity.areaWidth === "number"
              ? entity.areaWidth
              : ENTITY_GRID_SIZE * 4;
          const baseHeight =
            typeof entity.areaHeight === "number"
              ? entity.areaHeight
              : ENTITY_GRID_SIZE * 3;

          const vectorFromOpposite = {
            x: mouseX - resizeState.oppositeCornerWorld.x,
            y: mouseY - resizeState.oppositeCornerWorld.y,
          };
          const projectedX =
            vectorFromOpposite.x * resizeState.axisX.x +
            vectorFromOpposite.y * resizeState.axisX.y;
          const projectedY =
            vectorFromOpposite.x * resizeState.axisY.x +
            vectorFromOpposite.y * resizeState.axisY.y;

          const draftWidth = Math.max(
            32,
            Math.round(resizeState.activeSignX * projectedX),
          );
          const draftHeight = Math.max(
            32,
            Math.round(resizeState.activeSignY * projectedY),
          );

          let nextWidth = draftWidth;
          let nextHeight = draftHeight;

          if (shape === "square" || shape === "circle") {
            const side = Math.max(
              32,
              Math.round(Math.max(draftWidth, draftHeight)),
            );
            nextWidth = side;
            nextHeight = side;
          }

          if (nextWidth === baseWidth && nextHeight === baseHeight) {
            return entity;
          }

          const activeCornerOffset = {
            x: resizeState.axisX.x * resizeState.activeSignX * nextWidth,
            y: resizeState.axisX.y * resizeState.activeSignX * nextWidth,
          };
          const verticalOffset = {
            x: resizeState.axisY.x * resizeState.activeSignY * nextHeight,
            y: resizeState.axisY.y * resizeState.activeSignY * nextHeight,
          };

          const nextCenter = {
            x:
              resizeState.oppositeCornerWorld.x +
              (activeCornerOffset.x + verticalOffset.x) / 2,
            y:
              resizeState.oppositeCornerWorld.y +
              (activeCornerOffset.y + verticalOffset.y) / 2,
          };

          resizingAreaDidChange.current = true;
          return {
            ...entity,
            x: nextCenter.x,
            y: nextCenter.y,
            areaWidth: nextWidth,
            areaHeight: nextHeight,
          };
        }),
      );

      return;
    }

    if (mouseMode === "select" && editingAreaVectorPoint) {
      const { x: mouseX, y: mouseY } = getCanvasCoords(e);

      setCanvasEntities((prev) =>
        prev.map((entity) => {
          if (
            entity.id !== editingAreaVectorPoint.areaId ||
            getEntityType(entity) !== "area"
          ) {
            return entity;
          }

          const shape = entity.areaShape ?? "rectangle";
          if (shape === "circle") return entity;

          const baseWidth =
            typeof entity.areaWidth === "number"
              ? entity.areaWidth
              : ENTITY_GRID_SIZE * 4;
          const baseHeight =
            typeof entity.areaHeight === "number"
              ? entity.areaHeight
              : ENTITY_GRID_SIZE * 3;
          const renderWidth = baseWidth;
          const renderHeight = baseHeight;

          const dx = mouseX - entity.x;
          const dy = mouseY - entity.y;
          const rotationRad = ((entity.rotation || 0) * Math.PI) / 180;
          const cos = Math.cos(rotationRad);
          const sin = Math.sin(rotationRad);
          const localX = dx * cos + dy * sin;
          const localY = -dx * sin + dy * cos;

          const nextPointX = clampAreaVectorCoord(localX / renderWidth);
          const nextPointY = clampAreaVectorCoord(localY / renderHeight);
          const currentPoints = getAreaVectorPoints(entity);
          const nextPoints = currentPoints.map((point, index) =>
            index === editingAreaVectorPoint.pointIndex
              ? { x: nextPointX, y: nextPointY }
              : point,
          );
          const targetPoint = currentPoints[editingAreaVectorPoint.pointIndex];

          if (
            targetPoint &&
            Math.abs(targetPoint.x - nextPointX) < 0.0005 &&
            Math.abs(targetPoint.y - nextPointY) < 0.0005
          ) {
            return entity;
          }

          editingAreaVectorPointDidChange.current = true;
          return {
            ...entity,
            areaVectorPoints: nextPoints,
          };
        }),
      );

      return;
    }

    if (
      mouseMode === "select" &&
      rotatingRectTableId &&
      rotatingRectTableStart.current
    ) {
      const rotationState = rotatingRectTableStart.current;
      const { x: mouseX, y: mouseY } = getCanvasCoords(e);
      const currentAngle = Math.atan2(
        mouseY - rotationState.center.y,
        mouseX - rotationState.center.x,
      );
      const deltaAngle = currentAngle - rotationState.baseAngle;
      const deltaRotation = (deltaAngle * 180) / Math.PI;

      if (!Number.isFinite(deltaRotation)) return;
      if (Math.abs(deltaRotation) > 0.1) {
        rotatingRectTableDidChange.current = true;
      }

      const cosAngle = Math.cos(deltaAngle);
      const sinAngle = Math.sin(deltaAngle);

      setCanvasEntities((prev) =>
        prev.map((entity) => {
          if (!rotationState.affectedIds.has(entity.id)) return entity;

          const snapshot = rotationState.snapshotById.get(entity.id);
          if (!snapshot) return entity;

          if (entity.id === rotationState.tableId) {
            return {
              ...entity,
              rotation: normalizeRotation(
                rotationState.tableBaseRotation + deltaRotation,
              ),
            };
          }

          const dx = snapshot.x - rotationState.center.x;
          const dy = snapshot.y - rotationState.center.y;
          const rotatedX =
            rotationState.center.x + dx * cosAngle - dy * sinAngle;
          const rotatedY =
            rotationState.center.y + dx * sinAngle + dy * cosAngle;

          return {
            ...entity,
            x: rotatedX,
            y: rotatedY,
            rotation:
              getEntityType(snapshot) === "seat"
                ? getRectTableSeatRotationBySide(
                    rotatedX,
                    rotatedY,
                    rotationState.center.x,
                    rotationState.center.y,
                    normalizeRotation(
                      rotationState.tableBaseRotation + deltaRotation,
                    ),
                    typeof rotationState.snapshotById.get(rotationState.tableId)
                      ?.tableWidth === "number"
                      ? (rotationState.snapshotById.get(rotationState.tableId)
                          ?.tableWidth as number)
                      : getEntityRenderSize("table-rect"),
                    typeof rotationState.snapshotById.get(rotationState.tableId)
                      ?.tableHeight === "number"
                      ? (rotationState.snapshotById.get(rotationState.tableId)
                          ?.tableHeight as number)
                      : Math.round(getEntityRenderSize("table-rect") * 0.55),
                  )
                : normalizeRotation((snapshot.rotation || 0) + deltaRotation),
          };
        }),
      );

      return;
    }

    if (mouseMode === "select" && rotatingSeatId && rotatingSeatStart.current) {
      const rotationState = rotatingSeatStart.current;
      const { x: mouseX, y: mouseY } = getCanvasCoords(e);
      const currentAngle = Math.atan2(
        mouseY - rotationState.center.y,
        mouseX - rotationState.center.x,
      );
      const deltaAngle = currentAngle - rotationState.baseAngle;
      const deltaRotation = (deltaAngle * 180) / Math.PI;

      if (!Number.isFinite(deltaRotation)) return;
      if (Math.abs(deltaRotation) > 0.1) {
        rotatingSeatDidChange.current = true;
      }

      setCanvasEntities((prev) =>
        prev.map((entity) => {
          if (entity.id !== rotationState.seatId) return entity;
          return {
            ...entity,
            rotation: normalizeRotation(
              rotationState.baseRotation + deltaRotation,
            ),
          };
        }),
      );

      return;
    }

    // Drag de entidad seleccionada o grupo
    if (mouseMode === "select" && draggingEntityId) {
      // Usar siempre getCanvasCoords para obtener la posición del mouse relativa al canvas base
      const { x: mouseX, y: mouseY } = getCanvasCoords(e);
      const x = mouseX - dragOffset.current.x;
      const y = mouseY - dragOffset.current.y;

      if (
        selectedIdsWithRowChildren.length > 1 &&
        groupDragStart.current[draggingEntityId]
      ) {
        // Drag grupal (solo local)
        setCanvasEntities((prev) =>
          prev.map((s) =>
            selectedIdsWithRowChildren.includes(s.id)
              ? {
                  ...s,
                  x:
                    groupDragStart.current[s.id].x +
                    (x - groupDragStart.current[draggingEntityId].x),
                  y:
                    groupDragStart.current[s.id].y +
                    (y - groupDragStart.current[draggingEntityId].y),
                }
              : s,
          ),
        );
      } else {
        // Drag individual (solo local)
        setCanvasEntities((prev) =>
          prev.map((s) => (s.id === draggingEntityId ? { ...s, x, y } : s)),
        );
      }

      setMenuPos({ x, y: y + 40 });

      setSnapLines(
        calculateSnapLines(
          { x, y },
          canvasEntities,
          selectedIdsWithRowChildren,
          zoom,
        ),
      );
    } else {
      // Si no se está draggeando, limpiar snap lines
      setSnapLines(getEmptySnapLines());
    }
  };

  const handleMouseUp = () => {
    if (mouseMode === "pan") {
      setDragging(false);
      lastPos.current = null;
    }
    // Finalizar drag de entidad
    if (draggingEntityId) {
      // Limpiar snap lines al soltar
      setSnapLines(getEmptySnapLines());

      const movedIds =
        selectedIdsWithRowChildren.length > 0
          ? selectedIdsWithRowChildren
          : [draggingEntityId];

      let newEntities = canvasEntities;
      const isTouchDragRelease =
        lastPointerTypeRef.current === "touch" ||
        lastPointerTypeRef.current === "pen";
      const shouldSnapToGridOnRelease =
        isShiftDown ||
        (isGridVisible && (isTouchDragRelease || isCoarsePointerDevice));

      if (shouldSnapToGridOnRelease) {
        const movedIdSet = new Set(movedIds);
        const movingEntities = canvasEntities.filter((entity) =>
          movedIdSet.has(entity.id),
        );
        const anchorEntity =
          movingEntities.find((entity) => entity.id === draggingEntityId) ??
          movingEntities[0];

        if (anchorEntity) {
          const deltaX = snapToGrid(anchorEntity.x) - anchorEntity.x;
          const deltaY = snapToGrid(anchorEntity.y) - anchorEntity.y;

          newEntities = canvasEntities.map((entity) => {
            if (!movedIdSet.has(entity.id)) return entity;
            return {
              ...entity,
              x: entity.x + deltaX,
              y: entity.y + deltaY,
            };
          });
        }
      }
      // Validar colisión al soltar (sobre todo el conjunto movido, no solo una entidad)

      const movedCandidates = newEntities.filter((entity) =>
        movedIds.includes(entity.id),
      );
      const fixedEntities = newEntities.filter(
        (entity) => !movedIds.includes(entity.id),
      );

      if (
        movedCandidates.length > 0 &&
        hasAnyEntityCollision(movedCandidates, fixedEntities)
      ) {
        pushCollisionToast(errorToastIds);

        let resolvedEntities = movedCandidates;
        let foundPlacement = false;
        const shouldSnapAfterCollision = movedCandidates.some((entity) => {
          const type = getEntityType(entity);
          return (
            type === "row" || type === "table-circle" || type === "table-rect"
          );
        });
        const collisionSearchStep =
          shouldSnapToGridOnRelease || shouldSnapAfterCollision
            ? baseGridSize
            : baseGridSize / 2;
        const collisionSearchMaxRadius = baseGridSize * 8;
        const snapGroupByAnchor = (group: Entity[]) => {
          if (!shouldSnapAfterCollision) return group;

          const anchor =
            group.find((entity) => entity.id === draggingEntityId) ?? group[0];
          if (!anchor) return group;

          const deltaX = snapToGrid(anchor.x) - anchor.x;
          const deltaY = snapToGrid(anchor.y) - anchor.y;
          if (deltaX === 0 && deltaY === 0) return group;

          return group.map((entity) => ({
            ...entity,
            x: entity.x + deltaX,
            y: entity.y + deltaY,
          }));
        };
        const baseCandidates = shouldSnapAfterCollision
          ? snapGroupByAnchor(movedCandidates)
          : movedCandidates;

        if (!hasAnyEntityCollision(baseCandidates, fixedEntities)) {
          resolvedEntities = baseCandidates;
          foundPlacement = true;
        }

        const movedAnchor = movedCandidates.find(
          (entity) => entity.id === draggingEntityId,
        );
        const anchorStart = groupDragStart.current[draggingEntityId] ?? null;

        let preferredDx =
          movedAnchor && anchorStart ? movedAnchor.x - anchorStart.x : 0;
        let preferredDy =
          movedAnchor && anchorStart ? movedAnchor.y - anchorStart.y : 0;

        const overlapPreferred = getPreferredCollisionVector(
          movedCandidates,
          fixedEntities,
          draggingEntityId,
        );

        if (overlapPreferred) {
          preferredDx = overlapPreferred.x;
          preferredDy = overlapPreferred.y;
        }

        if (Math.hypot(preferredDx, preferredDy) < 0.01) {
          preferredDx = 1;
          preferredDy = 0;
        }

        const dominantHorizontal =
          Math.abs(preferredDx) >= Math.abs(preferredDy);
        const primarySign = dominantHorizontal
          ? preferredDx >= 0
            ? 1
            : -1
          : preferredDy >= 0
            ? 1
            : -1;

        const candidateOffsets = Array.from(
          spiralOffsets(collisionSearchStep, collisionSearchMaxRadius),
        ).filter(([dx, dy]) => !(dx === 0 && dy === 0));

        candidateOffsets.sort(([adx, ady], [bdx, bdy]) => {
          const aDist = Math.hypot(adx, ady);
          const bDist = Math.hypot(bdx, bdy);

          const aPrimaryAxis = dominantHorizontal
            ? ady === 0 && Math.sign(adx) === primarySign
            : adx === 0 && Math.sign(ady) === primarySign;
          const bPrimaryAxis = dominantHorizontal
            ? bdy === 0 && Math.sign(bdx) === primarySign
            : bdx === 0 && Math.sign(bdy) === primarySign;
          if (aPrimaryAxis !== bPrimaryAxis) return aPrimaryAxis ? -1 : 1;

          const aForward = dominantHorizontal
            ? Math.sign(adx) === primarySign
            : Math.sign(ady) === primarySign;
          const bForward = dominantHorizontal
            ? Math.sign(bdx) === primarySign
            : Math.sign(bdy) === primarySign;
          if (aForward !== bForward) return aForward ? -1 : 1;

          if (aDist !== bDist) return aDist - bDist;

          const aLateral = dominantHorizontal ? Math.abs(ady) : Math.abs(adx);
          const bLateral = dominantHorizontal ? Math.abs(bdy) : Math.abs(bdx);
          if (aLateral !== bLateral) return aLateral - bLateral;

          return 0;
        });

        for (const [dx, dy] of candidateOffsets) {
          if (foundPlacement) break;

          const shiftedCandidates = baseCandidates.map((entity) => ({
            ...entity,
            x: entity.x + dx,
            y: entity.y + dy,
          }));

          if (hasAnyEntityCollision(shiftedCandidates, fixedEntities)) {
            continue;
          }

          const finalCandidates = shouldSnapAfterCollision
            ? snapGroupByAnchor(shiftedCandidates)
            : shiftedCandidates;

          if (!hasAnyEntityCollision(finalCandidates, fixedEntities)) {
            resolvedEntities = finalCandidates;
            foundPlacement = true;
            break;
          }
        }

        if (foundPlacement) {
          const movedById = new Map(
            resolvedEntities.map((entity) => [entity.id, entity]),
          );
          newEntities = newEntities.map((entity) => {
            const moved = movedById.get(entity.id);
            return moved ? moved : entity;
          });
        } else {
          // Si no encuentra hueco cercano, vuelve a la posición inicial del drag
          newEntities = newEntities.map((entity) => {
            if (!movedIds.includes(entity.id)) return entity;
            const start = groupDragStart.current[entity.id];
            if (!start) return entity;
            return { ...entity, x: start.x, y: start.y };
          });
        }
      }
      // Guardar el nuevo estado SOLO al soltar (en historial si está disponible)
      setEntitiesWithHistory(() => applyAreaAssociations(newEntities));
      setEntitiesLocal(null); // Limpiar estado local
      setDraggingEntityId(null);
      originalEntityPos.current = null;
    }

    if (rotatingRowId) {
      rotatingRowStart.current = null;
      const didChange = rotatingRowDidChange.current;
      rotatingRowDidChange.current = false;
      setRotatingRowId(null);

      if (didChange) {
        const nextEntities = canvasEntities;
        setEntitiesWithHistory(() => applyAreaAssociations(nextEntities));
      }

      setEntitiesLocal(null);
    }

    if (rotatingRectTableId) {
      rotatingRectTableStart.current = null;
      const didChange = rotatingRectTableDidChange.current;
      rotatingRectTableDidChange.current = false;
      setRotatingRectTableId(null);

      if (didChange) {
        const nextEntities = canvasEntities;
        setEntitiesWithHistory(() => applyAreaAssociations(nextEntities));
      }

      setEntitiesLocal(null);
    }

    if (rotatingSeatId) {
      rotatingSeatStart.current = null;
      const didChange = rotatingSeatDidChange.current;
      rotatingSeatDidChange.current = false;
      setRotatingSeatId(null);

      if (didChange) {
        const nextEntities = canvasEntities;
        setEntitiesWithHistory(() => nextEntities);
      }

      setEntitiesLocal(null);
    }

    if (resizingCircleTableId) {
      resizingCircleTableStart.current = null;
      const didChange = resizingCircleTableDidChange.current;
      resizingCircleTableDidChange.current = false;
      setResizingCircleTableId(null);

      if (didChange) {
        const nextEntities = canvasEntities;
        setEntitiesWithHistory(() => nextEntities);
      }

      setEntitiesLocal(null);
    }

    if (resizingAreaId) {
      resizingAreaStart.current = null;
      const didChange = resizingAreaDidChange.current;
      resizingAreaDidChange.current = false;
      setResizingAreaId(null);

      if (didChange) {
        const nextEntities = canvasEntities;
        setEntitiesWithHistory(() => applyAreaAssociations(nextEntities));
      }

      setEntitiesLocal(null);
    }

    if (editingAreaVectorPoint) {
      const didChange = editingAreaVectorPointDidChange.current;
      editingAreaVectorPointDidChange.current = false;
      setEditingAreaVectorPoint(null);

      if (didChange) {
        const nextEntities = canvasEntities;
        setEntitiesWithHistory(() => applyAreaAssociations(nextEntities));
      }

      setEntitiesLocal(null);
    }
  };
  // Handler para iniciar drag de entidad
  const handleEntityMouseDown = (
    e: React.MouseEvent,
    entityId: string,
    entity: Entity,
  ) => {
    const selectableEntityId = getSelectableEntityId(entityId, canvasEntities);
    const dragEntity =
      canvasEntities.find((item) => item.id === selectableEntityId) ?? entity;
    if (getEntityType(dragEntity) === "area" && dragEntity.areaLocked) {
      return;
    }

    if (
      mouseMode === "select" &&
      selectedCanvasEntityIds.includes(selectableEntityId)
    ) {
      e.stopPropagation();
      setDraggingEntityId(selectableEntityId);

      // Guarda la posición inicial de todas las seleccionadas
      const start: { [id: string]: { x: number; y: number } } = {};
      canvasEntities.forEach((s) => {
        if (selectedIdsWithRowChildren.includes(s.id))
          start[s.id] = { x: s.x, y: s.y };
      });
      groupDragStart.current = start;

      // Offset para el drag principal
      // Usar getCanvasCoords para obtener mouseX/mouseY base
      const { x: mouseX, y: mouseY } = getCanvasCoords(e);
      dragOffset.current = {
        x: mouseX - dragEntity.x,
        y: mouseY - dragEntity.y,
      };
      originalEntityPos.current = { x: dragEntity.x, y: dragEntity.y };
    }
  };

  const handleRowRotateHandleMouseDown = (
    e: React.MouseEvent,
    rowEntity: Entity,
  ) => {
    if (mouseMode !== "select") return;

    e.preventDefault();
    e.stopPropagation();

    const { x: mouseX, y: mouseY } = getCanvasCoords(e);
    const rowChildren = getRowChildren(rowEntity.id, canvasEntities);
    const affectedIds = new Set([
      rowEntity.id,
      ...rowChildren.map((child) => child.id),
    ]);
    const snapshotById = new Map<string, Entity>();

    canvasEntities.forEach((entity) => {
      if (affectedIds.has(entity.id)) {
        snapshotById.set(entity.id, entity);
      }
    });

    rotatingRowStart.current = {
      rowId: rowEntity.id,
      center: { x: rowEntity.x, y: rowEntity.y },
      baseAngle: Math.atan2(mouseY - rowEntity.y, mouseX - rowEntity.x),
      rowBaseRotation: rowEntity.rotation || 0,
      affectedIds,
      snapshotById,
    };
    rotatingRowDidChange.current = false;
    setDraggingEntityId(null);
    setRotatingRowId(rowEntity.id);
  };

  const handleSeatRotateHandleMouseDown = (
    e: React.MouseEvent,
    seatEntity: Entity,
  ) => {
    if (mouseMode !== "select") return;

    e.preventDefault();
    e.stopPropagation();

    const { x: mouseX, y: mouseY } = getCanvasCoords(e);
    rotatingSeatStart.current = {
      seatId: seatEntity.id,
      center: { x: seatEntity.x, y: seatEntity.y },
      baseAngle: Math.atan2(mouseY - seatEntity.y, mouseX - seatEntity.x),
      baseRotation: seatEntity.rotation || 0,
    };

    rotatingSeatDidChange.current = false;
    setDraggingEntityId(null);
    setRotatingRowId(null);
    rotatingRowStart.current = null;
    setRotatingSeatId(seatEntity.id);
  };

  const handleRectTableRotateHandleMouseDown = (
    e: React.MouseEvent,
    tableEntity: Entity,
  ) => {
    if (mouseMode !== "select") return;

    e.preventDefault();
    e.stopPropagation();

    const { x: mouseX, y: mouseY } = getCanvasCoords(e);
    const tableChildren = canvasEntities.filter(
      (entity) => entity.parentId === tableEntity.id,
    );
    const affectedIds = new Set([
      tableEntity.id,
      ...tableChildren.map((child) => child.id),
    ]);
    const snapshotById = new Map<string, Entity>();

    canvasEntities.forEach((entity) => {
      if (affectedIds.has(entity.id)) {
        snapshotById.set(entity.id, entity);
      }
    });

    rotatingRectTableStart.current = {
      tableId: tableEntity.id,
      center: { x: tableEntity.x, y: tableEntity.y },
      baseAngle: Math.atan2(mouseY - tableEntity.y, mouseX - tableEntity.x),
      tableBaseRotation: tableEntity.rotation || 0,
      affectedIds,
      snapshotById,
    };
    rotatingRectTableDidChange.current = false;
    setDraggingEntityId(null);
    setRotatingRowId(null);
    rotatingRowStart.current = null;
    setRotatingSeatId(null);
    rotatingSeatStart.current = null;
    setRotatingRectTableId(tableEntity.id);
  };

  const handleCircleTableRadiusHandleMouseDown = (
    e: React.MouseEvent,
    tableEntity: Entity,
  ) => {
    if (mouseMode !== "select") return;

    e.preventDefault();
    e.stopPropagation();

    resizingCircleTableStart.current = {
      tableId: tableEntity.id,
      center: { x: tableEntity.x, y: tableEntity.y },
    };
    resizingCircleTableDidChange.current = false;
    setDraggingEntityId(null);
    setRotatingRowId(null);
    rotatingRowStart.current = null;
    setRotatingSeatId(null);
    rotatingSeatStart.current = null;
    setRotatingRectTableId(null);
    rotatingRectTableStart.current = null;
    setEditingAreaVectorPoint(null);
    setResizingCircleTableId(tableEntity.id);
  };

  const handleAreaResizeHandleMouseDown = (
    e: React.MouseEvent,
    areaEntity: Entity,
    handle: AreaResizeHandle,
  ) => {
    if (mouseMode !== "select") return;
    if (areaEntity.areaLocked) return;

    e.preventDefault();
    e.stopPropagation();

    const areaShape = areaEntity.areaShape ?? "rectangle";
    const baseWidthRaw =
      typeof areaEntity.areaWidth === "number"
        ? areaEntity.areaWidth
        : ENTITY_GRID_SIZE * 4;
    const baseHeightRaw =
      typeof areaEntity.areaHeight === "number"
        ? areaEntity.areaHeight
        : ENTITY_GRID_SIZE * 3;
    const baseSide = Math.min(baseWidthRaw, baseHeightRaw);
    const baseWidth =
      areaShape === "square" || areaShape === "circle"
        ? baseSide
        : baseWidthRaw;
    const baseHeight =
      areaShape === "square" || areaShape === "circle"
        ? baseSide
        : baseHeightRaw;
    const handleSigns: Record<AreaResizeHandle, { x: -1 | 1; y: -1 | 1 }> = {
      "bottom-right": { x: 1, y: 1 },
      "top-left": { x: -1, y: -1 },
      "top-right": { x: 1, y: -1 },
      "bottom-left": { x: -1, y: 1 },
    };
    const activeSignX: -1 | 1 = handleSigns[handle].x;
    const activeSignY: -1 | 1 = handleSigns[handle].y;
    const oppositeSignX: -1 | 1 = activeSignX === 1 ? -1 : 1;
    const oppositeSignY: -1 | 1 = activeSignY === 1 ? -1 : 1;
    const rotationRad = ((areaEntity.rotation || 0) * Math.PI) / 180;
    const axisX = { x: Math.cos(rotationRad), y: Math.sin(rotationRad) };
    const axisY = { x: -Math.sin(rotationRad), y: Math.cos(rotationRad) };
    const oppositeCornerWorld = {
      x:
        areaEntity.x +
        axisX.x * oppositeSignX * (baseWidth / 2) +
        axisY.x * oppositeSignY * (baseHeight / 2),
      y:
        areaEntity.y +
        axisX.y * oppositeSignX * (baseWidth / 2) +
        axisY.y * oppositeSignY * (baseHeight / 2),
    };

    resizingAreaStart.current = {
      areaId: areaEntity.id,
      center: { x: areaEntity.x, y: areaEntity.y },
      baseRotationDeg: areaEntity.rotation || 0,
      axisX,
      axisY,
      oppositeCornerWorld,
      activeSignX,
      activeSignY,
    };
    resizingAreaDidChange.current = false;
    setDraggingEntityId(null);
    setRotatingRowId(null);
    rotatingRowStart.current = null;
    setRotatingSeatId(null);
    rotatingSeatStart.current = null;
    setRotatingRectTableId(null);
    rotatingRectTableStart.current = null;
    setResizingCircleTableId(null);
    resizingCircleTableStart.current = null;
    setEditingAreaVectorPoint(null);
    setResizingAreaId(areaEntity.id);
  };

  const handleAreaVectorPointMouseDown = (
    e: React.MouseEvent,
    areaEntity: Entity,
    pointIndex: number,
  ) => {
    if (mouseMode !== "select") return;
    if (areaEntity.areaLocked) return;

    e.preventDefault();
    e.stopPropagation();

    editingAreaVectorPointDidChange.current = false;
    setDraggingEntityId(null);
    setRotatingRowId(null);
    rotatingRowStart.current = null;
    setRotatingSeatId(null);
    rotatingSeatStart.current = null;
    setRotatingRectTableId(null);
    rotatingRectTableStart.current = null;
    setResizingCircleTableId(null);
    resizingCircleTableStart.current = null;
    setResizingAreaId(null);
    resizingAreaStart.current = null;
    setEditingAreaVectorPoint({ areaId: areaEntity.id, pointIndex });
  };

  const handleAdjustCircleTableSeatCount = React.useCallback(
    (tableId: string, delta: number) => {
      if (!Number.isFinite(delta) || delta === 0) return;

      setEntitiesWithHistory((prev) => {
        const tableEntity = prev.find(
          (entity) =>
            entity.id === tableId && getEntityType(entity) === "table-circle",
        );
        if (!tableEntity) return prev;

        const currentRadius = Math.min(
          CIRCLE_TABLE_RADIUS_MAX,
          Math.max(
            CIRCLE_TABLE_RADIUS_MIN,
            typeof tableEntity.circleSeatRadius === "number"
              ? tableEntity.circleSeatRadius
              : CIRCLE_TABLE_RADIUS_MIN,
          ),
        );
        const circleSeatMaxByRadius = getCircleSeatMaxByRadius(currentRadius);
        const existingChildren = prev.filter(
          (entity) =>
            getEntityType(entity) === "seat" && entity.parentId === tableId,
        );
        const currentSeatCount = Math.min(
          circleSeatMaxByRadius,
          Math.max(
            CIRCLE_SEAT_COUNT_MIN,
            Math.round(
              typeof tableEntity.circleSeatCount === "number"
                ? tableEntity.circleSeatCount
                : existingChildren.length > 0
                  ? existingChildren.length
                  : 8,
            ),
          ),
        );
        const nextSeatCount = Math.min(
          circleSeatMaxByRadius,
          Math.max(CIRCLE_SEAT_COUNT_MIN, currentSeatCount + Math.round(delta)),
        );

        if (nextSeatCount === currentSeatCount) return prev;

        const nextChildren = Array.from(
          { length: nextSeatCount },
          (_, index) => {
            const existingChild = existingChildren[index];
            const angle = (index / nextSeatCount) * Math.PI * 2;
            const childX = tableEntity.x + Math.cos(angle) * currentRadius;
            const childY = tableEntity.y + Math.sin(angle) * currentRadius;

            return {
              ...(existingChild ?? {
                id: `seat-${Date.now()}-${Math.random()}-${index}`,
                type: "seat" as const,
                parentId: tableId,
              }),
              label: `${tableEntity.label} - Silla ${index + 1}`,
              x: childX,
              y: childY,
              color: existingChild?.color ?? tableEntity.color ?? "#2563eb",
              parentId: tableId,
              type: "seat" as const,
            };
          },
        );

        const nextTableEntity: Entity = {
          ...tableEntity,
          circleSeatCount: nextSeatCount,
          circleSeatRadius: currentRadius,
        };

        const nextEntities = prev.filter(
          (entity) => entity.id !== tableId && entity.parentId !== tableId,
        );

        return [...nextEntities, nextTableEntity, ...nextChildren];
      });
    },
    [setEntitiesWithHistory],
  );

  const handleSetAreaShape = React.useCallback(
    (areaId: string, nextShape: AreaShape) => {
      const defaultPoints = getDefaultAreaVectorPoints(nextShape);
      setEntitiesWithHistory((prev) =>
        applyAreaAssociations(
          prev.map((entity) => {
            if (entity.id !== areaId || getEntityType(entity) !== "area") {
              return entity;
            }
            if (entity.areaLocked) return entity;

            const currentShape = entity.areaShape ?? "rectangle";
            if (currentShape === nextShape) return entity;

            const baseWidth =
              typeof entity.areaWidth === "number"
                ? entity.areaWidth
                : ENTITY_GRID_SIZE * 4;
            const baseHeight =
              typeof entity.areaHeight === "number"
                ? entity.areaHeight
                : ENTITY_GRID_SIZE * 3;

            if (nextShape === "square" || nextShape === "circle") {
              const side = Math.max(32, Math.min(baseWidth, baseHeight));
              return {
                ...entity,
                areaShape: nextShape,
                areaWidth: side,
                areaHeight: side,
                areaVectorPoints:
                  defaultPoints.length > 0 ? defaultPoints : undefined,
              };
            }

            if (nextShape === "rectangle") {
              const nextWidth = Math.max(32, baseWidth);
              const nextHeight =
                Math.abs(baseWidth - baseHeight) < 1
                  ? Math.max(32, Math.round(nextWidth * 0.72))
                  : Math.max(32, baseHeight);

              return {
                ...entity,
                areaShape: nextShape,
                areaWidth: nextWidth,
                areaHeight: nextHeight,
                areaVectorPoints:
                  defaultPoints.length > 0 ? defaultPoints : undefined,
              };
            }

            return {
              ...entity,
              areaShape: nextShape,
              areaVectorPoints:
                defaultPoints.length > 0 ? defaultPoints : undefined,
            };
          }),
        ),
      );
    },
    [setEntitiesWithHistory],
  );

  const handleAdjustRowSeatCount = React.useCallback(
    (rowId: string, delta: number) => {
      if (!Number.isFinite(delta) || delta === 0) return;

      setEntitiesWithHistory((prev) => {
        const rowEntity = prev.find(
          (entity) => entity.id === rowId && getEntityType(entity) === "row",
        );
        if (!rowEntity) return prev;

        const rowRotation = normalizeRotation(rowEntity.rotation || 0);
        const rowAngleRad = (rowRotation * Math.PI) / 180;
        const axisX = Math.cos(rowAngleRad);
        const axisY = Math.sin(rowAngleRad);
        const normalX = -Math.sin(rowAngleRad);
        const normalY = Math.cos(rowAngleRad);
        const lineOffset = ENTITY_GRID_SIZE;
        const rowCurvature = Math.max(
          ROW_CURVATURE_MIN,
          Math.min(ROW_CURVATURE_MAX, rowEntity.rowCurvature ?? 0),
        );
        const rowSeatSpacing = Math.max(
          8,
          Math.round(rowEntity.rowSeatSpacing ?? ENTITY_GRID_SIZE),
        );

        const existingChildren = prev
          .filter((entity) => entity.parentId === rowId)
          .slice()
          .sort((first, second) => {
            const firstProjection =
              (first.x - rowEntity.x) * axisX + (first.y - rowEntity.y) * axisY;
            const secondProjection =
              (second.x - rowEntity.x) * axisX +
              (second.y - rowEntity.y) * axisY;
            return firstProjection - secondProjection;
          });

        const currentSeatCount = Math.max(
          1,
          rowEntity.rowSeatCount ??
            (existingChildren.length > 0 ? existingChildren.length : 8),
        );
        const nextSeatCount = Math.max(1, currentSeatCount + Math.round(delta));
        if (nextSeatCount === currentSeatCount) return prev;
        const start = -((nextSeatCount - 1) * rowSeatSpacing) / 2;

        const nextChildren = Array.from(
          { length: nextSeatCount },
          (_, index) => {
            const existingChild = existingChildren[index];
            const along = start + index * rowSeatSpacing;
            const normalizedPosition =
              nextSeatCount <= 1 ? 0 : (index / (nextSeatCount - 1)) * 2 - 1;
            const curveOffset =
              (1 - normalizedPosition * normalizedPosition) * rowCurvature;
            const childX =
              rowEntity.x +
              axisX * along +
              normalX * (lineOffset + curveOffset);
            const childY =
              rowEntity.y +
              axisY * along +
              normalY * (lineOffset + curveOffset);

            return {
              ...(existingChild ?? {
                id: `seat-${Date.now()}-${Math.random()}-${index}`,
                type: "seat" as const,
                parentId: rowId,
              }),
              label: `${rowEntity.label} - Asiento ${index + 1}`,
              x: childX,
              y: childY,
              rotation: rowRotation,
              color: existingChild?.color ?? rowEntity.color ?? "#2563eb",
              parentId: rowId,
              type: "seat" as const,
            };
          },
        );

        const nextRowEntity: Entity = {
          ...rowEntity,
          rotation: rowRotation,
          rowSeatCount: nextSeatCount,
          rowSeatSpacing,
          rowCurvature,
        };

        const nextEntities = prev.filter(
          (entity) => entity.id !== rowId && entity.parentId !== rowId,
        );

        return [...nextEntities, nextRowEntity, ...nextChildren];
      });
    },
    [setEntitiesWithHistory],
  );

  const handleAdjustRectTableDimension = React.useCallback(
    (tableId: string, dimension: "width" | "height", direction: -1 | 1) => {
      setEntitiesWithHistory((prev) => {
        const tableEntity = prev.find(
          (entity) =>
            entity.id === tableId && getEntityType(entity) === "table-rect",
        );
        if (!tableEntity) return prev;

        const seatSize = getEntityRenderSize("seat");
        const currentTableWidth =
          typeof tableEntity.tableWidth === "number"
            ? tableEntity.tableWidth
            : getEntityRenderSize("table-rect");
        const currentTableHeight =
          typeof tableEntity.tableHeight === "number"
            ? tableEntity.tableHeight
            : Math.round(getEntityRenderSize("table-rect") * 0.55);

        const nextTableWidth =
          dimension === "width"
            ? Math.max(32, currentTableWidth + direction * seatSize)
            : currentTableWidth;
        const nextTableHeight =
          dimension === "height"
            ? Math.max(24, currentTableHeight + direction * seatSize)
            : currentTableHeight;

        if (
          nextTableWidth === currentTableWidth &&
          nextTableHeight === currentTableHeight
        ) {
          return prev;
        }

        const currentLayout = {
          topSeats: Math.max(1, tableEntity.rectLayout?.topSeats ?? 3),
          bottomSeats: Math.max(1, tableEntity.rectLayout?.bottomSeats ?? 3),
          leftSeats: Math.max(1, tableEntity.rectLayout?.leftSeats ?? 1),
          rightSeats: Math.max(1, tableEntity.rectLayout?.rightSeats ?? 1),
        };

        const currentHorizontalCapacity = Math.max(
          1,
          Math.floor(currentTableWidth / seatSize),
        );
        const currentVerticalCapacity = Math.max(
          1,
          Math.floor(currentTableHeight / seatSize),
        );
        const maxHorizontalSeats = Math.max(
          1,
          Math.floor(nextTableWidth / seatSize),
        );
        const maxVerticalSeats = Math.max(
          1,
          Math.floor(nextTableHeight / seatSize),
        );

        const horizontalCapacityDelta =
          maxHorizontalSeats - currentHorizontalCapacity;
        const verticalCapacityDelta =
          maxVerticalSeats - currentVerticalCapacity;

        const autoLayoutByDimensions = {
          topSeats: currentLayout.topSeats + horizontalCapacityDelta,
          bottomSeats: currentLayout.bottomSeats + horizontalCapacityDelta,
          leftSeats: currentLayout.leftSeats + verticalCapacityDelta,
          rightSeats: currentLayout.rightSeats + verticalCapacityDelta,
        };

        const mergedLayout = {
          topSeats: Math.min(
            maxHorizontalSeats,
            Math.max(1, Math.round(autoLayoutByDimensions.topSeats)),
          ),
          bottomSeats: Math.min(
            maxHorizontalSeats,
            Math.max(1, Math.round(autoLayoutByDimensions.bottomSeats)),
          ),
          leftSeats: Math.min(
            maxVerticalSeats,
            Math.max(1, Math.round(autoLayoutByDimensions.leftSeats)),
          ),
          rightSeats: Math.min(
            maxVerticalSeats,
            Math.max(1, Math.round(autoLayoutByDimensions.rightSeats)),
          ),
        };

        const tableRotation = normalizeRotation(tableEntity.rotation || 0);
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

        const existingChildren = prev.filter(
          (entity) => entity.parentId === tableId,
        );
        const nextTableEntity: Entity = {
          ...tableEntity,
          rotation: tableRotation,
          tableWidth: nextTableWidth,
          tableHeight: nextTableHeight,
          rectLayout: mergedLayout,
        };

        const nextChildren = seatOffsets.map((offset, index) => {
          const existingChild = existingChildren[index];
          const rotatedOffsetX = offset.x * tableCos - offset.y * tableSin;
          const rotatedOffsetY = offset.x * tableSin + offset.y * tableCos;
          const childX = tableEntity.x + rotatedOffsetX;
          const childY = tableEntity.y + rotatedOffsetY;

          return {
            ...(existingChild ?? {
              id: `seat-${Date.now()}-${Math.random()}-${index}`,
              label: `${nextTableEntity.label} - Silla ${index + 1}`,
              type: "seat" as const,
              parentId: tableId,
            }),
            label: `${nextTableEntity.label} - Silla ${index + 1}`,
            x: childX,
            y: childY,
            rotation: getRectTableSeatRotationBySide(
              childX,
              childY,
              tableEntity.x,
              tableEntity.y,
              tableRotation,
              nextTableWidth,
              nextTableHeight,
            ),
            color: existingChild?.color ?? nextTableEntity.color ?? "#2563eb",
            parentId: tableId,
            type: "seat" as const,
          };
        });

        const nextEntities = prev.filter(
          (entity) => entity.id !== tableId && entity.parentId !== tableId,
        );

        return [...nextEntities, nextTableEntity, ...nextChildren];
      });
    },
    [setEntitiesWithHistory],
  );
  // Zoom con scroll en modo pan
  const handleWheel = (e: React.WheelEvent) => {
    if (mouseMode === "pan") {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      handleZoom(delta);
    }
  }; // Drag de entidad seleccionada
  // Utilidad para obtener mouse pos en coords canvas base (sin zoom/offset)
  function getCanvasCoords(e: MouseEvent | React.MouseEvent) {
    return getCanvasCoordsFromEvent(e, canvasRef.current, offset, zoom);
  }

  // Area selection handlers (usando coords canvas base)
  const handleAreaMouseDown = (e: React.MouseEvent) => {
    if (mouseMode === "select" && !draggingEntityId && sidebarTool === "none") {
      const { x, y } = getCanvasCoords(e);
      setIsSelectingArea(true);
      setSelectionStart({ x, y });
      setSelectionRect({ x, y, w: 0, h: 0 });
      setSelectedCanvasEntityIds([]); // Limpia selección previa
    }
  };
  const handleAreaMouseMove = (e: React.MouseEvent) => {
    if (isSelectingArea && selectionStart) {
      const { x, y } = getCanvasCoords(e);
      const sx = selectionStart.x;
      const sy = selectionStart.y;
      setSelectionRect({
        x: Math.min(sx, x),
        y: Math.min(sy, y),
        w: Math.abs(x - sx),
        h: Math.abs(y - sy),
      });
    }
    handleMouseMove(e);
  };
  const handleAreaMouseUp = () => {
    if (isSelectingArea && selectionRect) {
      // Selecciona todas las entidades dentro del rectángulo
      const selectedEntitiesInArea = canvasEntities.filter(
        (s) =>
          s.x >= selectionRect.x &&
          s.x <= selectionRect.x + selectionRect.w &&
          s.y >= selectionRect.y &&
          s.y <= selectionRect.y + selectionRect.h,
      );
      let ids: string[];
      if (
        window.event &&
        ((window.event as KeyboardEvent).ctrlKey ||
          (window.event as KeyboardEvent).metaKey)
      ) {
        // Si Ctrl/Cmd está presionado, seleccionar solo elementos principales (no áreas, no hijos sueltos)
        const mainEntities = selectedEntitiesInArea.filter((entity) => {
          const type = getEntityType(entity);
          if (type === "area") return false;
          // Si es una silla hija de una mesa/fila, solo seleccionar el padre
          if (type === "seat" && entity.parentId) {
            // Verificar si el padre está también en el área seleccionada
            return !selectedEntitiesInArea.some(
              (e) => e.id === entity.parentId,
            );
          }
          return true;
        });
        // Si hay padres, solo seleccionar los padres, no los hijos
        const parentIds = new Set(
          mainEntities.map((e) => e.parentId).filter(Boolean),
        );
        ids = Array.from(
          new Set(
            mainEntities.filter((e) => !parentIds.has(e.id)).map((e) => e.id),
          ),
        );
      } else {
        // Selección normal (puede agrupar por área)
        ids = Array.from(
          new Set(
            selectedEntitiesInArea.map((entity) =>
              getSelectableEntityId(entity.id, canvasEntities),
            ),
          ),
        );
      }
      setSelectedCanvasEntityIds(ids);
      if (ids.length > 0) {
        const anchorEntity = canvasEntities.find(
          (entity) => entity.id === ids[0],
        );
        if (anchorEntity) {
          setMenuPos({ x: anchorEntity.x, y: anchorEntity.y + 40 });
        } else {
          setMenuPos(null);
        }
      } else {
        setMenuPos(null);
      }
      ignoreNextCanvasDeselectClick.current = true;
    }
    setIsSelectingArea(false);
    setSelectionStart(null);
    setSelectionRect(null);
    handleMouseUp();
  };
  // Estado para saber si el mouse está sobre una entidad existente al intentar agregar
  const [overlapError, setOverlapError] = useState(false);

  // Cursor según modo
  let cursor = "default";
  if (sidebarTool && sidebarTool !== "none" && overlapError) {
    cursor = "not-allowed";
  } else if (mouseMode === "pan") {
    cursor = dragging ? "grabbing" : "grab";
  } else if (mouseMode === "delete") {
    cursor = "crosshair"; // O puedes usar 'url("/path/to/delete-cursor.svg"), auto' para un cursor custom
  } else if (mouseMode === "select") {
    cursor = "pointer";
  }

  // Ref para contar errores activos y guardar los ids
  const errorToastIds = useRef<string[]>([]);

  // Manejar click para agregar entidad si la herramienta está activa
  const handleCanvasClick = (e: React.MouseEvent) => {
    focusCanvas();
    if (sidebarTool && sidebarTool !== "none") {
      // Usar getCanvasCoords para obtener la posición base
      const { x, y } = getCanvasCoords(e);
      const gx = snapToGrid(x);
      const gy = snapToGrid(y);
      const newEntities = createEntitiesFromTool(
        sidebarTool,
        gx,
        gy,
        canvasEntities,
      );
      const exists = hasAnyEntityCollision(newEntities, canvasEntities);
      if (!exists) {
        setEntitiesWithHistory((prev) =>
          applyAreaAssociations([...prev, ...newEntities]),
        );
        // Deseleccionar la herramienta
        if (setSidebarTool) {
          setSidebarTool("none");
        }
      } else {
        pushCollisionToast(errorToastIds);
      }
    }
  };
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (confirmDialogOpenRef.current) {
        if (e.key === "Escape") {
          e.preventDefault();
          confirmActionRef.current = null;
          setConfirmDialog(CLOSED_CONFIRM_DIALOG);
        }
        return;
      }

      const active = document.activeElement;
      if (isEditableTarget(active)) return;

      // Eliminar con tecla Delete
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedCanvasEntityIds.length > 0
      ) {
        e.preventDefault();
        const selectedIdsSnapshot = [...selectedCanvasEntityIds];
        const expandedIdsSnapshot = expandSelectionWithRowChildren(
          selectedIdsSnapshot,
          canvasEntities,
        );
        openDeleteConfirm(
          {
            title: "Confirmar eliminación",
            description:
              selectedIdsSnapshot.length === 1
                ? "¿Seguro que querés eliminar la entidad seleccionada?"
                : `¿Seguro que querés eliminar ${selectedIdsSnapshot.length} entidades seleccionadas?`,
          },
          () => {
            setEntitiesWithHistory((prev) =>
              prev.filter((s) => !expandedIdsSnapshot.includes(s.id)),
            );
            setSelectedCanvasEntityIds([]);
            setMenuPos(null);
          },
        );
      }

      if (e.key !== "Escape") return;

      e.preventDefault();

      if (editingAreaVectorPointRef.current) {
        setEditingAreaVectorPoint(null);
        return;
      }

      if (selectedCanvasEntityIds.length === 1) {
        const selectedEntity = canvasEntities.find(
          (entity) => entity.id === selectedCanvasEntityIds[0],
        );
        if (selectedEntity?.areaId) {
          const areaEntity = canvasEntities.find(
            (entity) => entity.id === selectedEntity.areaId,
          );
          if (areaEntity && getEntityType(areaEntity) === "area") {
            const associatedRootIds = canvasEntities
              .filter(
                (entity) =>
                  getEntityType(entity) !== "area" &&
                  !entity.parentId &&
                  entity.areaId === areaEntity.id,
              )
              .map((entity) => entity.id);
            const areaSelectionIds = [areaEntity.id, ...associatedRootIds];
            setSelectedCanvasEntityIds(areaSelectionIds);
            setMenuPos({ x: areaEntity.x, y: areaEntity.y + 40 });
            return;
          }
        }
      }

      if (selectedCanvasEntityIds.length > 0 || menuPosRef.current) {
        setSelectedCanvasEntityIds([]);
        setMenuPos(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    canvasEntities,
    openDeleteConfirm,
    selectedCanvasEntityIds,
    setEntitiesWithHistory,
    setSelectedCanvasEntityIds,
  ]);
  // Detectar si el mouse está sobre una entidad existente al intentar agregar
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (sidebarTool && sidebarTool !== "none") {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = snapToGrid((e.clientX - rect.left - offset.x) / zoom);
      const y = snapToGrid((e.clientY - rect.top - offset.y) / zoom);
      const previewEntities = createEntitiesFromTool(
        sidebarTool,
        x,
        y,
        canvasEntities,
      );
      const exists = hasAnyEntityCollision(previewEntities, canvasEntities);

      setOverlapError(exists);
    } else {
      setOverlapError(false);
    }
    // Mantener pan
    handleMouseMove(e);
  };

  const getAreaSelectionIds = React.useCallback(
    (areaId: string) => {
      const associatedRootIds = canvasEntities
        .filter(
          (entity) =>
            getEntityType(entity) !== "area" &&
            !entity.parentId &&
            entity.areaId === areaId,
        )
        .map((entity) => entity.id);

      return [areaId, ...associatedRootIds];
    },
    [canvasEntities],
  );

  // Handler para seleccionar o eliminar una entidad según modo
  const handleEntityClick = (
    e: React.MouseEvent,
    entityId: string,
    entity: Entity,
  ) => {
    focusCanvas();
    const selectableEntityId = getSelectableEntityId(entityId, canvasEntities);
    const selectableEntity = entityById.get(selectableEntityId) ?? entity;

    if (mouseMode === "delete") {
      e.stopPropagation();
      const expandedDeleteIds = expandSelectionWithRowChildren(
        [selectableEntityId],
        canvasEntities,
      );
      const entityLabel =
        selectableEntity.label?.trim() || "la entidad seleccionada";
      openDeleteConfirm(
        {
          title: "Confirmar eliminación",
          description: `¿Seguro que querés eliminar ${entityLabel}?`,
        },
        () => {
          setEntitiesWithHistory((prev) =>
            prev.filter((s) => !expandedDeleteIds.includes(s.id)),
          );
          const remainingSelectedIds = selectedCanvasEntityIds.filter(
            (id) => id !== selectableEntityId,
          );
          setSelectedCanvasEntityIds(remainingSelectedIds);
          setMenuPos(null);
        },
      );
      return;
    }
    if (mouseMode === "select") {
      e.stopPropagation();

      const isModifierSelection = e.ctrlKey || e.metaKey;
      const isTouchLike = isTouchLikeInteraction(e);
      if (isModifierSelection && selectedAreaIds.size > 0) {
        const { x: mouseX, y: mouseY } = getCanvasCoords(e);
        const hitEntity = [...canvasEntities].reverse().find((candidate) => {
          if (getEntityType(candidate) === "area") return false;
          if (!candidate.areaId || !selectedAreaIds.has(candidate.areaId)) {
            return false;
          }
          return isPointInsideEntityBounds(mouseX, mouseY, candidate);
        });

        if (hitEntity) {
          const hitSelectableId = getSelectableEntityId(
            hitEntity.id,
            canvasEntities,
          );
          const hitSelectableEntity =
            entityById.get(hitSelectableId) ?? hitEntity;
          setSelectedCanvasEntityIds([hitSelectableId]);
          setMenuPos({
            x: hitSelectableEntity.x,
            y: hitSelectableEntity.y + 40,
          });
          return;
        }
      }

      const isAreaSelection = getEntityType(selectableEntity) === "area";
      const isInsideSelectedArea =
        !isAreaSelection &&
        !!selectableEntity.areaId &&
        selectedAreaIds.has(selectableEntity.areaId);

      if (isAreaSelection && isTouchLike) {
        const now = Date.now();
        const previousTap = lastAreaTapRef.current;
        const isSameAreaQuickRetap =
          previousTap?.areaId === selectableEntity.id &&
          now - previousTap.timestamp <= 700;
        const areaAlreadySelected = selectedCanvasEntityIds.includes(
          selectableEntity.id,
        );

        if (isSameAreaQuickRetap && areaAlreadySelected) {
          const { x: tapX, y: tapY } = getCanvasCoords(e);
          const hitEntity = [...canvasEntities].reverse().find((candidate) => {
            if (getEntityType(candidate) === "area") return false;
            if (candidate.areaId !== selectableEntity.id) return false;
            return isPointInsideEntityBounds(tapX, tapY, candidate);
          });

          if (hitEntity) {
            const hitSelectableId = getSelectableEntityId(
              hitEntity.id,
              canvasEntities,
            );
            const hitSelectableEntity =
              entityById.get(hitSelectableId) ?? hitEntity;
            setSelectedCanvasEntityIds([hitSelectableId]);
            setMenuPos({
              x: hitSelectableEntity.x,
              y: hitSelectableEntity.y + 40,
            });
            lastAreaTapRef.current = null;
            return;
          }
        }

        lastAreaTapRef.current = {
          areaId: selectableEntity.id,
          timestamp: now,
        };
      } else {
        lastAreaTapRef.current = null;
      }

      if (isInsideSelectedArea && e.detail >= 2) {
        setSelectedCanvasEntityIds([selectableEntityId]);
        setMenuPos({ x: selectableEntity.x, y: selectableEntity.y + 40 });
        return;
      }

      if (isInsideSelectedArea && isModifierSelection) {
        setSelectedCanvasEntityIds([selectableEntityId]);
        setMenuPos({ x: selectableEntity.x, y: selectableEntity.y + 40 });
        return;
      }

      let areaSelectionIds: string[];
      // If Ctrl/Cmd is pressed and the entity is inside an area, ignore area selection and select only the entity
      if (isModifierSelection && !isAreaSelection && selectableEntity.areaId) {
        areaSelectionIds = [selectableEntityId];
      } else {
        areaSelectionIds = isAreaSelection
          ? getAreaSelectionIds(selectableEntity.id)
          : [selectableEntityId];
      }

      // Toggle selection mejorado: quita todo el grupo si está completamente seleccionado, o agrega todo el grupo si no lo está
      let newIds: string[];
      const areaSelectionSet = new Set(areaSelectionIds);
      const isTouch = isTouchLikeInteraction(e);
      const isAllSelected = areaSelectionIds.every((id) =>
        selectedCanvasEntityIds.includes(id),
      );
      const isAnySelected = areaSelectionIds.some((id) =>
        selectedCanvasEntityIds.includes(id),
      );
      // On mobile/touch, always toggle selection on tap (no modifier key needed)
      if (isTouch && isAllSelected) {
        newIds = selectedCanvasEntityIds.filter(
          (id: string) => !areaSelectionSet.has(id),
        );
      } else if (isTouch && !isAllSelected) {
        newIds = Array.from(
          new Set([...selectedCanvasEntityIds, ...areaSelectionIds]),
        );
      } else if (isAllSelected) {
        // Si todo el grupo está seleccionado, lo quitamos de la selección
        newIds = selectedCanvasEntityIds.filter(
          (id: string) => !areaSelectionSet.has(id),
        );
      } else if (isModifierSelection && isAnySelected) {
        // Si parte del grupo está seleccionada, agregamos el resto
        newIds = Array.from(
          new Set([...selectedCanvasEntityIds, ...areaSelectionIds]),
        );
      } else if (isModifierSelection) {
        // Si nada del grupo está seleccionado, lo agregamos
        newIds = Array.from(
          new Set([...selectedCanvasEntityIds, ...areaSelectionIds]),
        );
      } else {
        // Selección simple
        newIds = areaSelectionIds;
      }
      setSelectedCanvasEntityIds(newIds);
      if (newIds.length === 1) {
        setMenuPos({ x: selectableEntity.x, y: selectableEntity.y + 40 });
      } else {
        setMenuPos(null);
      }
    }
  };

  // Handler para deseleccionar
  const handleCanvasDeselect = () => {
    focusCanvas();
    if (ignoreNextCanvasDeselectClick.current) {
      ignoreNextCanvasDeselectClick.current = false;
      return;
    }
    setMenuPos(null);
  };

  // Copiar/pegar con Ctrl+C / Ctrl+V
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (confirmDialogOpenRef.current) return;

      const active = document.activeElement;
      if (isEditableTarget(active)) return;

      // Copiar (Ctrl+C)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        if (selectedCanvasEntityIdsRef.current.length > 0) {
          clipboardEntities.current = canvasEntitiesRef.current.filter((s) =>
            selectedIdsWithRowChildrenRef.current.includes(s.id),
          );
        }
      }
      // Pegar (Ctrl+V)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        if (clipboardEntities.current && clipboardEntities.current.length > 0) {
          const minX = Math.min(...clipboardEntities.current.map((s) => s.x));
          const minY = Math.min(...clipboardEntities.current.map((s) => s.y));
          let pastedEntities: Entity[] = [];
          let found = false;
          for (const [dx, dy] of spiralOffsets(
            baseGridSize,
            baseGridSize * 10,
          )) {
            const idMap = new Map<string, string>();
            clipboardEntities.current.forEach((entity, idx) => {
              const type = getEntityType(entity);
              idMap.set(
                entity.id,
                `${type}-${Date.now()}-${Math.random()}-${idx}`,
              );
            });

            pastedEntities = clipboardEntities.current.map((entity) => {
              const mappedParentId = entity.parentId
                ? (idMap.get(entity.parentId) ?? entity.parentId)
                : undefined;

              return {
                ...entity,
                id: idMap.get(entity.id) ?? entity.id,
                parentId: mappedParentId,
                x: entity.x - minX + minX + dx,
                y: entity.y - minY + minY + dy,
              };
            });

            const existingRowCount = canvasEntitiesRef.current.filter(
              (entity) => getEntityType(entity) === "row",
            ).length;
            const existingTableCount = canvasEntitiesRef.current.filter(
              (entity) => {
                const type = getEntityType(entity);
                return type === "table-circle" || type === "table-rect";
              },
            ).length;
            const existingAreaCount = canvasEntitiesRef.current.filter(
              (entity) => getEntityType(entity) === "area",
            ).length;
            const existingStandaloneSeatCount =
              canvasEntitiesRef.current.filter(
                (entity) =>
                  getEntityType(entity) === "seat" && !entity.parentId,
              ).length;

            let rowCounter = existingRowCount;
            let tableCounter = existingTableCount;
            let areaCounter = existingAreaCount;
            let standaloneSeatCounter = existingStandaloneSeatCount;

            const pastedById = new Map(
              pastedEntities.map((entity) => [entity.id, entity]),
            );
            const parentLabelById = new Map<string, string>();

            pastedEntities = pastedEntities.map((entity) => {
              const type = getEntityType(entity);
              const isChild =
                !!entity.parentId && pastedById.has(entity.parentId);
              if (isChild) return entity;

              if (type === "row") {
                rowCounter += 1;
                const label = `Fila ${rowCounter}`;
                parentLabelById.set(entity.id, label);
                return { ...entity, label };
              }

              if (type === "table-circle" || type === "table-rect") {
                tableCounter += 1;
                const label = `Mesa ${tableCounter}`;
                parentLabelById.set(entity.id, label);
                return { ...entity, label };
              }

              if (type === "area") {
                areaCounter += 1;
                return { ...entity, label: `Área ${areaCounter}` };
              }

              if (type === "seat") {
                standaloneSeatCounter += 1;
                return { ...entity, label: `Silla ${standaloneSeatCounter}` };
              }

              return entity;
            });

            const childIndexByParent = new Map<string, number>();
            pastedEntities = pastedEntities.map((entity) => {
              if (!entity.parentId || !pastedById.has(entity.parentId))
                return entity;

              const parent = pastedById.get(entity.parentId);
              if (!parent) return entity;

              const parentType = getEntityType(parent);
              const parentLabel =
                parentLabelById.get(parent.id) ?? parent.label;
              const currentIndex = (childIndexByParent.get(parent.id) ?? 0) + 1;
              childIndexByParent.set(parent.id, currentIndex);

              if (parentType === "row") {
                return {
                  ...entity,
                  label: `${parentLabel} - Asiento ${currentIndex}`,
                };
              }

              if (
                parentType === "table-circle" ||
                parentType === "table-rect"
              ) {
                return {
                  ...entity,
                  label: `${parentLabel} - Silla ${currentIndex}`,
                };
              }

              return entity;
            });

            if (
              !hasAnyEntityCollision(pastedEntities, canvasEntitiesRef.current)
            ) {
              found = true;
              break;
            }
          }
          if (!found) {
            toast.error("No hay espacio libre para pegar el grupo.");
            return;
          }
          setEntitiesWithHistory((prev) => [...prev, ...pastedEntities]);
          setSelectedCanvasEntityIds(pastedEntities.map((s) => s.id));
          if (pastedEntities.length === 1) {
            setMenuPos({ x: pastedEntities[0].x, y: pastedEntities[0].y + 40 });
          } else {
            setMenuPos(null);
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [baseGridSize, setEntitiesWithHistory, setSelectedCanvasEntityIds]);

  // Handler para rotar (soporta selección múltiple, NO deselecciona)
  const handleRotate = () => {
    if (selectedCanvasEntityIds.length === 0) return;
    setEntitiesWithHistory((prev) => {
      const selectedIdSet = new Set(selectedIdsWithRowChildren);
      const selectedEntities = prev.filter((entity) =>
        selectedIdSet.has(entity.id),
      );
      if (selectedEntities.length === 0) return prev;

      const selectedById = new Map(prev.map((entity) => [entity.id, entity]));
      const selectedRootEntity =
        selectedCanvasEntityIds.length === 1
          ? selectedById.get(selectedCanvasEntityIds[0])
          : undefined;
      const selectedRootType = selectedRootEntity
        ? getEntityType(selectedRootEntity)
        : null;

      const selectedContainerIds = new Set(
        selectedEntities
          .filter((entity) => {
            const type = getEntityType(entity);
            return type === "table-rect" || type === "table-circle";
          })
          .map((entity) => entity.id),
      );

      const anchorX =
        selectedRootEntity &&
        (selectedRootType === "table-rect" ||
          selectedRootType === "table-circle" ||
          selectedRootType === "row")
          ? selectedRootEntity.x
          : selectedEntities.reduce((sum, entity) => sum + entity.x, 0) /
            selectedEntities.length;
      const anchorY =
        selectedRootEntity &&
        (selectedRootType === "table-rect" ||
          selectedRootType === "table-circle" ||
          selectedRootType === "row")
          ? selectedRootEntity.y
          : selectedEntities.reduce((sum, entity) => sum + entity.y, 0) /
            selectedEntities.length;

      const normalizeRotation = (rotation: number) =>
        ((rotation % 360) + 360) % 360;

      const rotatePoint = (x: number, y: number) => ({
        x: anchorX - (y - anchorY),
        y: anchorY + (x - anchorX),
      });

      return prev.map((entity) => {
        if (!selectedIdSet.has(entity.id)) return entity;

        const rotatedPoint = rotatePoint(entity.x, entity.y);

        const isSeatInSelectedRectTable =
          getEntityType(entity) === "seat" &&
          !!entity.parentId &&
          selectedContainerIds.has(entity.parentId) &&
          getEntityType(selectedById.get(entity.parentId) ?? entity) ===
            "table-rect";

        const isSeatInSelectedTable =
          getEntityType(entity) === "seat" &&
          !!entity.parentId &&
          selectedContainerIds.has(entity.parentId);

        let nextRotation = isSeatInSelectedTable
          ? entity.rotation || 0
          : normalizeRotation((entity.rotation || 0) + 90);

        if (isSeatInSelectedRectTable && entity.parentId) {
          const parent = selectedById.get(entity.parentId);
          if (parent) {
            const rotatedParent = rotatePoint(parent.x, parent.y);
            nextRotation = getRectTableSeatRotationBySide(
              rotatedPoint.x,
              rotatedPoint.y,
              rotatedParent.x,
              rotatedParent.y,
              normalizeRotation((parent.rotation || 0) + 90),
              typeof parent.tableWidth === "number"
                ? parent.tableWidth
                : getEntityRenderSize("table-rect"),
              typeof parent.tableHeight === "number"
                ? parent.tableHeight
                : Math.round(getEntityRenderSize("table-rect") * 0.55),
            );
          }
        }

        return {
          ...entity,
          x: rotatedPoint.x,
          y: rotatedPoint.y,
          rotation: nextRotation,
        };
      });
    });
  };

  // Handler para espejar horizontalmente el grupo seleccionado
  const handleMirror = () => {
    if (selectedCanvasEntityIds.length === 0) return;
    setEntitiesWithHistory((prev) => {
      const selectedIdSet = new Set(selectedIdsWithRowChildren);
      const selectedEntities = prev.filter((entity) =>
        selectedIdSet.has(entity.id),
      );
      if (selectedEntities.length === 0) return prev;

      const selectedById = new Map(prev.map((entity) => [entity.id, entity]));
      const selectedRootEntity =
        selectedCanvasEntityIds.length === 1
          ? selectedById.get(selectedCanvasEntityIds[0])
          : undefined;
      const selectedRootType = selectedRootEntity
        ? getEntityType(selectedRootEntity)
        : null;

      const selectedContainerIds = new Set(
        selectedEntities
          .filter((entity) => {
            const type = getEntityType(entity);
            return type === "table-rect" || type === "table-circle";
          })
          .map((entity) => entity.id),
      );

      const anchorX =
        selectedRootEntity &&
        (selectedRootType === "table-rect" ||
          selectedRootType === "table-circle" ||
          selectedRootType === "row")
          ? selectedRootEntity.x
          : selectedEntities.reduce((sum, entity) => sum + entity.x, 0) /
            selectedEntities.length;

      const normalizeRotation = (rotation: number) =>
        ((rotation % 360) + 360) % 360;

      const mirrorPoint = (x: number, y: number) => ({
        x: anchorX - (x - anchorX),
        y,
      });

      return prev.map((entity) => {
        if (!selectedIdSet.has(entity.id)) return entity;

        const mirroredPoint = mirrorPoint(entity.x, entity.y);

        const isSeatInSelectedRectTable =
          getEntityType(entity) === "seat" &&
          !!entity.parentId &&
          selectedContainerIds.has(entity.parentId) &&
          getEntityType(selectedById.get(entity.parentId) ?? entity) ===
            "table-rect";

        const isSeatInSelectedTable =
          getEntityType(entity) === "seat" &&
          !!entity.parentId &&
          selectedContainerIds.has(entity.parentId);

        let nextRotation = isSeatInSelectedTable
          ? entity.rotation || 0
          : normalizeRotation(180 - (entity.rotation || 0));

        if (isSeatInSelectedRectTable && entity.parentId) {
          const parent = selectedById.get(entity.parentId);
          if (parent) {
            const mirroredParent = mirrorPoint(parent.x, parent.y);
            nextRotation = getRectTableSeatRotationBySide(
              mirroredPoint.x,
              mirroredPoint.y,
              mirroredParent.x,
              mirroredParent.y,
              normalizeRotation(180 - (parent.rotation || 0)),
              typeof parent.tableWidth === "number"
                ? parent.tableWidth
                : getEntityRenderSize("table-rect"),
              typeof parent.tableHeight === "number"
                ? parent.tableHeight
                : Math.round(getEntityRenderSize("table-rect") * 0.55),
            );
          }
        }

        return {
          ...entity,
          x: mirroredPoint.x,
          rotation: nextRotation,
        };
      });
    });
  };

  const selectedMenuEntity = React.useMemo(
    () =>
      selectedCanvasEntityIds.length === 1
        ? (entityById.get(selectedCanvasEntityIds[0]) ?? null)
        : null,
    [entityById, selectedCanvasEntityIds],
  );
  const isRowQuickActions =
    !!selectedMenuEntity && getEntityType(selectedMenuEntity) === "row";
  const isStandaloneSeatQuickActions =
    !!selectedMenuEntity &&
    getEntityType(selectedMenuEntity) === "seat" &&
    !selectedMenuEntity.parentId;
  const isTableQuickActions =
    !!selectedMenuEntity &&
    ["table-circle", "table-rect"].includes(getEntityType(selectedMenuEntity));
  const isRectTableQuickActions =
    !!selectedMenuEntity && getEntityType(selectedMenuEntity) === "table-rect";
  const selectedQuickAreaEntity = React.useMemo(() => {
    if (selectedAreaIds.size !== 1) return null;
    const [areaId] = Array.from(selectedAreaIds);
    const areaEntity = entityById.get(areaId);
    if (!areaEntity || getEntityType(areaEntity) !== "area") return null;
    return areaEntity;
  }, [entityById, selectedAreaIds]);
  const areaQuickActionsAnchor = React.useMemo(() => {
    if (!selectedQuickAreaEntity) return null;

    const { width, height } = getAreaRenderDimensions(selectedQuickAreaEntity);
    const rotationDeg = selectedQuickAreaEntity.rotation || 0;
    const rotationRad = (rotationDeg * Math.PI) / 180;
    const localOffsetX = width / 2 + 30;
    const localOffsetY = -height / 2 - 30;
    const offsetX =
      localOffsetX * Math.cos(rotationRad) -
      localOffsetY * Math.sin(rotationRad);
    const offsetY =
      localOffsetX * Math.sin(rotationRad) +
      localOffsetY * Math.cos(rotationRad);

    return {
      x: selectedQuickAreaEntity.x + offsetX,
      y: selectedQuickAreaEntity.y + offsetY,
    };
  }, [selectedQuickAreaEntity]);
  const isAreaQuickActions = !!areaQuickActionsAnchor;
  const isSelectedAreaLocked = Boolean(selectedQuickAreaEntity?.areaLocked);
  const canRotateQuickAction =
    selectedAreaIds.size === 0 &&
    (!selectedMenuEntity ||
      getEntityType(selectedMenuEntity) !== "table-circle");
  const canMirrorQuickAction =
    selectedAreaIds.size === 0 &&
    (!selectedMenuEntity ||
      !["table-circle", "table-rect"].includes(
        getEntityType(selectedMenuEntity),
      ));
  const rowQuickActionsAnchor = React.useMemo(() => {
    if (!isRowQuickActions || !selectedMenuEntity) return null;

    const rotationDeg = selectedMenuEntity.rotation || 0;
    const rotationRad = (rotationDeg * Math.PI) / 180;
    const normalX = -Math.sin(rotationRad);
    const normalY = Math.cos(rotationRad);
    const rowChildren = getRowChildren(selectedMenuEntity.id, canvasEntities);
    const projectionCandidates = [selectedMenuEntity, ...rowChildren];
    const furthestProjection = projectionCandidates.reduce(
      (maxProjection, entity) => {
        const projection =
          (entity.x - selectedMenuEntity.x) * normalX +
          (entity.y - selectedMenuEntity.y) * normalY;
        return Math.max(maxProjection, projection);
      },
      0,
    );
    const distance = Math.max(78, furthestProjection + 44);

    return {
      x: selectedMenuEntity.x + normalX * distance,
      y: selectedMenuEntity.y + normalY * distance,
      rotationDeg,
    };
  }, [canvasEntities, isRowQuickActions, selectedMenuEntity]);
  const standaloneSeatQuickActionsAnchor = React.useMemo(() => {
    if (!isStandaloneSeatQuickActions || !selectedMenuEntity) return null;

    const rotationDeg = selectedMenuEntity.rotation || 0;
    const rotationRad = (rotationDeg * Math.PI) / 180;
    const leftAxisX = -Math.cos(rotationRad);
    const leftAxisY = -Math.sin(rotationRad);
    const distance = 60;

    return {
      x: selectedMenuEntity.x + leftAxisX * distance,
      y: selectedMenuEntity.y + leftAxisY * distance,
      rotationDeg,
    };
  }, [isStandaloneSeatQuickActions, selectedMenuEntity]);
  const tableQuickActionsAnchor = React.useMemo(() => {
    if (!isTableQuickActions || !selectedMenuEntity) return null;

    if (getEntityType(selectedMenuEntity) === "table-rect") {
      const rotationDeg = selectedMenuEntity.rotation || 0;
      const rotationRad = (rotationDeg * Math.PI) / 180;
      const axisX = Math.cos(rotationRad);
      const axisY = Math.sin(rotationRad);
      const tableWidth =
        typeof selectedMenuEntity.tableWidth === "number"
          ? selectedMenuEntity.tableWidth
          : getEntityRenderSize("table-rect");
      const seatRenderSize = getEntityRenderSize("seat");
      const rectControlDistance = tableWidth / 2 + seatRenderSize * 2 + 14;
      const distance = rectControlDistance + 46;

      return {
        x: selectedMenuEntity.x + axisX * distance,
        y: selectedMenuEntity.y + axisY * distance,
        rotationDeg,
      };
    }

    if (getEntityType(selectedMenuEntity) === "table-circle") {
      const rotationDeg = selectedMenuEntity.rotation || 0;
      const rotationRad = (rotationDeg * Math.PI) / 180;
      const axisX = Math.cos(rotationRad);
      const axisY = Math.sin(rotationRad);
      const seatRenderSize = getEntityRenderSize("seat");
      const circleRadius = Math.min(
        CIRCLE_TABLE_RADIUS_MAX,
        Math.max(
          CIRCLE_TABLE_RADIUS_MIN,
          typeof selectedMenuEntity.circleSeatRadius === "number"
            ? selectedMenuEntity.circleSeatRadius
            : CIRCLE_TABLE_RADIUS_MIN,
        ),
      );
      const outerEdgeDistance = circleRadius + seatRenderSize / 2;
      const distance = outerEdgeDistance + seatRenderSize * 0.85;

      return {
        x: selectedMenuEntity.x + axisX * distance,
        y: selectedMenuEntity.y + axisY * distance,
      };
    }

    const tableSeats = canvasEntities.filter(
      (entity) =>
        getEntityType(entity) === "seat" &&
        entity.parentId === selectedMenuEntity.id,
    );
    if (tableSeats.length === 0) {
      return { x: selectedMenuEntity.x, y: selectedMenuEntity.y };
    }

    const rightmostSeat = tableSeats.reduce((currentRightmost, seat) =>
      seat.x > currentRightmost.x ? seat : currentRightmost,
    );

    return { x: rightmostSeat.x, y: rightmostSeat.y };
  }, [canvasEntities, isTableQuickActions, selectedMenuEntity]);
  const quickActionsIconTransform = isRowQuickActions
    ? `rotate(-${rowQuickActionsAnchor?.rotationDeg ?? 0}deg)`
    : isRectTableQuickActions
      ? `rotate(-${tableQuickActionsAnchor?.rotationDeg ?? 0}deg)`
      : isStandaloneSeatQuickActions
        ? `rotate(-${standaloneSeatQuickActionsAnchor?.rotationDeg ?? 0}deg)`
        : undefined;

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden"
      tabIndex={0}
      role="application"
      aria-label="Canvas de edición"
      onMouseMove={handleAreaMouseMove}
      onMouseUp={handleAreaMouseUp}
      onMouseLeave={handleAreaMouseUp}
      onMouseDown={handleAreaMouseDown}
      onPointerDown={(e) => handleNonMousePointer(e, handleAreaMouseDown)}
      onPointerMove={(e) => handleNonMousePointer(e, handleAreaMouseMove)}
      onPointerUp={(e) => {
        markPointerInteraction(e);
        if (e.pointerType !== "mouse") {
          handleAreaMouseUp();
        }
      }}
      onPointerLeave={(e) => {
        markPointerInteraction(e);
        if (e.pointerType !== "mouse") {
          handleAreaMouseUp();
        }
      }}
      onClick={handleCanvasDeselect}
      style={{ touchAction: "none" }}
    >
      {" "}
      {/* Badge de ayuda */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          zIndex: 30,
          background: "#2563eb",
          color: "var(--card-foreground)",
          borderRadius: 8,
          padding: "6px 16px",
          fontSize: 13,
          fontWeight: 500,
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          opacity: 0.95,
          pointerEvents: "none",
          letterSpacing: 0.1,
        }}
        className="md:flex hidden"
      >
        Mantén{" "}
        <span
          style={{
            background: "var(--card)",
            color: "#2563eb",
            borderRadius: 4,
            padding: "2px 6px",
            fontWeight: 700,
            fontSize: 12,
            margin: "0 2px",
          }}
        >
          Shift
        </span>{" "}
        al soltar para alinear a la cuadrícula
      </div>
      {!hideCanvasTopControls && (
        <div
          data-export-ignore="true"
          className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex gap-2 bg-card/80 border border-border rounded-md shadow p-2"
          style={{ minWidth: 220, justifyContent: "center" }}
        >
          <button
            type="button"
            aria-label="Alejar zoom"
            className="w-8 h-8 flex items-center justify-center rounded bg-secondary hover:bg-primary/20 text-lg font-bold"
            onClick={() => handleZoom(-0.1)}
          >
            -
          </button>
          <span className="w-14 flex items-center justify-center text-center text-sm font-medium">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            aria-label="Acercar zoom"
            className="w-8 h-8 flex items-center justify-center rounded bg-secondary hover:bg-primary/20 text-lg font-bold"
            onClick={() => handleZoom(0.1)}
          >
            +
          </button>
          <button
            type="button"
            aria-label={
              isGridVisible ? "Ocultar cuadrícula" : "Mostrar cuadrícula"
            }
            aria-pressed={isGridVisible}
            className={`px-3 py-1 rounded bg-secondary hover:bg-primary/20 text-xs font-medium ml-2 ${isGridVisible ? "bg-primary/10 text-primary" : ""}`}
            onClick={toggleGridVisibility}
          >
            {isGridVisible ? "Ocultar" : "Mostrar"} Cuadrícula
          </button>
        </div>
      )}
      {/* Canvas con cuadrícula */}
      <div
        className="absolute inset-0 flex items-center justify-center select-none"
        style={{
          overflow: "hidden",
          cursor,
          touchAction: "none",
        }}
        onMouseDown={handleMouseDown}
        onPointerDown={(e) => handleNonMousePointer(e, handleMouseDown)}
        onWheel={handleWheel}
        onClick={
          sidebarTool && sidebarTool !== "none" ? handleCanvasClick : undefined
        }
        onMouseMove={
          sidebarTool && sidebarTool !== "none"
            ? handleCanvasMouseMove
            : handleMouseMove
        }
        onPointerMove={(e) =>
          handleNonMousePointer(
            e,
            sidebarTool && sidebarTool !== "none"
              ? handleCanvasMouseMove
              : handleMouseMove,
          )
        }
        onPointerUp={(e) => {
          markPointerInteraction(e);
          if (e.pointerType !== "mouse") {
            handleMouseUp();
          }
        }}
        onPointerLeave={(e) => {
          markPointerInteraction(e);
          if (e.pointerType !== "mouse") {
            handleMouseUp();
          }
        }}
      >
        <div
          data-export-ignore="true"
          data-tutorial="undo-redo"
          style={{
            position: "absolute",
            left: 24,
            top: isCoarsePointerDevice ? 12 : 60,
            zIndex: isCoarsePointerDevice ? 80 : 300,
            pointerEvents: "auto",
          }}
        >
          <div className="flex flex-row gap-2">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              aria-label="Deshacer (Ctrl+Z)"
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: "none",
                background: canUndo ? "var(--muted)" : "var(--border)",
                color: canUndo ? "#2563eb" : "#94a3b8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                boxShadow: canUndo
                  ? "0 2px 8px color-mix(in oklch, var(--primary) 7%, transparent)"
                  : "none",
                cursor: canUndo ? "pointer" : "not-allowed",
                opacity: canUndo ? 1 : 0.6,
                transition:
                  "background 0.13s, color 0.13s, box-shadow 0.13s, transform 0.10s",
              }}
              className="hover:bg-blue-100 active:scale-95 focus:ring-2 focus:ring-blue-200"
              tabIndex={0}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9.5 8L5 12.5L9.5 17"
                  stroke="currentColor"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M5 12.5H15.5C17.9853 12.5 20 14.5147 20 17C20 19.4853 17.9853 21.5 15.5 21.5H13"
                  stroke="currentColor"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              aria-label="Rehacer (Ctrl+Y)"
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: "none",
                background: canRedo ? "var(--muted)" : "var(--border)",
                color: canRedo ? "#2563eb" : "#94a3b8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                boxShadow: canRedo
                  ? "0 2px 8px color-mix(in oklch, var(--primary) 7%, transparent)"
                  : "none",
                cursor: canRedo ? "pointer" : "not-allowed",
                opacity: canRedo ? 1 : 0.6,
                transition:
                  "background 0.13s, color 0.13s, box-shadow 0.13s, transform 0.10s",
              }}
              className="hover:bg-blue-100 active:scale-95 focus:ring-2 focus:ring-blue-200"
              tabIndex={0}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M14.5 8L19 12.5L14.5 17"
                  stroke="currentColor"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M19 12.5H8.5C6.01472 12.5 4 14.5147 4 17C4 19.4853 6.01472 21.5 8.5 21.5H11"
                  stroke="currentColor"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
        {/* Cuadrícula SVG */}
        {isGridVisible && <GridSVG zoom={zoom} offset={offset} />}
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            justifyContent: "center",
            position: "absolute",
            top: 0,
            left: 0,
            zIndex: 2,
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            transformOrigin: "0px 0px",
            transition: dragging
              ? "none"
              : "transform 0.2s cubic-bezier(.4,2,.6,1)",
            pointerEvents: "auto",
          }}
        >
          {isSelectingArea && selectionRect && (
            <div
              style={{
                position: "absolute",
                left: selectionRect.x,
                top: selectionRect.y,
                width: selectionRect.w,
                height: selectionRect.h,
                border: `${2 / zoom}px dashed #2563eb`,
                background:
                  "color-mix(in oklch, var(--primary) 8%, transparent)",
                zIndex: 100,
                pointerEvents: "none",
              }}
            />
          )}
          {/* Snap lines visuales (coordenadas canvas puras, ancho 1/zoom px) */}
          {snapLines.x !== null && (
            <div
              style={{
                position: "absolute",
                left: snapLines.x,
                top: 0,
                width: 1 / zoom,
                height: "100%",
                background: snapLines.xPerfect ? "#22c55e" : "#2563eb",
                opacity: 0.5,
                zIndex: 50,
                pointerEvents: "none",
              }}
            />
          )}
          {snapLines.y !== null && (
            <div
              style={{
                position: "absolute",
                left: 0,
                top: snapLines.y,
                width: "100%",
                height: 1 / zoom,
                background: snapLines.yPerfect ? "#22c55e" : "#2563eb",
                opacity: 0.5,
                zIndex: 50,
                pointerEvents: "none",
              }}
            />
          )}
          {canvasEntities
            .filter((entity) => getEntityType(entity) === "row")
            .map((rowEntity) => {
              const rowSeats = getRowChildren(rowEntity.id, canvasEntities)
                .slice()
                .sort((a, b) => a.x - b.x);

              return rowSeats.slice(1).map((seat, index) => {
                const prevSeat = rowSeats[index];
                const dx = seat.x - prevSeat.x;
                const dy = seat.y - prevSeat.y;
                const lineLength = Math.hypot(dx, dy);
                const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

                return (
                  <div
                    key={`row-link-${rowEntity.id}-${prevSeat.id}-${seat.id}`}
                    style={{
                      position: "absolute",
                      left: prevSeat.x,
                      top: prevSeat.y,
                      width: lineLength,
                      height: 2,
                      transform: `rotate(${angle}deg)`,
                      transformOrigin: "0 50%",
                      background:
                        "color-mix(in oklch, var(--primary) 45%, transparent)",
                      borderRadius: 999,
                      zIndex: 9,
                      pointerEvents: "none",
                    }}
                  />
                );
              });
            })}
          {canvasEntities
            .filter((entity) => getEntityType(entity) === "table-circle")
            .map((tableEntity) => {
              const tableSeats = canvasEntities
                .filter(
                  (entity) =>
                    getEntityType(entity) === "seat" &&
                    entity.parentId === tableEntity.id,
                )
                .slice()
                .sort(
                  (a, b) =>
                    Math.atan2(a.y - tableEntity.y, a.x - tableEntity.x) -
                    Math.atan2(b.y - tableEntity.y, b.x - tableEntity.x),
                );

              if (tableSeats.length < 2) return null;

              return tableSeats.map((seat, index) => {
                const nextSeat = tableSeats[(index + 1) % tableSeats.length];
                const dx = nextSeat.x - seat.x;
                const dy = nextSeat.y - seat.y;
                const lineLength = Math.hypot(dx, dy);
                const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

                return (
                  <div
                    key={`table-circle-link-${tableEntity.id}-${seat.id}-${nextSeat.id}`}
                    style={{
                      position: "absolute",
                      left: seat.x,
                      top: seat.y,
                      width: lineLength,
                      height: 2,
                      transform: `rotate(${angle}deg)`,
                      transformOrigin: "0 50%",
                      background:
                        "color-mix(in oklch, var(--primary) 42%, transparent)",
                      borderRadius: 999,
                      zIndex: 9,
                      pointerEvents: "none",
                    }}
                  />
                );
              });
            })}
          {canvasEntities
            .filter((entity) => {
              const type = getEntityType(entity);
              const isEntityInsideSelectedArea =
                type !== "area" &&
                !!entity.areaId &&
                selectedAreaIds.has(entity.areaId);
              return (
                (type === "table-circle" || type === "table-rect") &&
                selectedCanvasEntityIds.includes(entity.id) &&
                !isEntityInsideSelectedArea
              );
            })
            .map((tableEntity) => {
              const tableType = getEntityType(tableEntity);
              const tableSeats = canvasEntities.filter(
                (entity) =>
                  getEntityType(entity) === "seat" &&
                  entity.parentId === tableEntity.id,
              );
              const tableRotationDeg = tableEntity.rotation || 0;
              const tableRotationRad = (tableRotationDeg * Math.PI) / 180;
              const tableNormalX = -Math.sin(tableRotationRad);
              const tableNormalY = Math.cos(tableRotationRad);
              const rectTableHeight =
                typeof tableEntity.tableHeight === "number"
                  ? tableEntity.tableHeight
                  : Math.round(getEntityRenderSize("table-rect") * 0.55);
              const seatRenderSize = getEntityRenderSize("seat");

              const topSeat =
                tableSeats.length > 0
                  ? tableSeats.reduce((currentTop, seat) =>
                      seat.y < currentTop.y ? seat : currentTop,
                    )
                  : null;

              const labelX = topSeat?.x ?? tableEntity.x;
              const labelOffset = tableType === "table-rect" ? 52 : 42;
              const topLabelY = (topSeat?.y ?? tableEntity.y) - labelOffset;
              const showRectTopRotateHandle =
                tableType === "table-rect" &&
                selectedCanvasEntityIds.length === 1 &&
                selectedCanvasEntityIds[0] === tableEntity.id;
              const rectResizeControlDistance =
                rectTableHeight / 2 + seatRenderSize * 2 + 14;
              const rectTopControlDistance = rectResizeControlDistance + 30;
              const rectBottomLabelDistance = rectResizeControlDistance + 64;
              const rectRotateControlX =
                tableEntity.x - tableNormalX * rectTopControlDistance;
              const rectRotateControlY =
                tableEntity.y - tableNormalY * rectTopControlDistance;
              const rectBottomLabelX =
                tableEntity.x + tableNormalX * rectBottomLabelDistance;
              const rectBottomLabelY =
                tableEntity.y + tableNormalY * rectBottomLabelDistance;

              return (
                <React.Fragment key={`table-label-${tableEntity.id}`}>
                  {showRectTopRotateHandle && (
                    <button
                      type="button"
                      onMouseDown={(e) =>
                        handleRectTableRotateHandleMouseDown(e, tableEntity)
                      }
                      onPointerDown={(e) =>
                        handleNonMousePointer(e, (event) =>
                          handleRectTableRotateHandleMouseDown(
                            event,
                            tableEntity,
                          ),
                        )
                      }
                      title="Rotar mesa"
                      style={{
                        position: "absolute",
                        left: rectRotateControlX,
                        top: rectRotateControlY,
                        transform: "translate(-50%, -50%)",
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        border: "1px solid #bfdbfe",
                        background: "var(--card)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "grab",
                        zIndex: 31,
                      }}
                    >
                      <RotateCw
                        size={13}
                        strokeWidth={2.2}
                        color="var(--primary)"
                      />
                    </button>
                  )}
                  <div
                    style={{
                      position: "absolute",
                      left:
                        tableType === "table-rect" ? rectBottomLabelX : labelX,
                      top:
                        tableType === "table-rect"
                          ? rectBottomLabelY
                          : topLabelY,
                      transform:
                        tableType === "table-rect"
                          ? "translate(-50%, -50%)"
                          : "translateX(-50%)",
                      background: "var(--card)",
                      border: "1px solid #dbe3ef",
                      borderRadius: 999,
                      padding: "3px 10px",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--primary)",
                      whiteSpace: "nowrap",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      pointerEvents: "none",
                      zIndex: 30,
                    }}
                  >
                    {tableEntity.label}
                  </div>
                </React.Fragment>
              );
            })}
          {/* Renderizar entidades agregadas */}
          {layeredCanvasEntities.map((entity) => {
            const isSelected = selectedIdsWithRowChildren.includes(entity.id);
            const entityType = getEntityType(entity);
            const isSeatEntity = entityType === "seat";
            const isRowEntity = entityType === "row";
            const isCircleTableEntity = entityType === "table-circle";
            const isRectTableEntity = entityType === "table-rect";
            const isAreaEntity = entityType === "area";
            const isEntityInsideSelectedArea =
              !isAreaEntity &&
              !!entity.areaId &&
              selectedAreaIds.has(entity.areaId);
            const showSelectionDecoration =
              isSelected && !isEntityInsideSelectedArea;
            const areaShape = entity.areaShape ?? "rectangle";
            const baseAreaWidth =
              typeof entity.areaWidth === "number"
                ? entity.areaWidth
                : ENTITY_GRID_SIZE * 4;
            const baseAreaHeight =
              typeof entity.areaHeight === "number"
                ? entity.areaHeight
                : ENTITY_GRID_SIZE * 3;
            const areaSide = Math.min(baseAreaWidth, baseAreaHeight);
            const areaRenderWidth =
              areaShape === "square" || areaShape === "circle"
                ? areaSide
                : baseAreaWidth;
            const areaRenderHeight =
              areaShape === "square" || areaShape === "circle"
                ? areaSide
                : baseAreaHeight;
            const circleSeatRadius = Math.min(
              CIRCLE_TABLE_RADIUS_MAX,
              Math.max(
                CIRCLE_TABLE_RADIUS_MIN,
                typeof entity.circleSeatRadius === "number"
                  ? entity.circleSeatRadius
                  : CIRCLE_TABLE_RADIUS_MIN,
              ),
            );
            const circleSeatChildrenCount = isCircleTableEntity
              ? canvasEntities.filter(
                  (child) =>
                    getEntityType(child) === "seat" &&
                    child.parentId === entity.id,
                ).length
              : 0;
            const circleSeatMaxByRadius =
              getCircleSeatMaxByRadius(circleSeatRadius);
            const circleSeatCount = Math.min(
              circleSeatMaxByRadius,
              Math.max(
                CIRCLE_SEAT_COUNT_MIN,
                typeof entity.circleSeatCount === "number"
                  ? entity.circleSeatCount
                  : circleSeatChildrenCount > 0
                    ? circleSeatChildrenCount
                    : 8,
              ),
            );
            const rectTableWidth =
              typeof entity.tableWidth === "number"
                ? entity.tableWidth
                : getEntityRenderSize("table-rect");
            const rectTableHeight =
              typeof entity.tableHeight === "number"
                ? entity.tableHeight
                : Math.round(getEntityRenderSize("table-rect") * 0.55);
            const rowSeatCount = Math.max(1, entity.rowSeatCount ?? 8);
            const rowSeatSpacing = Math.max(
              8,
              Math.round(entity.rowSeatSpacing ?? ENTITY_GRID_SIZE),
            );
            const rowSideControlDistance =
              ((rowSeatCount - 1) * rowSeatSpacing) / 2 + rowSeatSpacing * 0.8;
            const canRemoveRowSeat = rowSeatCount > 1;
            const showSeatRotateHandle =
              isSeatEntity &&
              showSelectionDecoration &&
              selectedCanvasEntityIds.length === 1 &&
              selectedCanvasEntityIds[0] === entity.id;
            const showRectTableResizeControls =
              isRectTableEntity &&
              showSelectionDecoration &&
              selectedCanvasEntityIds.length === 1 &&
              selectedCanvasEntityIds[0] === entity.id;
            const showCircleTableCanvasControls =
              isCircleTableEntity &&
              showSelectionDecoration &&
              selectedCanvasEntityIds.length === 1 &&
              selectedCanvasEntityIds[0] === entity.id;
            const showAreaCanvasControls =
              isAreaEntity &&
              showSelectionDecoration &&
              selectedAreaIds.size === 1 &&
              selectedAreaIds.has(entity.id);
            const areaLocked = Boolean(entity.areaLocked);
            const showAreaResizeHandle = showAreaCanvasControls && !areaLocked;
            const showAreaVectorHandles =
              showAreaCanvasControls && areaShape !== "circle" && !areaLocked;
            const areaVectorPoints = showAreaVectorHandles
              ? getAreaVectorPoints(entity)
              : [];
            const circleCanAddSeat = circleSeatCount < circleSeatMaxByRadius;
            const circleCanRemoveSeat = circleSeatCount > CIRCLE_SEAT_COUNT_MIN;
            const circleControlDistance =
              circleSeatRadius + getEntityRenderSize("seat") * 1.15;
            const circleControlPairOffset = 14;
            const circleBottomControlsDistance = circleControlDistance + 18;
            const areaShapeControlDistance = areaRenderHeight / 2 + 26;
            const areaResizeHandleOffsetX = areaRenderWidth / 2 + 20;
            const areaResizeHandleOffsetY = areaRenderHeight / 2 + 20;
            const rectSeatRenderSize = getEntityRenderSize("seat");
            const rectWidthControlDistance =
              rectTableWidth / 2 + rectSeatRenderSize * 2 + 14;
            const rectHeightControlDistance =
              rectTableHeight / 2 + rectSeatRenderSize * 2 + 14;
            const rectControlPairOffset = 14;
            const rectControlCanvasYOffset = 6;
            const entityWidth = isRowEntity
              ? 1
              : isCircleTableEntity
                ? getCircleTableCoreSize(entity) + 8
                : isRectTableEntity && typeof entity.tableWidth === "number"
                  ? entity.tableWidth + 14
                  : isAreaEntity
                    ? areaRenderWidth + 8
                    : getEntityRenderSize(entity);
            const entityHeight = isRowEntity
              ? 1
              : isCircleTableEntity
                ? getCircleTableCoreSize(entity) + 8
                : isRectTableEntity && typeof entity.tableHeight === "number"
                  ? entity.tableHeight + 14
                  : isAreaEntity
                    ? areaRenderHeight + 8
                    : getEntityRenderSize(entity);
            return (
              <div
                key={
                  entity.id +
                  "-" +
                  (entity.parentId || "") +
                  "-" +
                  getEntityType(entity)
                }
                style={{
                  width: entityWidth,
                  height: entityHeight,
                  position: "absolute",
                  left: entity.x,
                  top: entity.y,
                  transform: "translate(-50%, -50%)",
                  zIndex: isSelected ? 20 : 10,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow:
                    showSelectionDecoration && !isRowEntity
                      ? "0 0 0 2px #2563eb"
                      : undefined,
                  cursor: mouseMode === "select" ? "pointer" : undefined,
                  userSelect: "none",
                }}
                onClick={(e) => handleEntityClick(e, entity.id, entity)}
                onMouseDown={(e) => handleEntityMouseDown(e, entity.id, entity)}
                onPointerDown={(e) =>
                  handleNonMousePointer(e, (event) =>
                    handleEntityMouseDown(event, entity.id, entity),
                  )
                }
              >
                {!isRowEntity && (
                  <div
                    style={{
                      transform: `rotate(${entity.rotation || 0}deg)`,
                      transformOrigin: "center",
                    }}
                  >
                    {renderEntitySvg(entity)}
                  </div>
                )}
                {isAreaEntity && (
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: `translate(-50%, -50%) rotate(${entity.rotation || 0}deg) translateY(-${areaRenderHeight / 2 + 18}px)`,
                      pointerEvents: "none",
                      zIndex: 24,
                    }}
                  >
                    <div
                      style={{
                        transform: `rotate(-${entity.rotation || 0}deg)`,
                        transformOrigin: "center",
                        background: "var(--card)",
                        border: "1px solid #dbe3ef",
                        borderRadius: 999,
                        padding: "2px 10px",
                        fontSize: 11,
                        fontWeight: 700,
                        color: entity.color || "#1d4ed8",
                        whiteSpace: "nowrap",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      }}
                    >
                      {entity.label}
                    </div>
                  </div>
                )}
                {showCircleTableCanvasControls && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!circleCanAddSeat) return;
                        handleAdjustCircleTableSeatCount(entity.id, 1);
                      }}
                      title="Agregar silla"
                      disabled={!circleCanAddSeat}
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: `translate(-50%, -50%) rotate(${entity.rotation || 0}deg) translate(${-circleControlPairOffset}px, ${circleBottomControlsDistance}px)`,
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        border: "1px solid #bfdbfe",
                        background: "var(--card)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: circleCanAddSeat ? "pointer" : "not-allowed",
                        opacity: circleCanAddSeat ? 1 : 0.45,
                        zIndex: 25,
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transform: `rotate(-${entity.rotation || 0}deg)`,
                          color: "var(--primary)",
                        }}
                      >
                        <Plus size={12} strokeWidth={2.2} />
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!circleCanRemoveSeat) return;
                        handleAdjustCircleTableSeatCount(entity.id, -1);
                      }}
                      title="Quitar silla"
                      disabled={!circleCanRemoveSeat}
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: `translate(-50%, -50%) rotate(${entity.rotation || 0}deg) translate(${circleControlPairOffset}px, ${circleBottomControlsDistance}px)`,
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        border: "1px solid #fecaca",
                        background: "var(--card)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: circleCanRemoveSeat ? "pointer" : "not-allowed",
                        opacity: circleCanRemoveSeat ? 1 : 0.45,
                        zIndex: 25,
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transform: `rotate(-${entity.rotation || 0}deg)`,
                          color: "var(--destructive)",
                        }}
                      >
                        <Minus size={12} strokeWidth={2.2} />
                      </span>
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) =>
                        handleCircleTableRadiusHandleMouseDown(e, entity)
                      }
                      title="Arrastrar para cambiar radio"
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: `translate(-50%, -50%) rotate(${entity.rotation || 0}deg) translate(0px, ${-circleControlDistance - 30}px)`,
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        border: "1px solid #bfdbfe",
                        background: "var(--card)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "ew-resize",
                        zIndex: 25,
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transform: `rotate(-${entity.rotation || 0}deg)`,
                          color: "var(--primary)",
                        }}
                      >
                        <MoveHorizontal size={13} strokeWidth={2.2} />
                      </span>
                    </button>
                  </>
                )}
                {showAreaCanvasControls && (
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: `translate(-50%, -50%) rotate(${entity.rotation || 0}deg) translateY(${areaShapeControlDistance}px)`,
                      display: "flex",
                      gap: 6,
                      zIndex: 25,
                    }}
                    title={
                      areaLocked
                        ? "Área bloqueada: desbloqueá en Propiedades para editar"
                        : "Acciones de área: forma y tamaño"
                    }
                  >
                    {[
                      { shape: "rectangle" as const, label: "Rect" },
                      { shape: "circle" as const, label: "Circ" },
                      { shape: "square" as const, label: "Cuad" },
                      { shape: "triangle" as const, label: "Tri" },
                    ].map((shapeOption) => {
                      const isActiveShape =
                        (entity.areaShape ?? "rectangle") === shapeOption.shape;

                      return (
                        <button
                          key={shapeOption.shape}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (areaLocked) return;
                            handleSetAreaShape(entity.id, shapeOption.shape);
                          }}
                          title={`Forma: ${shapeOption.label}`}
                          style={{
                            minWidth: 36,
                            height: 22,
                            borderRadius: 999,
                            border: isActiveShape
                              ? "1px solid #2563eb"
                              : "1px solid #dbe3ef",
                            background: isActiveShape
                              ? "color-mix(in oklch, var(--primary) 8%, var(--card))"
                              : "var(--card)",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            padding: "0 8px",
                            opacity: areaLocked ? 0.45 : 1,
                          }}
                        >
                          <span
                            style={{
                              transform: `rotate(-${entity.rotation || 0}deg)`,
                              color: isActiveShape
                                ? "var(--primary)"
                                : "var(--muted-foreground)",
                              fontSize: 10,
                              fontWeight: 700,
                              lineHeight: 1,
                            }}
                          >
                            {shapeOption.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {showAreaCanvasControls && (
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: `translate(-50%, -50%) rotate(${entity.rotation || 0}deg) translateY(${areaShapeControlDistance + 30}px)`,
                      pointerEvents: "none",
                      zIndex: 25,
                    }}
                  >
                    <div
                      style={{
                        transform: `rotate(-${entity.rotation || 0}deg)`,
                        background: areaLocked
                          ? "color-mix(in oklch, var(--destructive) 8%, var(--card))"
                          : "color-mix(in oklch, var(--primary) 8%, var(--card))",
                        border: areaLocked
                          ? "1px solid #fdba74"
                          : "1px solid #bfdbfe",
                        borderRadius: 999,
                        padding: "2px 8px",
                        fontSize: 10,
                        fontWeight: 600,
                        color: areaLocked
                          ? "var(--destructive)"
                          : "var(--primary)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {areaLocked
                        ? "Área bloqueada"
                        : "Modo área • Ctrl+click para editar objetos internos"}
                    </div>
                  </div>
                )}
                {showAreaVectorHandles &&
                  areaVectorPoints.map((point, pointIndex) => {
                    const isEditingPoint =
                      editingAreaVectorPoint != null &&
                      editingAreaVectorPoint.areaId === entity.id &&
                      editingAreaVectorPoint.pointIndex === pointIndex;

                    return (
                      <button
                        key={`${entity.id}-area-point-${pointIndex}`}
                        type="button"
                        onMouseDown={(e) =>
                          handleAreaVectorPointMouseDown(e, entity, pointIndex)
                        }
                        onPointerDown={(e) =>
                          handleNonMousePointer(e, (event) =>
                            handleAreaVectorPointMouseDown(
                              event,
                              entity,
                              pointIndex,
                            ),
                          )
                        }
                        title={`Punto vectorial ${pointIndex + 1}`}
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: `translate(-50%, -50%) rotate(${entity.rotation || 0}deg) translate(${point.x * areaRenderWidth}px, ${point.y * areaRenderHeight}px)`,
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          border: "1px solid #ffffff",
                          background: isEditingPoint
                            ? "var(--primary)"
                            : "color-mix(in oklch, var(--primary) 60%, transparent)",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
                          cursor: "grab",
                          zIndex: 26,
                        }}
                      />
                    );
                  })}
                {showAreaResizeHandle && (
                  <>
                    <button
                      type="button"
                      onMouseDown={(e) =>
                        handleAreaResizeHandleMouseDown(
                          e,
                          entity,
                          "bottom-right",
                        )
                      }
                      onPointerDown={(e) =>
                        handleNonMousePointer(e, (event) =>
                          handleAreaResizeHandleMouseDown(
                            event,
                            entity,
                            "bottom-right",
                          ),
                        )
                      }
                      title="Arrastrar para redimensionar área"
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: `translate(-50%, -50%) rotate(${entity.rotation || 0}deg) translate(${areaResizeHandleOffsetX}px, ${areaResizeHandleOffsetY}px)`,
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        border: "1px solid #bfdbfe",
                        background: "var(--card)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "nwse-resize",
                        zIndex: 25,
                        transition:
                          "background 0.15s, border-color 0.15s, box-shadow 0.15s",
                      }}
                      className="hover:bg-blue-50 hover:border-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <span
                        className="text-blue-700"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transform: `rotate(-${entity.rotation || 0}deg)`,
                        }}
                      >
                        <MoveDiagonal2 size={13} strokeWidth={2.2} />
                      </span>
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) =>
                        handleAreaResizeHandleMouseDown(e, entity, "top-right")
                      }
                      onPointerDown={(e) =>
                        handleNonMousePointer(e, (event) =>
                          handleAreaResizeHandleMouseDown(
                            event,
                            entity,
                            "top-right",
                          ),
                        )
                      }
                      title="Arrastrar para redimensionar área"
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: `translate(-50%, -50%) rotate(${entity.rotation || 0}deg) translate(${areaResizeHandleOffsetX}px, ${-areaResizeHandleOffsetY}px)`,
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        border: "1px solid #bfdbfe",
                        background: "var(--card)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "nesw-resize",
                        zIndex: 25,
                        transition:
                          "background 0.15s, border-color 0.15s, box-shadow 0.15s",
                      }}
                      className="hover:bg-blue-50 hover:border-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <span
                        className="text-blue-700"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transform: `rotate(-${entity.rotation || 0}deg)`,
                        }}
                      >
                        <MoveDiagonal2 size={13} strokeWidth={2.2} />
                      </span>
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) =>
                        handleAreaResizeHandleMouseDown(e, entity, "top-left")
                      }
                      onPointerDown={(e) =>
                        handleNonMousePointer(e, (event) =>
                          handleAreaResizeHandleMouseDown(
                            event,
                            entity,
                            "top-left",
                          ),
                        )
                      }
                      title="Arrastrar para redimensionar área"
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: `translate(-50%, -50%) rotate(${entity.rotation || 0}deg) translate(${-areaResizeHandleOffsetX}px, ${-areaResizeHandleOffsetY}px)`,
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        border: "1px solid #bfdbfe",
                        background: "var(--card)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "nwse-resize",
                        zIndex: 25,
                        transition:
                          "background 0.15s, border-color 0.15s, box-shadow 0.15s",
                      }}
                      className="hover:bg-blue-50 hover:border-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <span
                        className="text-blue-700"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transform: `rotate(-${entity.rotation || 0}deg)`,
                        }}
                      >
                        <MoveDiagonal2 size={13} strokeWidth={2.2} />
                      </span>
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) =>
                        handleAreaResizeHandleMouseDown(
                          e,
                          entity,
                          "bottom-left",
                        )
                      }
                      onPointerDown={(e) =>
                        handleNonMousePointer(e, (event) =>
                          handleAreaResizeHandleMouseDown(
                            event,
                            entity,
                            "bottom-left",
                          ),
                        )
                      }
                      title="Arrastrar para redimensionar área"
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: `translate(-50%, -50%) rotate(${entity.rotation || 0}deg) translate(${-areaResizeHandleOffsetX}px, ${areaResizeHandleOffsetY}px)`,
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        border: "1px solid #bfdbfe",
                        background: "var(--card)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "nesw-resize",
                        zIndex: 25,
                        transition:
                          "background 0.15s, border-color 0.15s, box-shadow 0.15s",
                      }}
                      className="hover:bg-blue-50 hover:border-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <span
                        className="text-blue-700"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transform: `rotate(-${entity.rotation || 0}deg)`,
                        }}
                      >
                        <MoveDiagonal2 size={13} strokeWidth={2.2} />
                      </span>
                    </button>
                  </>
                )}
                {isRowEntity && showSelectionDecoration && (
                  <>
                    <button
                      type="button"
                      onMouseDown={(e) =>
                        handleRowRotateHandleMouseDown(e, entity)
                      }
                      onPointerDown={(e) =>
                        handleNonMousePointer(e, (event) =>
                          handleRowRotateHandleMouseDown(event, entity),
                        )
                      }
                      title="Rotar fila"
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: `translate(-50%, -50%) rotate(${entity.rotation || 0}deg) translateY(0px)`,
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        border: "1px solid #bfdbfe",
                        background: "var(--card)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "grab",
                        zIndex: 25,
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transform: `rotate(-${entity.rotation || 0}deg)`,
                          color: "var(--primary)",
                        }}
                      >
                        <RotateCw size={13} strokeWidth={2.2} />
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAdjustRowSeatCount(entity.id, 1);
                      }}
                      title="Agregar silla"
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: `translate(-50%, -50%) rotate(${entity.rotation || 0}deg) translate(${rowSideControlDistance}px, ${ENTITY_GRID_SIZE}px)`,
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        border: "1px solid #bfdbfe",
                        background: "var(--card)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        zIndex: 25,
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transform: `rotate(-${entity.rotation || 0}deg)`,
                          color: "var(--primary)",
                        }}
                      >
                        <Plus size={12} strokeWidth={2.2} />
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAdjustRowSeatCount(entity.id, 1);
                      }}
                      title="Agregar silla"
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: `translate(-50%, -50%) rotate(${entity.rotation || 0}deg) translate(${-rowSideControlDistance}px, ${ENTITY_GRID_SIZE}px)`,
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        border: "1px solid #bfdbfe",
                        background: "var(--card)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        zIndex: 25,
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transform: `rotate(-${entity.rotation || 0}deg)`,
                          color: "var(--primary)",
                        }}
                      >
                        <Plus size={12} strokeWidth={2.2} />
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!canRemoveRowSeat) return;
                        handleAdjustRowSeatCount(entity.id, -1);
                      }}
                      title="Quitar silla"
                      disabled={!canRemoveRowSeat}
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: `translate(-50%, -50%) rotate(${entity.rotation || 0}deg) translate(${rowSideControlDistance}px, ${ENTITY_GRID_SIZE + 24}px)`,
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        border: "1px solid #fecaca",
                        background: "var(--card)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: canRemoveRowSeat ? "pointer" : "not-allowed",
                        opacity: canRemoveRowSeat ? 1 : 0.45,
                        zIndex: 25,
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transform: `rotate(-${entity.rotation || 0}deg)`,
                          color: "var(--destructive)",
                        }}
                      >
                        <Minus size={12} strokeWidth={2.2} />
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!canRemoveRowSeat) return;
                        handleAdjustRowSeatCount(entity.id, -1);
                      }}
                      title="Quitar silla"
                      disabled={!canRemoveRowSeat}
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: `translate(-50%, -50%) rotate(${entity.rotation || 0}deg) translate(${-rowSideControlDistance}px, ${ENTITY_GRID_SIZE + 24}px)`,
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        border: "1px solid #fecaca",
                        background: "var(--card)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: canRemoveRowSeat ? "pointer" : "not-allowed",
                        opacity: canRemoveRowSeat ? 1 : 0.45,
                        zIndex: 25,
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transform: `rotate(-${entity.rotation || 0}deg)`,
                          color: "var(--destructive)",
                        }}
                      >
                        <Minus size={12} strokeWidth={2.2} />
                      </span>
                    </button>
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: `translate(-50%, -50%) rotate(${entity.rotation || 0}deg) translateY(-28px)`,
                        pointerEvents: "none",
                      }}
                    >
                      <div
                        style={{
                          transform: `rotate(-${entity.rotation || 0}deg)`,
                          transformOrigin: "center",
                          background: "var(--card)",
                          border: "1px solid #dbe3ef",
                          borderRadius: 999,
                          padding: "3px 10px",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--primary)",
                          whiteSpace: "nowrap",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        }}
                      >
                        {entity.label}
                      </div>
                    </div>
                  </>
                )}
                {showSeatRotateHandle && (
                  <>
                    <button
                      type="button"
                      onMouseDown={(e) =>
                        handleSeatRotateHandleMouseDown(e, entity)
                      }
                      onPointerDown={(e) =>
                        handleNonMousePointer(e, (event) =>
                          handleSeatRotateHandleMouseDown(event, entity),
                        )
                      }
                      title="Rotar silla"
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: `translate(-50%, -50%) rotate(${entity.rotation || 0}deg) translateY(-24px)`,
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        border: "1px solid #bfdbfe",
                        background: "var(--card)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "grab",
                        zIndex: 25,
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transform: `rotate(-${entity.rotation || 0}deg)`,
                          color: "var(--primary)",
                        }}
                      >
                        <RotateCw size={12} strokeWidth={2.2} />
                      </span>
                    </button>
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: `translate(-50%, -50%) rotate(${entity.rotation || 0}deg) translateY(26px)`,
                        pointerEvents: "none",
                        zIndex: 24,
                        maxWidth: 80,
                        width: "max-content",
                      }}
                    >
                      <div
                        style={{
                          transform: `rotate(-${entity.rotation || 0}deg)`,
                          transformOrigin: "center",
                          background: "var(--card)",
                          border: "1px solid #dbe3ef",
                          borderRadius: 999,
                          padding: "2px 9px",
                          fontSize: 11,
                          fontWeight: 600,
                          color: "var(--primary)",
                          whiteSpace: "nowrap",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                          textOverflow: "ellipsis",
                          overflow: "hidden",
                          maxWidth: 80,
                          minWidth: 0,
                          cursor: "pointer",
                        }}
                        title={entity.label}
                      >
                        {entity.label}
                      </div>
                    </div>
                  </>
                )}
                {showRectTableResizeControls && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAdjustRectTableDimension(entity.id, "width", 1);
                      }}
                      title="Aumentar ancho (lado derecho)"
                      style={{
                        position: "absolute",
                        top: `calc(50% + ${rectControlCanvasYOffset}px)`,
                        left: "50%",
                        transform: `translate(-50%, -50%) rotate(${entity.rotation || 0}deg) translate(${rectWidthControlDistance}px, ${-rectControlPairOffset}px)`,
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        border: "1px solid #bfdbfe",
                        background: "var(--card)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        zIndex: 25,
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transform: `rotate(-${entity.rotation || 0}deg)`,
                          color: "var(--primary)",
                        }}
                      >
                        <Plus size={12} strokeWidth={2.2} />
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAdjustRectTableDimension(entity.id, "width", -1);
                      }}
                      title="Reducir ancho (lado derecho)"
                      style={{
                        position: "absolute",
                        top: `calc(50% + ${rectControlCanvasYOffset}px)`,
                        left: "50%",
                        transform: `translate(-50%, -50%) rotate(${entity.rotation || 0}deg) translate(${rectWidthControlDistance}px, ${rectControlPairOffset}px)`,
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        border: "1px solid #fecaca",
                        background: "var(--card)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        zIndex: 25,
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transform: `rotate(-${entity.rotation || 0}deg)`,
                          color: "var(--destructive)",
                        }}
                      >
                        <Minus size={12} strokeWidth={2.2} />
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAdjustRectTableDimension(entity.id, "width", 1);
                      }}
                      title="Aumentar ancho (lado izquierdo)"
                      style={{
                        position: "absolute",
                        top: `calc(50% + ${rectControlCanvasYOffset}px)`,
                        left: "50%",
                        transform: `translate(-50%, -50%) rotate(${entity.rotation || 0}deg) translate(${-rectWidthControlDistance}px, ${-rectControlPairOffset}px)`,
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        border: "1px solid #bfdbfe",
                        background: "var(--card)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        zIndex: 25,
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transform: `rotate(-${entity.rotation || 0}deg)`,
                          color: "var(--primary)",
                        }}
                      >
                        <Plus size={12} strokeWidth={2.2} />
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAdjustRectTableDimension(entity.id, "width", -1);
                      }}
                      title="Reducir ancho (lado izquierdo)"
                      style={{
                        position: "absolute",
                        top: `calc(50% + ${rectControlCanvasYOffset}px)`,
                        left: "50%",
                        transform: `translate(-50%, -50%) rotate(${entity.rotation || 0}deg) translate(${-rectWidthControlDistance}px, ${rectControlPairOffset}px)`,
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        border: "1px solid #fecaca",
                        background: "var(--card)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        zIndex: 25,
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transform: `rotate(-${entity.rotation || 0}deg)`,
                          color: "var(--destructive)",
                        }}
                      >
                        <Minus size={12} strokeWidth={2.2} />
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAdjustRectTableDimension(entity.id, "height", 1);
                      }}
                      title="Aumentar alto (lado inferior)"
                      style={{
                        position: "absolute",
                        top: `calc(50% + ${rectControlCanvasYOffset}px)`,
                        left: "50%",
                        transform: `translate(-50%, -50%) rotate(${entity.rotation || 0}deg) translate(${-rectControlPairOffset}px, ${rectHeightControlDistance}px)`,
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        border: "1px solid #bfdbfe",
                        background: "var(--card)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        zIndex: 25,
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transform: `rotate(-${entity.rotation || 0}deg)`,
                          color: "var(--primary)",
                        }}
                      >
                        <Plus size={12} strokeWidth={2.2} />
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAdjustRectTableDimension(entity.id, "height", -1);
                      }}
                      title="Reducir alto (lado inferior)"
                      style={{
                        position: "absolute",
                        top: `calc(50% + ${rectControlCanvasYOffset}px)`,
                        left: "50%",
                        transform: `translate(-50%, -50%) rotate(${entity.rotation || 0}deg) translate(${rectControlPairOffset}px, ${rectHeightControlDistance}px)`,
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        border: "1px solid #fecaca",
                        background: "var(--card)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        zIndex: 25,
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transform: `rotate(-${entity.rotation || 0}deg)`,
                          color: "var(--destructive)",
                        }}
                      >
                        <Minus size={12} strokeWidth={2.2} />
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAdjustRectTableDimension(entity.id, "height", 1);
                      }}
                      title="Aumentar alto (lado superior)"
                      style={{
                        position: "absolute",
                        top: `calc(50% + ${rectControlCanvasYOffset}px)`,
                        left: "50%",
                        transform: `translate(-50%, -50%) rotate(${entity.rotation || 0}deg) translate(${-rectControlPairOffset}px, ${-rectHeightControlDistance}px)`,
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        border: "1px solid #bfdbfe",
                        background: "var(--card)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        zIndex: 25,
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transform: `rotate(-${entity.rotation || 0}deg)`,
                          color: "var(--primary)",
                        }}
                      >
                        <Plus size={12} strokeWidth={2.2} />
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAdjustRectTableDimension(entity.id, "height", -1);
                      }}
                      title="Reducir alto (lado superior)"
                      style={{
                        position: "absolute",
                        top: `calc(50% + ${rectControlCanvasYOffset}px)`,
                        left: "50%",
                        transform: `translate(-50%, -50%) rotate(${entity.rotation || 0}deg) translate(${rectControlPairOffset}px, ${-rectHeightControlDistance}px)`,
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        border: "1px solid #fecaca",
                        background: "var(--card)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        zIndex: 25,
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transform: `rotate(-${entity.rotation || 0}deg)`,
                          color: "var(--destructive)",
                        }}
                      >
                        <Minus size={12} strokeWidth={2.2} />
                      </span>
                    </button>
                  </>
                )}
              </div>
            );
          })}
          {/* Menú contextual de acciones (multi-selección, sin copiar, eliminar directo) */}
          {selectedCanvasEntityIds.length > 0 &&
            (menuPos ||
              rowQuickActionsAnchor ||
              standaloneSeatQuickActionsAnchor ||
              tableQuickActionsAnchor ||
              areaQuickActionsAnchor) && (
              <div
                role="toolbar"
                aria-label="Acciones rápidas de selección"
                style={{
                  position: "absolute",
                  left: isRowQuickActions
                    ? (rowQuickActionsAnchor?.x ?? menuPos?.x ?? 0)
                    : isAreaQuickActions && areaQuickActionsAnchor
                      ? areaQuickActionsAnchor.x
                      : isTableQuickActions && tableQuickActionsAnchor
                        ? tableQuickActionsAnchor.x
                        : isStandaloneSeatQuickActions
                          ? (standaloneSeatQuickActionsAnchor?.x ??
                            menuPos?.x ??
                            0)
                          : (menuPos?.x ?? 0) + 20,
                  top: isRowQuickActions
                    ? (rowQuickActionsAnchor?.y ?? menuPos?.y ?? 0)
                    : isAreaQuickActions && areaQuickActionsAnchor
                      ? areaQuickActionsAnchor.y
                      : isTableQuickActions && tableQuickActionsAnchor
                        ? tableQuickActionsAnchor.y
                        : isStandaloneSeatQuickActions
                          ? (standaloneSeatQuickActionsAnchor?.y ??
                            menuPos?.y ??
                            0)
                          : (menuPos?.y ?? 0) - 40,
                  transform: isRowQuickActions
                    ? `translate(-50%, -50%) rotate(${rowQuickActionsAnchor?.rotationDeg ?? 0}deg)`
                    : isRectTableQuickActions && tableQuickActionsAnchor
                      ? `translate(-50%, -50%) rotate(${tableQuickActionsAnchor.rotationDeg ?? 0}deg)`
                      : isStandaloneSeatQuickActions
                        ? `translate(-50%, -50%) rotate(${standaloneSeatQuickActionsAnchor?.rotationDeg ?? 0}deg)`
                        : undefined,
                  zIndex: 100,
                  background: "var(--card)",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                  padding: 4,
                  display: "flex",
                  flexDirection: isRowQuickActions ? "row" : "column",
                  gap: 2,
                  alignItems: "center",
                  minWidth: isRowQuickActions ? 120 : 40,
                  pointerEvents: "auto",
                  opacity:
                    isAreaQuickActions && isSelectedAreaLocked ? 0.55 : 1,
                }}
                title={
                  isAreaQuickActions && isSelectedAreaLocked
                    ? "Área bloqueada: desbloqueá en Propiedades para usar acciones rápidas"
                    : undefined
                }
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                {canRotateQuickAction && (
                  <button
                    type="button"
                    aria-label="Rotar selección"
                    title="Rotar"
                    onClick={handleRotate}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                    }}
                    disabled={isAreaQuickActions && isSelectedAreaLocked}
                    style={{
                      background: "none",
                      border: "none",
                      borderRadius: 6,
                      padding: 6,
                      cursor:
                        isAreaQuickActions && isSelectedAreaLocked
                          ? "not-allowed"
                          : "pointer",
                      width: 32,
                      height: 32,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "background 0.15s",
                    }}
                    className="hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transform: quickActionsIconTransform,
                      }}
                    >
                      <RotateCw size={18} strokeWidth={2} />
                    </span>
                  </button>
                )}
                {canMirrorQuickAction && (
                  <button
                    type="button"
                    aria-label="Espejar selección"
                    title="Espejar"
                    onClick={handleMirror}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                    }}
                    disabled={isAreaQuickActions && isSelectedAreaLocked}
                    style={{
                      background: "none",
                      border: "none",
                      borderRadius: 6,
                      padding: 6,
                      cursor:
                        isAreaQuickActions && isSelectedAreaLocked
                          ? "not-allowed"
                          : "pointer",
                      width: 32,
                      height: 32,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "background 0.15s",
                    }}
                    className="hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transform: quickActionsIconTransform,
                      }}
                    >
                      <FlipHorizontal size={18} strokeWidth={2} />
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Eliminar selección"
                  title="Eliminar"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                  }}
                  onClick={() => {
                    if (selectedCanvasEntityIds.length === 0) return;
                    const selectedIdsSnapshot = [...selectedCanvasEntityIds];
                    const expandedIdsSnapshot = expandSelectionWithRowChildren(
                      selectedIdsSnapshot,
                      canvasEntities,
                    );
                    openDeleteConfirm(
                      {
                        title: "Confirmar eliminación",
                        description:
                          selectedIdsSnapshot.length === 1
                            ? "¿Seguro que querés eliminar la entidad seleccionada?"
                            : `¿Seguro que querés eliminar ${selectedIdsSnapshot.length} entidades seleccionadas?`,
                      },
                      () => {
                        setEntitiesWithHistory((prev) =>
                          prev.filter(
                            (s) => !expandedIdsSnapshot.includes(s.id),
                          ),
                        );
                        setSelectedCanvasEntityIds([]);
                        setMenuPos(null);
                      },
                    );
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    borderRadius: 6,
                    padding: 6,
                    cursor: "pointer",
                    width: 32,
                    height: 32,
                    display: readOnly ? "none" : "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--destructive)",
                    transition: "background 0.15s",
                  }}
                  className="hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transform: quickActionsIconTransform,
                    }}
                  >
                    <Trash2 size={18} strokeWidth={2} />
                  </span>
                </button>
              </div>
            )}
        </div>
      </div>
      {!hideCanvasFooterActions && !readOnly && (
        <div
          data-export-ignore="true"
          style={{
            position: "absolute",
            left: 32,
            bottom: 32,
            zIndex: 300,
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          <button
            onClick={() => {
              if (canvasEntities.length === 0) return;
              const entityCount = canvasEntities.length;
              openDeleteConfirm(
                {
                  title: "Limpiar canvas",
                  description: `Se eliminarán ${entityCount} entidades. Esta acción quedará en el historial.`,
                  confirmText: "Limpiar",
                },
                () => {
                  setEntitiesWithHistory([]);
                  setSelectedCanvasEntityIds([]);
                  setMenuPos(null);
                },
              );
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/90 px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-destructive focus:outline-none focus:ring-2 focus:ring-primary/20"
            tabIndex={0}
            aria-label="Limpiar Canva"
          >
            <Trash2 size={16} />
            Limpiar Canva
          </button>
        </div>
      )}
      <ConfirmModal
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        destructive={confirmDialog.destructive}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}
