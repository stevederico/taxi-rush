import type { BufferGeometry } from 'three';
import { MeshBuilder } from './meshBuilder.ts';
import * as palette from './palette.ts';

export const WHEEL_RADIUS = 0.44;
export const WHEEL_X = 0.98;
export const WHEEL_Z = 1.42;
const WHEEL_WIDTH = 0.36;
const CHECKER_SIZE = 0.3;
const CHECKER_COUNT = 12;
/** Instance colors multiply vertex colors, so white paint takes the instance color. */
const PAINTABLE = 0xffffff;

interface Shell {
  paint: number;
  width: number;
  length: number;
}

function addLights(builder: MeshBuilder, shell: Shell, y: number): void {
  const z = shell.length / 2;
  for (const side of [-1, 1]) {
    const x = side * (shell.width / 2 - 0.35);
    builder.addSlab({ x, y, z: z + 0.02, width: 0.42, depth: 0.08, height: 0.2, color: palette.HEADLIGHT });
    builder.addSlab({ x, y, z: -z - 0.02, width: 0.42, depth: 0.08, height: 0.2, color: palette.TAILLIGHT });
  }
}

function addBumpers(builder: MeshBuilder, shell: Shell): void {
  const z = shell.length / 2;
  const bumper = { x: 0, y: 0.3, width: shell.width + 0.06, depth: 0.22, height: 0.26, color: palette.BUMPER };
  builder.addSlab({ ...bumper, z });
  builder.addSlab({ ...bumper, z: -z });
}

function addSedanShell(builder: MeshBuilder, shell: Shell): void {
  const { paint, width, length } = shell;
  builder.addSlab({
    x: 0, y: 0.34, z: 0, width, depth: length, height: 0.62,
    topWidth: width - 0.12, topDepth: length - 0.1, color: paint,
  });
  builder.addSlab({
    x: 0, y: 0.96, z: 0, width: width - 0.12, depth: length - 0.1, height: 0.16,
    topWidth: width - 0.24, topDepth: length - 0.5, color: paint,
  });
  builder.addSlab({
    x: 0, y: 1.12, z: -0.3, width: width - 0.26, depth: 2.5, height: 0.62,
    topWidth: width - 0.56, topDepth: 1.45, topShift: -0.08, color: palette.GLASS,
  });
  builder.addSlab({ x: 0, y: 1.74, z: -0.38, width: width - 0.5, depth: 1.5, height: 0.06, color: paint });
  addBumpers(builder, shell);
  addLights(builder, shell, 0.72);
}

function addCheckers(builder: MeshBuilder, width: number): void {
  const start = -(CHECKER_COUNT * CHECKER_SIZE) / 2;
  for (let i = 0; i < CHECKER_COUNT; i++) {
    const color = i % 2 === 0 ? palette.CHECKER_DARK : palette.CHECKER_LIGHT;
    const z = start + (i + 0.5) * CHECKER_SIZE;
    for (const side of [-1, 1]) {
      const x = side * (width / 2 - 0.02);
      builder.addSlab({ x, y: 0.62, z, width: 0.06, depth: CHECKER_SIZE, height: 0.2, color });
    }
  }
}

/** Body of the player's cab, facing +z. Wheels are separate so they can spin. */
export function makeTaxiBody(): BufferGeometry {
  const builder = new MeshBuilder();
  addSedanShell(builder, { paint: palette.TAXI_BODY, width: 2, length: 4.4 });
  addCheckers(builder, 2);
  builder.addSlab({
    x: 0, y: 1.8, z: -0.38, width: 0.95, depth: 0.36, height: 0.3,
    topWidth: 0.8, topDepth: 0.26, color: palette.TAXI_SIGN,
  });
  return builder.build();
}

/** One wheel centered on the origin, axle along x. */
export function makeWheel(): BufferGeometry {
  const builder = new MeshBuilder();
  builder.addWheel(0, 0, 0, WHEEL_RADIUS, WHEEL_WIDTH, palette.TIRE);
  builder.addWheel(0, 0, 0, WHEEL_RADIUS * 0.55, WHEEL_WIDTH + 0.04, 0xb8bcc4);
  return builder.build();
}

function addFixedWheels(builder: MeshBuilder, wheelZ: number): void {
  for (const x of [-WHEEL_X, WHEEL_X]) {
    for (const z of [-wheelZ, wheelZ]) {
      builder.addWheel(x, WHEEL_RADIUS, z, WHEEL_RADIUS, WHEEL_WIDTH, palette.TIRE);
    }
  }
}

/** Traffic sedan with white paint, tinted per car by its instance color. */
export function makeSedan(): BufferGeometry {
  const builder = new MeshBuilder();
  addSedanShell(builder, { paint: PAINTABLE, width: 2, length: 4.3 });
  addFixedWheels(builder, WHEEL_Z);
  return builder.build();
}

/** Traffic delivery van with white paint, tinted per car by its instance color. */
export function makeVan(): BufferGeometry {
  const builder = new MeshBuilder();
  const shell = { paint: PAINTABLE, width: 2.1, length: 4.8 };
  builder.addSlab({ x: 0, y: 0.34, z: 0, width: 2.1, depth: 4.8, height: 0.9, color: PAINTABLE });
  builder.addSlab({
    x: 0, y: 1.24, z: -0.5, width: 2.1, depth: 3.8, height: 1.1,
    topWidth: 2, topDepth: 3.7, color: PAINTABLE,
  });
  builder.addSlab({
    x: 0, y: 1.24, z: 1.75, width: 2, depth: 1.2, height: 0.8,
    topWidth: 1.8, topDepth: 0.5, topShift: -0.35, color: palette.GLASS,
  });
  addBumpers(builder, shell);
  addLights(builder, shell, 0.8);
  addFixedWheels(builder, 1.6);
  return builder.build();
}
