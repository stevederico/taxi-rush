import { Group, Mesh, MeshLambertMaterial } from 'three';
import type { Texture } from 'three';
import type { Building } from '../game/cityTypes.ts';
import { CURB_HEIGHT } from './ground.ts';
import { MeshBuilder } from './meshBuilder.ts';
import { ROOF, WALL_TINTS } from './palette.ts';

const WINDOW_SPAN = 16;
const BASE_HEIGHT = 4.5;
const ROOF_LIP = 0.8;
const ROOF_INSET = 1.2;
const BASE_SHADE = 0.55;

function shade(color: number, amount: number): number {
  const r = Math.round(((color >> 16) & 255) * amount);
  const g = Math.round(((color >> 8) & 255) * amount);
  const b = Math.round((color & 255) * amount);
  return (r << 16) | (g << 8) | b;
}

function addTower(walls: MeshBuilder, trim: MeshBuilder, b: Building): void {
  const x = (b.minX + b.maxX) / 2;
  const z = (b.minZ + b.maxZ) / 2;
  const width = b.maxX - b.minX;
  const depth = b.maxZ - b.minZ;
  const tint = WALL_TINTS[b.tint % WALL_TINTS.length]!;
  trim.addSlab({
    x, z, width, depth,
    y: CURB_HEIGHT,
    height: BASE_HEIGHT,
    color: shade(tint, BASE_SHADE),
  });
  walls.addSlab({
    x, z,
    width: width - 0.6,
    depth: depth - 0.6,
    y: CURB_HEIGHT + BASE_HEIGHT,
    height: b.height - BASE_HEIGHT,
    color: tint,
    uvScale: WINDOW_SPAN,
  });
  trim.addSlab({
    x, z,
    width: width - ROOF_INSET,
    depth: depth - ROOF_INSET,
    y: CURB_HEIGHT + b.height,
    height: ROOF_LIP,
    color: ROOF,
  });
}

/** Every building in the city, merged into two meshes. */
export function makeBuildings(buildings: readonly Building[], windows: Texture): Group {
  const walls = new MeshBuilder();
  const trim = new MeshBuilder();
  for (const building of buildings) addTower(walls, trim, building);
  const wallMesh = new Mesh(
    walls.build(),
    new MeshLambertMaterial({ vertexColors: true, map: windows }),
  );
  const trimMesh = new Mesh(trim.build(), new MeshLambertMaterial({ vertexColors: true }));
  wallMesh.castShadow = true;
  trimMesh.castShadow = true;
  const group = new Group();
  group.add(wallMesh, trimMesh);
  return group;
}
