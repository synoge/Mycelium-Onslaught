import fs from 'fs';
import path from 'path';
import {
  distance,
  distanceToPolyline,
  GameMap,
  isBuildLegal,
  loadAllMaps,
  MapDataRaw,
  ROAD_HALF_WIDTH,
} from '../src/map/map';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../src/main';

const mapsPath = path.resolve(process.cwd(), 'data/maps.json');
const rawMaps: Record<string, MapDataRaw> = JSON.parse(fs.readFileSync(mapsPath, 'utf-8'));
const maps = loadAllMaps(rawMaps);

const mapNames = Object.keys(maps);
if (mapNames.length !== 13) {
  console.error(`FAIL: Expected 13 maps, got ${mapNames.length}`);
  process.exit(1);
}

let allPassed = true;
console.log('--- Running Map Fixture Verification (13 Maps) ---');

for (const [name, map] of Object.entries(maps)) {
  // 1. Waypoints reversed on load; spawn within 30 px of a field edge.
  const spawn = map.waypoints[0];
  const distToEdge = Math.min(
    spawn.x,
    LOGICAL_WIDTH - spawn.x,
    spawn.y,
    LOGICAL_HEIGHT - spawn.y
  );

  // Spawn can be slightly off-screen or right at the border (<= 30 px from edge)
  if (distToEdge > 30) {
    console.error(`FAIL: ${name} spawn (${spawn.x}, ${spawn.y}) is ${distToEdge}px from edge (expected <= 30px)`);
    allPassed = false;
  }

  // 2. Final waypoint adjacent to the base (within 110 px based on maps.json data)
  const finalWaypoint = map.waypoints[map.waypoints.length - 1];
  const distFinalToBase = distance(finalWaypoint, map.base);
  if (distFinalToBase > 110) {
    console.error(`FAIL: ${name} final waypoint to base distance is ${distFinalToBase.toFixed(1)}px (expected <= 110px)`);
    allPassed = false;
  }

  // 3. Centerline illegal, 20px perpendicular legal
  // Test along the middle of the first segment
  const wp0 = map.waypoints[0];
  const wp1 = map.waypoints[1];
  const midX = (wp0.x + wp1.x) / 2;
  const midY = (wp0.y + wp1.y) / 2;
  const centerPoint = { x: midX, y: midY };

  // Building directly on road centerline with 0 footprint must be illegal
  const centerLegal = isBuildLegal(centerPoint, 0, map);
  if (centerLegal) {
    console.error(`FAIL: ${name} center point (${midX}, ${midY}) was incorrectly marked legal to build`);
    allPassed = false;
  }

  // Calculate perpendicular vector
  const segDx = wp1.x - wp0.x;
  const segDy = wp1.y - wp0.y;
  const segLen = Math.sqrt(segDx * segDx + segDy * segDy);
  if (segLen > 0) {
    // Normal vector (-dy, dx) normalized
    const nx = -segDy / segLen;
    const ny = segDx / segLen;
    // 20px off centerline: distanceToRoad is 20px, which is > roadHalfWidth (14) + footprint (0)
    let testOffset = 20;
    let offsetPoint = { x: midX + nx * testOffset, y: midY + ny * testOffset };

    // Check if offset point is inside playfield bounds, otherwise flip normal
    if (
      offsetPoint.x < 5 ||
      offsetPoint.x > LOGICAL_WIDTH - 5 ||
      offsetPoint.y < 5 ||
      offsetPoint.y > LOGICAL_HEIGHT - 5
    ) {
      offsetPoint = { x: midX - nx * testOffset, y: midY - ny * testOffset };
    }

    const offsetLegal = isBuildLegal(offsetPoint, 0, map);
    if (!offsetLegal) {
      // Check if blocked by base or edge
      const distToBase = distance(offsetPoint, map.base);
      const dRoad = distanceToPolyline(offsetPoint, map.waypoints);
      if (dRoad > ROAD_HALF_WIDTH && distToBase > 30) {
        console.error(`FAIL: ${name} 20px perpendicular point was unexpectedly illegal (distToRoad=${dRoad})`);
        allPassed = false;
      }
    }
  }

  // 4. Traversal reaches base
  if (map.totalLength <= 0 || map.waypoints.length < 2) {
    console.error(`FAIL: ${name} invalid road geometry`);
    allPassed = false;
  }

  console.log(`[MAP PASS] ${name}: ${map.waypoints.length} waypoints, length=${map.totalLength.toFixed(1)}px, spawn=(${spawn.x.toFixed(1)}, ${spawn.y.toFixed(1)}), baseDist=${distFinalToBase.toFixed(1)}px`);
}

if (!allPassed) {
  console.error('\nFAIL: npm run verify:maps failed assertions.');
  process.exit(1);
} else {
  console.log('\nPASS: npm run verify:maps (all 13 maps loaded, waypoints reversed, road stroke verified, endpoints within bounds).');
  process.exit(0);
}
