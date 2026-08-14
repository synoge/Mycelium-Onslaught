import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../main';

export interface Point {
  x: number;
  y: number;
}

export interface MapDataRaw {
  base: Point;
  waypoints: Point[];
}

export interface GameMap {
  name: string;
  base: Point;
  // Waypoints stored SPAWN FIRST (reversed from raw maps.json)
  waypoints: Point[];
  totalLength: number;
  segmentLengths: number[];
}

// non-balance: road geometry constants from ENGINE-SPEC §2
export const ROAD_STROKE_WIDTH = 28;
// non-balance: road geometry constants from ENGINE-SPEC §2
export const ROAD_HALF_WIDTH = 14;
// non-balance: default base footprint radius in logical pixels
export const BASE_RADIUS = 24;
// non-balance: default tower footprint radius in logical pixels
export const DEFAULT_TOWER_FOOTPRINT_RADIUS = 16;

/**
 * Calculates Euclidean distance between two points.
 */
export function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates perpendicular / shortest distance from point p to segment [a, b].
 */
export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return distance(p, a);

  // Project point p onto segment, clamping t to [0, 1]
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;

  const ex = p.x - projX;
  const ey = p.y - projY;
  return Math.sqrt(ex * ex + ey * ey);
}

/**
 * Calculates shortest distance from point p to the polyline defined by waypoints.
 */
export function distanceToPolyline(p: Point, waypoints: Point[]): number {
  if (waypoints.length === 0) return Infinity;
  if (waypoints.length === 1) return distance(p, waypoints[0]);

  let minDist = Infinity;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const d = distanceToSegment(p, waypoints[i], waypoints[i + 1]);
    if (d < minDist) {
      minDist = d;
    }
  }
  return minDist;
}

export function loadMap(name: string, raw: MapDataRaw): GameMap {
  // ENGINE-SPEC §2: Waypoints are stored base-first. Reverse them on load.
  // Spawn is the last stored point in raw data, which becomes index 0.
  const reversedWaypoints = [...raw.waypoints].reverse().map((wp) => ({ x: wp.x, y: wp.y }));

  const segmentLengths: number[] = [];
  let totalLength = 0;
  for (let i = 0; i < reversedWaypoints.length - 1; i++) {
    const len = distance(reversedWaypoints[i], reversedWaypoints[i + 1]);
    segmentLengths.push(len);
    totalLength += len;
  }

  return {
    name,
    base: { x: raw.base.x, y: raw.base.y },
    waypoints: reversedWaypoints,
    totalLength,
    segmentLengths,
  };
}

export function loadAllMaps(rawJson: Record<string, MapDataRaw>): Record<string, GameMap> {
  const maps: Record<string, GameMap> = {};
  for (const [name, raw] of Object.entries(rawJson)) {
    maps[name] = loadMap(name, raw);
  }
  return maps;
}

export interface PlacedStructureRef {
  x: number;
  y: number;
  footprintRadius: number;
}

/**
 * Checks build legality per ENGINE-SPEC §2.1:
 * 1. p inside playfield inset by footprint radius
 * 2. distanceToPolyline(p, road) > roadHalfWidth + footprintRadius (roadHalfWidth = 14)
 * 3. does not overlap base footprint
 * 4. does not overlap existing structures
 */
export function isBuildLegal(
  p: Point,
  footprintRadius: number,
  map: GameMap,
  existingStructures: PlacedStructureRef[] = [],
  baseRadius: number = BASE_RADIUS
): boolean {
  // 1. In playfield inset by footprint radius
  if (
    p.x < footprintRadius ||
    p.x > LOGICAL_WIDTH - footprintRadius ||
    p.y < footprintRadius ||
    p.y > LOGICAL_HEIGHT - footprintRadius
  ) {
    return false;
  }

  // 2. Road clearance: distanceToPolyline > roadHalfWidth + footprintRadius
  const distToRoad = distanceToPolyline(p, map.waypoints);
  if (distToRoad <= ROAD_HALF_WIDTH + footprintRadius) {
    return false;
  }

  // 3. Base clearance
  const distToBase = distance(p, map.base);
  if (distToBase <= baseRadius + footprintRadius) {
    return false;
  }

  // 4. Existing structures clearance
  for (const struct of existingStructures) {
    const d = distance(p, { x: struct.x, y: struct.y });
    if (d < struct.footprintRadius + footprintRadius) {
      return false;
    }
  }

  return true;
}
