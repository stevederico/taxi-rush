import { BufferGeometry, Color, Float32BufferAttribute } from 'three';

type Vec3 = [number, number, number];

const QUAD_UVS: ReadonlyArray<[number, number]> = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];

/** A box that can narrow toward the top, for cabins, roofs and hoods. */
export interface Slab {
  /** Center on the ground plane and the height of the underside. */
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  /** Size of the top face. Defaults to the size of the base. */
  topWidth?: number;
  topDepth?: number;
  /** Slide the top face along z, for a raked windshield. */
  topShift?: number;
  color: number;
  /** World units per texture repeat on the side faces. 0 leaves UVs at 0..1. */
  uvScale?: number;
}

/** Collects many simple shapes into one geometry, so they draw in one call. */
export class MeshBuilder {
  private positions: number[] = [];
  private normals: number[] = [];
  private colors: number[] = [];
  private uvs: number[] = [];
  private indices: number[] = [];
  private tint = new Color();

  /** Add a four-sided face. Corners go counter-clockwise seen from outside. */
  addQuad(corners: [Vec3, Vec3, Vec3, Vec3], color: number, uvSize: [number, number] = [1, 1]): void {
    const [a, b, c] = corners;
    const ux = b[0] - a[0];
    const uy = b[1] - a[1];
    const uz = b[2] - a[2];
    const vx = c[0] - a[0];
    const vy = c[1] - a[1];
    const vz = c[2] - a[2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const length = Math.hypot(nx, ny, nz) || 1;
    const base = this.positions.length / 3;
    this.tint.setHex(color);
    corners.forEach((corner, i) => {
      this.positions.push(...corner);
      this.normals.push(nx / length, ny / length, nz / length);
      this.colors.push(this.tint.r, this.tint.g, this.tint.b);
      this.uvs.push(QUAD_UVS[i]![0] * uvSize[0], QUAD_UVS[i]![1] * uvSize[1]);
    });
    this.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  /** Add a box, optionally tapered toward the top. */
  addSlab(slab: Slab): void {
    const { x, y, z, width, height, depth, color } = slab;
    const topW = (slab.topWidth ?? width) / 2;
    const topD = (slab.topDepth ?? depth) / 2;
    const shift = slab.topShift ?? 0;
    const w = width / 2;
    const d = depth / 2;
    const top = y + height;
    const b: Vec3[] = [
      [x - w, y, z - d],
      [x + w, y, z - d],
      [x + w, y, z + d],
      [x - w, y, z + d],
    ];
    const t: Vec3[] = [
      [x - topW, top, z + shift - topD],
      [x + topW, top, z + shift - topD],
      [x + topW, top, z + shift + topD],
      [x - topW, top, z + shift + topD],
    ];
    const scale = slab.uvScale ?? 0;
    const sideUv = (span: number): [number, number] =>
      scale > 0 ? [span / scale, height / scale] : [1, 1];
    this.addQuad([t[3]!, t[2]!, t[1]!, t[0]!], color);
    this.addQuad([b[0]!, b[1]!, b[2]!, b[3]!], color);
    this.addQuad([b[3]!, b[2]!, t[2]!, t[3]!], color, sideUv(width));
    this.addQuad([b[1]!, b[0]!, t[0]!, t[1]!], color, sideUv(width));
    this.addQuad([b[2]!, b[1]!, t[1]!, t[2]!], color, sideUv(depth));
    this.addQuad([b[0]!, b[3]!, t[3]!, t[0]!], color, sideUv(depth));
  }

  /** Add a flat rectangle lying on the ground at height y, facing up. */
  addFlat(x: number, y: number, z: number, width: number, depth: number, color: number): void {
    const w = width / 2;
    const d = depth / 2;
    this.addQuad(
      [
        [x - w, y, z + d],
        [x + w, y, z + d],
        [x + w, y, z - d],
        [x - w, y, z - d],
      ],
      color,
    );
  }

  /** Add a wheel: a short cylinder lying on its side along x. */
  addWheel(x: number, y: number, z: number, radius: number, width: number, color: number): void {
    const SIDES = 10;
    const half = width / 2;
    const ring = (i: number, side: number): Vec3 => {
      const angle = (i / SIDES) * Math.PI * 2;
      return [x + side * half, y + Math.cos(angle) * radius, z + Math.sin(angle) * radius];
    };
    for (let i = 0; i < SIDES; i++) {
      this.addQuad([ring(i, 1), ring(i, -1), ring(i + 1, -1), ring(i + 1, 1)], color);
      this.addQuad([[x + half, y, z], ring(i, 1), ring(i + 1, 1), [x + half, y, z]], color);
      this.addQuad([[x - half, y, z], ring(i + 1, -1), ring(i, -1), [x - half, y, z]], color);
    }
  }

  /** Finish and hand back the geometry. */
  build(): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('normal', new Float32BufferAttribute(this.normals, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(this.colors, 3));
    geometry.setAttribute('uv', new Float32BufferAttribute(this.uvs, 2));
    geometry.setIndex(this.indices);
    geometry.computeBoundingSphere();
    return geometry;
  }
}
