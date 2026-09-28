import { Group, Mesh, MeshBasicMaterial, MeshLambertMaterial, PlaneGeometry } from 'three';
import type { Texture } from 'three';
import { BLOCK_SIZE, GRID_BLOCKS, LANE_OFFSETS, ROAD_WIDTH, SIDEWALK, WORLD_SIZE } from '../game/constants.ts';
import type { Block } from '../game/cityTypes.ts';
import { blockStart, roadCenter, ROAD_COUNT } from '../game/roads.ts';
import { MeshBuilder } from './meshBuilder.ts';
import * as palette from './palette.ts';

export const CURB_HEIGHT = 0.18;
const PAINT_Y = 0.03;
const TEXTURE_SPAN = 9;
const WATER_SPAN = 5000;
const DASH_LENGTH = 3;
const DASH_GAP = 5;
const DASH_WIDTH = 0.28;
const CENTER_GAP = 0.35;
const CROSSWALK_STRIPES = 7;
const CROSSWALK_DEPTH = 3.2;
const LANE_DIVIDER = (LANE_OFFSETS[0]! + LANE_OFFSETS[1]!) / 2;

const TOP_COLORS: Record<Block['kind'], number> = {
  towers: palette.SIDEWALK,
  park: palette.GRASS,
  plaza: palette.PLAZA,
};

function makeAsphalt(texture: Texture): Mesh {
  texture.repeat.set(WORLD_SIZE / TEXTURE_SPAN, WORLD_SIZE / TEXTURE_SPAN);
  const material = new MeshLambertMaterial({ color: palette.ASPHALT, map: texture });
  const mesh = new Mesh(new PlaneGeometry(WORLD_SIZE, WORLD_SIZE), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}

function makeWater(): Mesh {
  const material = new MeshBasicMaterial({ color: palette.WATER });
  const mesh = new Mesh(new PlaneGeometry(WATER_SPAN, WATER_SPAN), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.6;
  return mesh;
}

function makeBlocks(blocks: readonly Block[]): Mesh {
  const builder = new MeshBuilder();
  for (const block of blocks) {
    const x = (block.minX + block.maxX) / 2;
    const z = (block.minZ + block.maxZ) / 2;
    const curb = { x, y: 0, z, width: BLOCK_SIZE, depth: BLOCK_SIZE, height: CURB_HEIGHT };
    builder.addSlab({ ...curb, color: palette.SIDEWALK });
    if (block.kind === 'towers') continue;
    const inner = BLOCK_SIZE - SIDEWALK * 2;
    builder.addFlat(x, CURB_HEIGHT + 0.02, z, inner, inner, TOP_COLORS[block.kind]);
  }
  const mesh = new Mesh(builder.build(), new MeshLambertMaterial({ vertexColors: true }));
  mesh.receiveShadow = true;
  return mesh;
}

/** Paint one stretch of road between two crossings. Runs along z when isAlongZ. */
function paintSegment(builder: MeshBuilder, center: number, start: number, isAlongZ: boolean): void {
  const flat = (across: number, along: number, width: number, length: number, color: number) => {
    if (isAlongZ) builder.addFlat(center + across, PAINT_Y, along, width, length, color);
    else builder.addFlat(along, PAINT_Y, center + across, length, width, color);
  };
  const middle = start + BLOCK_SIZE / 2;
  const inset = CROSSWALK_DEPTH + 2;
  flat(-CENTER_GAP, middle, DASH_WIDTH, BLOCK_SIZE - inset * 2, palette.LANE_YELLOW);
  flat(CENTER_GAP, middle, DASH_WIDTH, BLOCK_SIZE - inset * 2, palette.LANE_YELLOW);
  for (let at = start + inset; at + DASH_LENGTH < start + BLOCK_SIZE - inset; at += DASH_LENGTH + DASH_GAP) {
    flat(-LANE_DIVIDER, at + DASH_LENGTH / 2, DASH_WIDTH, DASH_LENGTH, palette.LANE_WHITE);
    flat(LANE_DIVIDER, at + DASH_LENGTH / 2, DASH_WIDTH, DASH_LENGTH, palette.LANE_WHITE);
  }
  const stripe = ROAD_WIDTH / (CROSSWALK_STRIPES * 2);
  for (let i = 0; i < CROSSWALK_STRIPES; i++) {
    const across = -ROAD_WIDTH / 2 + stripe * (i * 2 + 1);
    flat(across, start + CROSSWALK_DEPTH / 2 + 0.6, stripe, CROSSWALK_DEPTH, palette.LANE_WHITE);
    flat(across, start + BLOCK_SIZE - CROSSWALK_DEPTH / 2 - 0.6, stripe, CROSSWALK_DEPTH, palette.LANE_WHITE);
  }
}

function makePaint(): Mesh {
  const builder = new MeshBuilder();
  for (let road = 0; road < ROAD_COUNT; road++) {
    for (let segment = 0; segment < GRID_BLOCKS; segment++) {
      paintSegment(builder, roadCenter(road), blockStart(segment), true);
      paintSegment(builder, roadCenter(road), blockStart(segment), false);
    }
  }
  const material = new MeshBasicMaterial({
    vertexColors: true,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  return new Mesh(builder.build(), material);
}

/** Roads, road paint, sidewalks, parks and the sea around the city. */
export function makeGround(blocks: readonly Block[], asphalt: Texture): Group {
  const group = new Group();
  group.add(makeWater(), makeAsphalt(asphalt), makeBlocks(blocks), makePaint());
  return group;
}
