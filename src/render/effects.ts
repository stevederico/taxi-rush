import { Color, DynamicDrawUsage, IcosahedronGeometry, InstancedMesh, MeshBasicMaterial, Object3D } from 'three';
import { GRAVITY } from '../game/constants.ts';

const CAPACITY = 260;

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  life: number;
  size: number;
  /** How much the particle swells over its life. */
  growth: number;
  /** Share of gravity that pulls on it. Smoke floats, sparks fall. */
  weight: number;
}

export interface Burst {
  x: number;
  y: number;
  z: number;
  count: number;
  color: number;
  speed: number;
  /** Extra upward speed. */
  lift: number;
  life: number;
  size: number;
  growth: number;
  weight: number;
}

/** A pool of small blobs for smoke, sparks, dust and coins. */
export class Effects {
  readonly mesh: InstancedMesh;
  private particles: Array<Particle | null> = new Array(CAPACITY).fill(null);
  private cursor = 0;
  private dummy = new Object3D();
  private tint = new Color();

  constructor() {
    const material = new MeshBasicMaterial({ color: 0xffffff });
    this.mesh = new InstancedMesh(new IcosahedronGeometry(0.5, 0), material, CAPACITY);
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.dummy.scale.setScalar(0);
    this.dummy.updateMatrix();
    for (let i = 0; i < CAPACITY; i++) {
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      this.mesh.setColorAt(i, this.tint.setHex(0xffffff));
    }
  }

  /** Throw a handful of particles out from a point. */
  burst(burst: Burst): void {
    for (let i = 0; i < burst.count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = burst.speed * (0.4 + Math.random() * 0.6);
      const slot = this.cursor;
      this.cursor = (this.cursor + 1) % CAPACITY;
      this.particles[slot] = {
        x: burst.x,
        y: burst.y,
        z: burst.z,
        vx: Math.cos(angle) * speed,
        vy: burst.lift * (0.5 + Math.random() * 0.5),
        vz: Math.sin(angle) * speed,
        age: 0,
        life: burst.life * (0.7 + Math.random() * 0.3),
        size: burst.size * (0.7 + Math.random() * 0.6),
        growth: burst.growth,
        weight: burst.weight,
      };
      this.mesh.setColorAt(slot, this.tint.setHex(burst.color));
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt: number): void {
    for (let i = 0; i < CAPACITY; i++) {
      const p = this.particles[i];
      if (!p) continue;
      p.age += dt;
      const isDead = p.age >= p.life;
      if (isDead) this.particles[i] = null;
      else this.move(p, dt);
      const left = isDead ? 0 : 1 - p.age / p.life;
      const swell = 1 + p.growth * (p.age / p.life);
      this.dummy.position.set(p.x, p.y, p.z);
      this.dummy.scale.setScalar(p.size * swell * Math.min(1, left * 2.5));
      this.dummy.rotation.set(p.age * 3, p.age * 2, 0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  private move(p: Particle, dt: number): void {
    p.vy -= GRAVITY * p.weight * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    if (p.y > 0.1) return;
    p.y = 0.1;
    p.vy = Math.abs(p.vy) * 0.4;
  }
}
