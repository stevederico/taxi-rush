import { BLOCK_SIZE, GRID_BLOCKS, SIDEWALK } from './constants.ts';
import { blockStart } from './roads.ts';
import { createRng } from './rng.ts';
import type { Rng } from './rng.ts';
import type { Block, BlockKind, Box, Building, City, Tree } from './cityTypes.ts';
import { placeRamps } from './ramps.ts';
import { placeStops } from './stops.ts';

const PARK_CHANCE = 0.13;
const PLAZA_CHANCE = 0.1;
const TINT_COUNT = 6;
const MIN_HEIGHT = 10;
const EDGE_HEIGHT = 30;
const CENTER_HEIGHT = 95;
const PLAZA_TOWER = 22;
const TREE_MARGIN = 7;
const TREE_SPACING = 9;
const TRUNK_HALF = 0.6;

function pickKind(rng: Rng, col: number, row: number): BlockKind {
  const isSpawnBlock = col === GRID_BLOCKS / 2 && row === GRID_BLOCKS / 2;
  if (isSpawnBlock) return 'plaza';
  const roll = rng.next();
  if (roll < PARK_CHANCE) return 'park';
  if (roll < PARK_CHANCE + PLAZA_CHANCE) return 'plaza';
  return 'towers';
}

/** Taller toward the middle of the map so downtown reads as a skyline. */
function pickHeight(rng: Rng, block: Block): number {
  const mid = (GRID_BLOCKS - 1) / 2;
  const away = Math.max(Math.abs(block.col - mid), Math.abs(block.row - mid)) / mid;
  const ceiling = CENTER_HEIGHT + (EDGE_HEIGHT - CENTER_HEIGHT) * away;
  return rng.range(MIN_HEIGHT, ceiling);
}

function splitSpan(rng: Rng, min: number, max: number): Array<[number, number]> {
  if (rng.chance(0.3)) return [[min, max]];
  const cut = min + (max - min) * rng.range(0.38, 0.62);
  return [
    [min, cut],
    [cut, max],
  ];
}

function buildTowers(rng: Rng, block: Block): Building[] {
  const xs = splitSpan(rng, block.minX + SIDEWALK, block.maxX - SIDEWALK);
  const zs = splitSpan(rng, block.minZ + SIDEWALK, block.maxZ - SIDEWALK);
  const buildings: Building[] = [];
  for (const [minX, maxX] of xs) {
    for (const [minZ, maxZ] of zs) {
      const height = pickHeight(rng, block);
      buildings.push({ minX, maxX, minZ, maxZ, height, tint: rng.int(0, TINT_COUNT - 1) });
    }
  }
  return buildings;
}

function buildPlaza(rng: Rng, block: Block): Building[] {
  const cx = (block.minX + block.maxX) / 2;
  const cz = (block.minZ + block.maxZ) / 2;
  const half = PLAZA_TOWER / 2;
  const height = pickHeight(rng, block) + 25;
  const tint = rng.int(0, TINT_COUNT - 1);
  return [{ minX: cx - half, maxX: cx + half, minZ: cz - half, maxZ: cz + half, height, tint }];
}

function plantTrees(rng: Rng, block: Block): Tree[] {
  const trees: Tree[] = [];
  const wanted = rng.int(7, 11);
  for (let tries = 0; tries < 60 && trees.length < wanted; tries++) {
    const x = rng.range(block.minX + TREE_MARGIN, block.maxX - TREE_MARGIN);
    const z = rng.range(block.minZ + TREE_MARGIN, block.maxZ - TREE_MARGIN);
    const isCrowded = trees.some((t) => Math.hypot(t.x - x, t.z - z) < TREE_SPACING);
    if (!isCrowded) trees.push({ x, z, size: rng.range(0.85, 1.35) });
  }
  return trees;
}

function trunkBox(tree: Tree): Box {
  return {
    minX: tree.x - TRUNK_HALF,
    maxX: tree.x + TRUNK_HALF,
    minZ: tree.z - TRUNK_HALF,
    maxZ: tree.z + TRUNK_HALF,
  };
}

function layBlocks(rng: Rng): Block[] {
  const blocks: Block[] = [];
  for (let row = 0; row < GRID_BLOCKS; row++) {
    for (let col = 0; col < GRID_BLOCKS; col++) {
      const minX = blockStart(col);
      const minZ = blockStart(row);
      const kind = pickKind(rng, col, row);
      blocks.push({ kind, col, row, minX, maxX: minX + BLOCK_SIZE, minZ, maxZ: minZ + BLOCK_SIZE });
    }
  }
  return blocks;
}

/** Build the whole city from a seed. The same seed always gives the same city. */
export function generateCity(seed: number): City {
  const rng = createRng(seed);
  const blocks = layBlocks(rng);
  const buildings: Building[] = [];
  const trees: Tree[] = [];
  for (const block of blocks) {
    if (block.kind === 'towers') buildings.push(...buildTowers(rng, block));
    if (block.kind === 'plaza') buildings.push(...buildPlaza(rng, block));
    if (block.kind === 'park') trees.push(...plantTrees(rng, block));
  }
  const ramps = placeRamps(rng);
  const stops = placeStops(rng, blocks, ramps);
  const obstacles: Box[] = [...buildings, ...trees.map(trunkBox)];
  return { seed, blocks, buildings, trees, ramps, stops, obstacles };
}
