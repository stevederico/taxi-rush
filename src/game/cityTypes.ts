/** Axis-aligned rectangle on the ground plane. */
export interface Box {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export type BlockKind = 'towers' | 'park' | 'plaza';

export interface Block extends Box {
  kind: BlockKind;
  col: number;
  row: number;
}

export interface Building extends Box {
  height: number;
  /** Index into the renderer's wall palette. */
  tint: number;
}

export interface Tree {
  x: number;
  z: number;
  size: number;
}

/** A wedge that launches cars. (x, z) is the middle of the low edge. */
export interface Ramp {
  x: number;
  z: number;
  dirX: number;
  dirZ: number;
  length: number;
  width: number;
  height: number;
}

/** A curb spot where a fare can wait or be dropped off. */
export interface Stop {
  id: number;
  /** Point in the road the taxi must reach. */
  x: number;
  z: number;
  /** Point on the sidewalk where the passenger stands. */
  curbX: number;
  curbZ: number;
  name: string;
}

export interface City {
  seed: number;
  blocks: Block[];
  buildings: Building[];
  trees: Tree[];
  ramps: Ramp[];
  stops: Stop[];
  /** Everything solid: buildings and tree trunks. */
  obstacles: Box[];
}
