export type EntityType =
  | "seat"
  | "row"
  | "table-circle"
  | "table-rect"
  | "area";
export type AreaShape = "rectangle" | "circle" | "square" | "triangle";
export type AreaVectorPoint = { x: number; y: number };
export type SidebarTool = "none" | EntityType;

export type SidebarToolConfig = {
  type: EntityType;
  label: string;
  tooltip: string;
  highlighted?: boolean;
  selectable?: boolean;
};

export const SIDEBAR_TOOL_CONFIG: SidebarToolConfig[] = [
  {
    type: "seat",
    label: "Silla",
    tooltip: "Añadir silla individual",
    highlighted: true,
    selectable: true,
  },
  {
    type: "row",
    label: "Fila",
    tooltip: "Añadir fila de asientos",
    selectable: true,
  },
  {
    type: "table-circle",
    label: "Mesa circular",
    tooltip: "Añadir mesa circular",
    selectable: true,
  },
  {
    type: "table-rect",
    label: "Mesa rectangular",
    tooltip: "Añadir mesa rectangular o cuadrada",
    selectable: true,
  },
  {
    type: "area",
    label: "Área",
    tooltip: "Añadir área de sector",
    selectable: true,
  },
];

export type Entity = {
  id: string;
  x: number;
  y: number;
  label: string;
  rotation?: number;
  type?: EntityType;
  color?: string;
  parentId?: string;
  areaId?: string;
  tableWidth?: number;
  tableHeight?: number;
  rectLayout?: RectTableLayout;
  areaWidth?: number;
  areaHeight?: number;
  areaLocked?: boolean;
  areaShape?: AreaShape;
  areaVectorPoints?: AreaVectorPoint[];
  rowSeatCount?: number;
  rowSeatSpacing?: number;
  rowCurvature?: number;
  circleSeatCount?: number;
  circleSeatRadius?: number;
};

export type RectTableLayout = {
  topSeats: number;
  bottomSeats: number;
  leftSeats: number;
  rightSeats: number;
};

export type EntityTypeInput = { type?: EntityType };

export type EntityUpdate = Partial<
  Pick<
    Entity,
    | "x"
    | "y"
    | "label"
    | "rotation"
    | "color"
    | "areaId"
    | "tableWidth"
    | "tableHeight"
    | "rectLayout"
    | "areaWidth"
    | "areaHeight"
    | "areaLocked"
    | "areaShape"
    | "areaVectorPoints"
    | "rowSeatCount"
    | "rowSeatSpacing"
    | "rowCurvature"
    | "circleSeatCount"
    | "circleSeatRadius"
  >
>;

export type CollidableEntity = Pick<Entity, "id" | "x" | "y"> &
  EntityTypeInput;

type EntitySpec = {
  radius: number;
  renderSize: number;
  labelPrefix: string;
};

export const ENTITY_GRID_SIZE = 32;

export const ENTITY_SPEC: Record<EntityType, EntitySpec> = {
  seat: { radius: 12, renderSize: 32, labelPrefix: "Silla " },
  row: { radius: 16, renderSize: 32, labelPrefix: "R" },
  "table-circle": { radius: 25, renderSize: 46, labelPrefix: "TC" },
  "table-rect": { radius: 26, renderSize: 50, labelPrefix: "TR" },
  area: { radius: 34, renderSize: 72, labelPrefix: "A" },
};

const DEFAULT_RECT_TABLE_LAYOUT: RectTableLayout = {
  topSeats: 3,
  bottomSeats: 3,
  leftSeats: 1,
  rightSeats: 1,
};

const getRectTableDimensions = (layout: RectTableLayout) => {
  const seatSize = getEntityRenderSize("seat");
  const width = Math.max(layout.topSeats, layout.bottomSeats, 1) * seatSize;
  const sideSeatMax = Math.max(layout.leftSeats, layout.rightSeats, 1);
  const height = Math.max(seatSize * 1.35, sideSeatMax * seatSize * 0.8);

  return { width, height, seatSize };
};

const getDistributedOffsets = (count: number, span: number) => {
  if (count <= 1) return [0];
  const step = span / (count - 1);
  return Array.from({ length: count }, (_, index) => -span / 2 + step * index);
};

export const getEntityType = (entity: EntityTypeInput): EntityType => {
  return (entity.type ?? "seat") as EntityType;
};

export const getEntitySpec = (entityOrType: EntityTypeInput | EntityType) => {
  const type =
    typeof entityOrType === "string"
      ? entityOrType
      : getEntityType(entityOrType);
  return ENTITY_SPEC[type];
};

export const getEntityRadius = (
  entityOrType: EntityTypeInput | EntityType,
) => {
  return getEntitySpec(entityOrType).radius;
};

export const getEntityRenderSize = (
  entityOrType: EntityTypeInput | EntityType,
) => {
  return getEntitySpec(entityOrType).renderSize;
};

export const getEntityLabelPrefix = (
  entityOrType: EntityTypeInput | EntityType,
) => {
  return getEntitySpec(entityOrType).labelPrefix;
};

export const getNextEntityLabel = (
  type: EntityType,
  existingEntities: Entity[],
  offset = 1,
) => {
  const countByType =
    type === "seat"
      ? existingEntities.filter(
          (entity) =>
            getEntityType(entity) === "seat" &&
            (entity.parentId === undefined || entity.parentId === null),
        ).length
      : existingEntities.filter((entity) => getEntityType(entity) === type)
          .length;
  return `${getEntityLabelPrefix(type)}${countByType + offset}`;
};

const getNextTableLabel = (existingEntities: Entity[]) => {
  const tableCount = existingEntities.filter((entity) => {
    const type = getEntityType(entity);
    return type === "table-circle" || type === "table-rect";
  }).length;
  return `Mesa ${tableCount + 1}`;
};

const getNextAreaLabel = (existingEntities: Entity[]) => {
  const areaCount = existingEntities.filter(
    (entity) => getEntityType(entity) === "area",
  ).length;
  return `Área ${areaCount + 1}`;
};

export const createEntityFromTool = (
  tool: EntityType,
  x: number,
  y: number,
  existingEntities: Entity[],
): Entity => {
  return {
    id: `${tool}-${Date.now()}-${Math.random()}`,
    x,
    y,
    label: getNextEntityLabel(tool, existingEntities),
    type: tool,
    rotation: 0,
    color: "#2563eb",
  };
};

const createEntityId = (type: EntityType, index = 0) =>
  `${type}-${Date.now()}-${Math.random()}-${index}`;

const CONTAINER_ENTITY_TYPES: EntityType[] = [
  "row",
  "table-circle",
  "table-rect",
];

const isContainerEntityType = (type: EntityType) =>
  CONTAINER_ENTITY_TYPES.includes(type);

const getEntityChildren = (parentId: string, allEntities: Entity[]) =>
  allEntities.filter((entity) => entity.parentId === parentId);

export const getRowChildren = (rowId: string, allEntities: Entity[]) =>
  allEntities.filter(
    (entity) => getEntityType(entity) === "seat" && entity.parentId === rowId,
  );

export const getSelectableEntityId = (
  entityId: string,
  allEntities: Entity[],
) => {
  const target = allEntities.find((entity) => entity.id === entityId);
  if (!target) return entityId;

  if (getEntityType(target) === "seat" && target.parentId) {
    const parent = allEntities.find((entity) => entity.id === target.parentId);
    if (parent && isContainerEntityType(getEntityType(parent))) {
      return parent.id;
    }
  }

  return entityId;
};

export const expandSelectionWithRowChildren = (
  selectedIds: string[],
  allEntities: Entity[],
) => {
  const expanded = new Set<string>();

  selectedIds.forEach((id) => {
    const selectableId = getSelectableEntityId(id, allEntities);
    expanded.add(selectableId);

    const entity = allEntities.find((item) => item.id === selectableId);
    if (entity && isContainerEntityType(getEntityType(entity))) {
      getEntityChildren(selectableId, allEntities).forEach((child) => {
        expanded.add(child.id);
      });
    }
  });

  return Array.from(expanded);
};

const createSeatChild = (
  x: number,
  y: number,
  label: string,
  parentId: string,
  index: number,
): Entity => ({
  id: createEntityId("seat", index),
  x,
  y,
  label,
  type: "seat",
  rotation: 0,
  color: "#2563eb",
  parentId,
});

const createRowEntities = (
  x: number,
  y: number,
  existingEntities: Entity[],
): Entity[] => {
  const rowSeatCount = 8;
  const spacing = ENTITY_GRID_SIZE;
  const rowId = createEntityId("row");
  const rowCount = existingEntities.filter(
    (entity) => getEntityType(entity) === "row",
  ).length;
  const rowLabel = `Fila ${rowCount + 1}`;
  const rowEntity: Entity = {
    id: rowId,
    x,
    y,
    label: rowLabel,
    type: "row",
    rotation: 0,
    color: "#2563eb",
    rowSeatCount,
    rowSeatSpacing: spacing,
    rowCurvature: 0,
  };

  const seats = Array.from({ length: rowSeatCount }, (_, idx) => {
    const startX = x - ((rowSeatCount - 1) * spacing) / 2;
    const seatX = startX + idx * spacing;
    const seatY = y + ENTITY_GRID_SIZE;
    return createSeatChild(
      seatX,
      seatY,
      `${rowLabel} - Asiento ${idx + 1}`,
      rowId,
      idx,
    );
  });

  return [rowEntity, ...seats];
};

const createCircleTableEntities = (
  x: number,
  y: number,
  existingEntities: Entity[],
): Entity[] => {
  const seatCount = 8;
  const radius = 50;
  const tableId = createEntityId("table-circle");
  const tableEntity: Entity = {
    id: tableId,
    x,
    y,
    label: getNextTableLabel(existingEntities),
    type: "table-circle",
    rotation: 0,
    color: "#2563eb",
    circleSeatCount: seatCount,
    circleSeatRadius: radius,
  };

  const seats = Array.from({ length: seatCount }, (_, idx) => {
    const angle = (idx / seatCount) * Math.PI * 2;
    const seatX = x + Math.cos(angle) * radius;
    const seatY = y + Math.sin(angle) * radius;

    return createSeatChild(
      seatX,
      seatY,
      `${tableEntity.label} - Silla ${idx + 1}`,
      tableId,
      idx,
    );
  });

  return [tableEntity, ...seats];
};

const createRectTableEntities = (
  x: number,
  y: number,
  existingEntities: Entity[],
): Entity[] => {
  const rectLayout = { ...DEFAULT_RECT_TABLE_LAYOUT };
  const { width: tableWidth, height: tableHeight, seatSize } =
    getRectTableDimensions(rectLayout);

  const tableId = createEntityId("table-rect");
  const tableEntity: Entity = {
    id: tableId,
    x,
    y,
    label: getNextTableLabel(existingEntities),
    type: "table-rect",
    rotation: 0,
    color: "#2563eb",
    tableWidth,
    tableHeight,
    rectLayout,
  };

  const edgeClearance = seatSize * 0.95;
  const topBottomY = tableHeight / 2 + edgeClearance;
  const sideX = tableWidth / 2 + edgeClearance;

  const topXs = getDistributedOffsets(rectLayout.topSeats, tableWidth - seatSize);
  const bottomXs = getDistributedOffsets(
    rectLayout.bottomSeats,
    tableWidth - seatSize,
  );
  const leftYs = getDistributedOffsets(rectLayout.leftSeats, tableHeight - seatSize);
  const rightYs = getDistributedOffsets(
    rectLayout.rightSeats,
    tableHeight - seatSize,
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

  const seats = seatOffsets.map((offset, idx) =>
    createSeatChild(
      x + offset.x,
      y + offset.y,
      `${tableEntity.label} - Silla ${idx + 1}`,
      tableId,
      idx,
    ),
  );

  return [tableEntity, ...seats];
};

const createAreaEntity = (
  x: number,
  y: number,
  existingEntities: Entity[],
): Entity => {
  return {
    id: createEntityId("area"),
    x,
    y,
    label: getNextAreaLabel(existingEntities),
    type: "area",
    rotation: 0,
    color: "#2563eb",
    areaWidth: ENTITY_GRID_SIZE * 4,
    areaHeight: ENTITY_GRID_SIZE * 3,
    areaLocked: false,
    areaShape: "rectangle",
    areaVectorPoints: [
      { x: -0.5, y: -0.5 },
      { x: 0.5, y: -0.5 },
      { x: 0.5, y: 0.5 },
      { x: -0.5, y: 0.5 },
    ],
  };
};

export const createEntitiesFromTool = (
  tool: EntityType,
  x: number,
  y: number,
  existingEntities: Entity[],
): Entity[] => {
  if (tool === "seat") {
    return [createEntityFromTool(tool, x, y, existingEntities)];
  }
  if (tool === "row") {
    return createRowEntities(x, y, existingEntities);
  }
  if (tool === "table-circle") {
    return createCircleTableEntities(x, y, existingEntities);
  }
  if (tool === "area") {
    return [createAreaEntity(x, y, existingEntities)];
  }
  return createRectTableEntities(x, y, existingEntities);
};

const getRectDimensions = (entity: EntityTypeInput & Partial<Entity>) => {
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
    return { width, height };
  }

  if (type === "area") {
    const shape = entity.areaShape ?? "rectangle";
    const baseWidth =
      typeof entity.areaWidth === "number"
        ? entity.areaWidth
        : ENTITY_GRID_SIZE * 4;
    const baseHeight =
      typeof entity.areaHeight === "number"
        ? entity.areaHeight
        : ENTITY_GRID_SIZE * 3;
    const side = Math.min(baseWidth, baseHeight);
    const width =
      shape === "square" || shape === "circle" ? side : baseWidth;
    const height =
      shape === "square" || shape === "circle" ? side : baseHeight;
    return { width, height };
  }

  return null;
};

const isRectType = (entity: EntityTypeInput & Partial<Entity>) => {
  const type = getEntityType(entity);
  return type === "table-rect" || type === "area";
};

const isCollisionRelevantEntity = (
  entity: EntityTypeInput & Partial<Entity>,
) => {
  const type = getEntityType(entity);
  return type !== "row" && type !== "area";
};

const circlesOverlap = (
  first: CollidableEntity,
  second: CollidableEntity,
  minDist?: number,
) => {
  const collisionDistance =
    minDist ?? getEntityRadius(first) + getEntityRadius(second);
  return Math.hypot(first.x - second.x, first.y - second.y) < collisionDistance;
};

const rectsOverlap = (
  first: CollidableEntity & Partial<Entity>,
  second: CollidableEntity & Partial<Entity>,
) => {
  const firstSize = getRectDimensions(first);
  const secondSize = getRectDimensions(second);
  if (!firstSize || !secondSize) return false;

  const firstLeft = first.x - firstSize.width / 2;
  const firstRight = first.x + firstSize.width / 2;
  const firstTop = first.y - firstSize.height / 2;
  const firstBottom = first.y + firstSize.height / 2;

  const secondLeft = second.x - secondSize.width / 2;
  const secondRight = second.x + secondSize.width / 2;
  const secondTop = second.y - secondSize.height / 2;
  const secondBottom = second.y + secondSize.height / 2;

  return !(
    firstRight < secondLeft ||
    firstLeft > secondRight ||
    firstBottom < secondTop ||
    firstTop > secondBottom
  );
};

const circleRectOverlap = (
  circle: CollidableEntity,
  rectEntity: CollidableEntity & Partial<Entity>,
) => {
  const rectSize = getRectDimensions(rectEntity);
  if (!rectSize) return false;

  const rectHalfWidth = rectSize.width / 2;
  const rectHalfHeight = rectSize.height / 2;

  const clampedX = Math.max(
    rectEntity.x - rectHalfWidth,
    Math.min(circle.x, rectEntity.x + rectHalfWidth),
  );
  const clampedY = Math.max(
    rectEntity.y - rectHalfHeight,
    Math.min(circle.y, rectEntity.y + rectHalfHeight),
  );

  const dx = circle.x - clampedX;
  const dy = circle.y - clampedY;
  return dx * dx + dy * dy < getEntityRadius(circle) ** 2;
};

const entitiesOverlap = (
  first: CollidableEntity & Partial<Entity>,
  second: CollidableEntity & Partial<Entity>,
  minDist?: number,
) => {
  const firstIsRect = isRectType(first);
  const secondIsRect = isRectType(second);

  if (!firstIsRect && !secondIsRect) {
    return circlesOverlap(first, second, minDist);
  }

  if (firstIsRect && secondIsRect) {
    return rectsOverlap(first, second);
  }

  if (firstIsRect) {
    return circleRectOverlap(second, first);
  }

  return circleRectOverlap(first, second);
};

export const findCollidingEntity = (
  target: CollidableEntity,
  all: Entity[],
  minDist?: number,
  ignoreIds: string[] = [],
) => {
  if (!isCollisionRelevantEntity(target)) return undefined;

  const ignoreSet = new Set(ignoreIds);

  return all.find((entity) => {
    if (entity.id === target.id) return false;
    if (ignoreSet.has(entity.id)) return false;
    if (!isCollisionRelevantEntity(entity)) return false;
    return entitiesOverlap(target, entity, minDist);
  });
};

export const hasAnyEntityCollision = (
  candidates: Entity[],
  all: Entity[],
  minDist?: number,
  ignoreIds: string[] = [],
) => {
  const ignoreSet = new Set(ignoreIds);
  const collisionCandidates = candidates.filter(isCollisionRelevantEntity);
  const collisionTargets = all.filter(
    (entity) => isCollisionRelevantEntity(entity) && !ignoreSet.has(entity.id),
  );

  return collisionCandidates.some((candidate) =>
    collisionTargets.some((entity) =>
      entity.id !== candidate.id &&
      entitiesOverlap(candidate, entity, minDist),
    ),
  );
};
