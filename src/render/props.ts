import { Group, Mesh, MeshBasicMaterial, MeshLambertMaterial } from 'three';
import { WORLD_HALF, WORLD_SIZE } from '../game/constants.ts';
import type { City, Ramp, Tree } from '../game/cityTypes.ts';
import { CURB_HEIGHT } from './ground.ts';
import { MeshBuilder } from './meshBuilder.ts';
import * as palette from './palette.ts';

type Vec3 = [number, number, number];

const WALL_HEIGHT = 1.1;
const WALL_THICK = 1.2;
const CLOUD_COUNT = 26;
const CLOUD_HEIGHT = 170;
const CLOUD_SPREAD = 900;
const STRIPE_COUNT = 3;

function addTree(builder: MeshBuilder, tree: Tree, index: number): void {
  const { x, z, size } = tree;
  const leaf = palette.LEAVES[index % palette.LEAVES.length]!;
  builder.addSlab({ x, z, y: CURB_HEIGHT, width: 0.8, depth: 0.8, height: 2.4 * size, color: palette.TRUNK });
  builder.addSlab({
    x, z, y: 2 * size, width: 5 * size, depth: 5 * size, height: 3 * size,
    topWidth: 2.6 * size, topDepth: 2.6 * size, color: leaf,
  });
  builder.addSlab({
    x, z, y: 4.4 * size, width: 3.4 * size, depth: 3.4 * size, height: 3 * size,
    topWidth: 0.4, topDepth: 0.4, color: leaf,
  });
}

/** Wedge with its low edge at the ramp origin, rising along the ramp direction. */
function addRamp(builder: MeshBuilder, ramp: Ramp): void {
  const half = ramp.width / 2;
  const at = (along: number, across: number, y: number): Vec3 => [
    ramp.x + ramp.dirX * along - ramp.dirZ * across,
    y,
    ramp.z + ramp.dirZ * along + ramp.dirX * across,
  ];
  const { length, height } = ramp;
  const low = [at(0, -half, 0), at(0, half, 0)] as const;
  const foot = [at(length, -half, 0), at(length, half, 0)] as const;
  const top = [at(length, -half, height), at(length, half, height)] as const;
  builder.addQuad([low[1], top[1], top[0], low[0]], palette.RAMP);
  builder.addQuad([foot[0], top[0], top[1], foot[1]], palette.RAMP_SIDE);
  builder.addQuad([low[0], top[0], foot[0], low[0]], palette.RAMP_SIDE);
  builder.addQuad([low[1], foot[1], top[1], low[1]], palette.RAMP_SIDE);
  for (let i = 0; i < STRIPE_COUNT; i++) {
    const from = ((i + 0.35) / STRIPE_COUNT) * length;
    const to = ((i + 0.65) / STRIPE_COUNT) * length;
    const lift = (along: number) => (along / length) * height + 0.04;
    builder.addQuad(
      [at(from, half, lift(from)), at(to, half, lift(to)), at(to, -half, lift(to)), at(from, -half, lift(from))],
      palette.RAMP_STRIPE,
    );
  }
}

function addEdgeWalls(builder: MeshBuilder): void {
  const reach = WORLD_HALF + WALL_THICK / 2;
  const wall = { y: 0, height: WALL_HEIGHT, color: palette.EDGE_WALL };
  const long = WORLD_SIZE + WALL_THICK * 2;
  builder.addSlab({ ...wall, x: reach, z: 0, width: WALL_THICK, depth: long });
  builder.addSlab({ ...wall, x: -reach, z: 0, width: WALL_THICK, depth: long });
  builder.addSlab({ ...wall, x: 0, z: reach, width: long, depth: WALL_THICK });
  builder.addSlab({ ...wall, x: 0, z: -reach, width: long, depth: WALL_THICK });
}

/** Clouds sit in a fixed pattern, so screenshots and runs look the same. */
function makeClouds(): Mesh {
  const builder = new MeshBuilder();
  for (let i = 0; i < CLOUD_COUNT; i++) {
    const angle = i * 2.399;
    const reach = CLOUD_SPREAD * Math.sqrt((i + 0.5) / CLOUD_COUNT);
    const x = Math.cos(angle) * reach;
    const z = Math.sin(angle) * reach;
    const size = 40 + ((i * 37) % 50);
    const y = CLOUD_HEIGHT + ((i * 53) % 60);
    builder.addSlab({ x, y, z, width: size, depth: size * 0.6, height: 9, topWidth: size * 0.7, color: palette.CLOUD });
    builder.addSlab({ x: x + size * 0.3, y: y + 5, z: z + 6, width: size * 0.6, depth: size * 0.5, height: 10, color: palette.CLOUD });
  }
  return new Mesh(builder.build(), new MeshBasicMaterial({ vertexColors: true, fog: false }));
}

/** Trees, launch ramps, the wall around the map and the clouds above it. */
export function makeProps(city: City): Group {
  const builder = new MeshBuilder();
  city.trees.forEach((tree, i) => addTree(builder, tree, i));
  city.ramps.forEach((ramp) => addRamp(builder, ramp));
  addEdgeWalls(builder);
  const solid = new Mesh(builder.build(), new MeshLambertMaterial({ vertexColors: true }));
  solid.castShadow = true;
  solid.receiveShadow = true;
  const group = new Group();
  group.add(solid, makeClouds());
  return group;
}
