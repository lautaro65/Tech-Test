import {
  ENTITY_GRID_SIZE,
  type AreaShape,
  type AreaVectorPoint,
  type Entity,
  getEntityRenderSize,
  getEntityType,
} from "./entities";

export type AreaAssociationMode = "center" | "overlap";

const AREA_VECTOR_COORD_MIN = -0.5;
const AREA_VECTOR_COORD_MAX = 0.5;

export const clampAreaVectorCoord = (value: number) =>
  Math.max(AREA_VECTOR_COORD_MIN, Math.min(AREA_VECTOR_COORD_MAX, value));

export const getDefaultAreaVectorPoints = (
  shape: AreaShape,
): AreaVectorPoint[] => {
  if (shape === "triangle") {
    return [
      { x: 0, y: -0.48 },
      { x: -0.46, y: 0.46 },
      { x: 0.46, y: 0.46 },
    ];
  }

  if (shape === "circle") {
    return [];
  }

  return [
    { x: -0.5, y: -0.5 },
    { x: 0.5, y: -0.5 },
    { x: 0.5, y: 0.5 },
    { x: -0.5, y: 0.5 },
  ];
};

export const getAreaVectorPoints = (entity: Entity): AreaVectorPoint[] => {
  const shape = entity.areaShape ?? "rectangle";
  if (shape === "circle") return [];

  const defaultPoints = getDefaultAreaVectorPoints(shape);
  const sourcePoints = entity.areaVectorPoints;

  if (!sourcePoints || sourcePoints.length !== defaultPoints.length) {
    return defaultPoints;
  }

  return sourcePoints.map((point, index) => {
    const fallback = defaultPoints[index];
    return {
      x: clampAreaVectorCoord(
        typeof point?.x === "number" ? point.x : fallback.x,
      ),
      y: clampAreaVectorCoord(
        typeof point?.y === "number" ? point.y : fallback.y,
      ),
    };
  });
};

const isPointInsidePolygon = (
  x: number,
  y: number,
  polygon: AreaVectorPoint[],
) => {
  if (polygon.length < 3) return false;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersects =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-9) + xi;
    if (intersects) inside = !inside;
  }

  return inside;
};

export const getAreaRenderDimensions = (area: Entity) => {
  const shape = area.areaShape ?? "rectangle";
  const baseWidth =
    typeof area.areaWidth === "number" ? area.areaWidth : ENTITY_GRID_SIZE * 4;
  const baseHeight =
    typeof area.areaHeight === "number" ? area.areaHeight : ENTITY_GRID_SIZE * 3;

  if (shape === "square" || shape === "circle") {
    const side = Math.min(baseWidth, baseHeight);
    return { width: side, height: side };
  }

  return { width: baseWidth, height: baseHeight };
};

const isPointInsideArea = (x: number, y: number, area: Entity) => {
  const shape = area.areaShape ?? "rectangle";
  const { width, height } = getAreaRenderDimensions(area);
  if (width <= 0 || height <= 0) return false;

  const dx = x - area.x;
  const dy = y - area.y;
  const rotationRad = ((area.rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(rotationRad);
  const sin = Math.sin(rotationRad);
  const localX = dx * cos + dy * sin;
  const localY = -dx * sin + dy * cos;
  const normalizedX = localX / width;
  const normalizedY = localY / height;

  if (shape === "circle") {
    const rx = localX / (width / 2);
    const ry = localY / (height / 2);
    return rx * rx + ry * ry <= 1;
  }

  const polygon = getAreaVectorPoints(area);
  return isPointInsidePolygon(normalizedX, normalizedY, polygon);
};

export const applyAreaAssociations = (
  entities: Entity[],
  mode: AreaAssociationMode = "center",
) => {
  const areas = entities.filter((entity) => getEntityType(entity) === "area");
  if (areas.length === 0) {
    let changed = false;
    const next = entities.map((entity) => {
      if (getEntityType(entity) === "area") return entity;
      if (!entity.areaId) return entity;
      changed = true;
      return { ...entity, areaId: undefined };
    });
    return changed ? next : entities;
  }

  const areaSizeById = new Map(
    areas.map((area) => {
      const { width, height } = getAreaRenderDimensions(area);
      return [area.id, width * height] as const;
    }),
  );

  const resolveEntityAreaIdByOverlap = (entity: Entity) => {
    const { halfWidth, halfHeight } = getEntityBoundsHalfSize(entity);
    const samplePoints = getEntitySamplePoints(entity, halfWidth, halfHeight);
    if (samplePoints.length === 0) return undefined;

    const scoreByAreaId = new Map<string, number>();
    samplePoints.forEach((point) => {
      areas.forEach((area) => {
        if (!isPointInsideArea(point.x, point.y, area)) return;
        scoreByAreaId.set(area.id, (scoreByAreaId.get(area.id) ?? 0) + 1);
      });
    });

    if (scoreByAreaId.size === 0) return undefined;

    let bestAreaId: string | undefined;
    let bestScore = -1;
    let bestAreaSize = Number.POSITIVE_INFINITY;

    scoreByAreaId.forEach((score, areaId) => {
      const areaSize = areaSizeById.get(areaId) ?? Number.POSITIVE_INFINITY;
      if (score > bestScore) {
        bestAreaId = areaId;
        bestScore = score;
        bestAreaSize = areaSize;
        return;
      }

      if (score === bestScore && areaSize < bestAreaSize) {
        bestAreaId = areaId;
        bestAreaSize = areaSize;
      }
    });

    return bestAreaId;
  };

  const findContainingAreaId = (x: number, y: number) => {
    const containing = areas.filter((area) => isPointInsideArea(x, y, area));
    if (containing.length === 0) return undefined;

    containing.sort(
      (first, second) =>
        (areaSizeById.get(first.id) ?? Number.POSITIVE_INFINITY) -
        (areaSizeById.get(second.id) ?? Number.POSITIVE_INFINITY),
    );
    return containing[0].id;
  };

  const entityById = new Map(entities.map((entity) => [entity.id, entity]));
  const topLevelAreaIdByEntityId = new Map<string, string | undefined>();

  entities.forEach((entity) => {
    if (getEntityType(entity) === "area") return;
    if (entity.parentId) return;
    const areaId =
      mode === "overlap"
        ? resolveEntityAreaIdByOverlap(entity)
        : findContainingAreaId(entity.x, entity.y);
    topLevelAreaIdByEntityId.set(entity.id, areaId);
  });

  const memoAreaIdByEntityId = new Map<string, string | undefined>();
  const resolveAreaId = (entity: Entity): string | undefined => {
    if (getEntityType(entity) === "area") return undefined;
    const memo = memoAreaIdByEntityId.get(entity.id);
    if (memoAreaIdByEntityId.has(entity.id)) return memo;

    if (!entity.parentId) {
      const areaId = topLevelAreaIdByEntityId.get(entity.id);
      memoAreaIdByEntityId.set(entity.id, areaId);
      return areaId;
    }

    const parent = entityById.get(entity.parentId);
    if (!parent) {
      memoAreaIdByEntityId.set(entity.id, undefined);
      return undefined;
    }

    const areaId = resolveAreaId(parent);
    memoAreaIdByEntityId.set(entity.id, areaId);
    return areaId;
  };

  let changed = false;
  const next = entities.map((entity) => {
    if (getEntityType(entity) === "area") return entity;
    const resolvedAreaId = resolveAreaId(entity);
    if (entity.areaId === resolvedAreaId) return entity;
    changed = true;
    return { ...entity, areaId: resolvedAreaId };
  });

  return changed ? next : entities;
};

const getEntityBoundsHalfSize = (entity: Entity) => {
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

const getEntitySamplePoints = (
  entity: Entity,
  halfWidth: number,
  halfHeight: number,
) => {
  const rotationRad = ((entity.rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(rotationRad);
  const sin = Math.sin(rotationRad);

  const localPoints = [
    { x: 0, y: 0 },
    { x: -halfWidth, y: 0 },
    { x: halfWidth, y: 0 },
    { x: 0, y: -halfHeight },
    { x: 0, y: halfHeight },
    { x: -halfWidth, y: -halfHeight },
    { x: halfWidth, y: -halfHeight },
    { x: -halfWidth, y: halfHeight },
    { x: halfWidth, y: halfHeight },
  ];

  return localPoints.map((point) => ({
    x: entity.x + point.x * cos - point.y * sin,
    y: entity.y + point.x * sin + point.y * cos,
  }));
};