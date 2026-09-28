import { BLOCK_SIZE, WORLD_HALF, WORLD_SIZE } from '../game/constants.ts';
import type { City } from '../game/cityTypes.ts';
import type { Game } from '../game/game.ts';

const SIZE = 160;
const SCALE = SIZE / WORLD_SIZE;
const BLOCK_COLORS = { towers: '#4a5263', park: '#3f9d4b', plaza: '#a8976f' } as const;
const TIER_COLORS = { short: '#ff5a4f', medium: '#ffc21a', long: '#35d07f' } as const;
const ROAD_COLOR = '#1d212b';
const DESTINATION_COLOR = '#35f09a';

/** Map x grows right. Map y grows down, so +z (the starting heading) points up. */
function toMap(x: number, z: number): [number, number] {
  return [(WORLD_HALF - x) * SCALE, (WORLD_HALF - z) * SCALE];
}

/** Small overhead map of the city with the cab, the fares and the destination. */
export class Minimap {
  private ctx: CanvasRenderingContext2D;
  private base: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement, city: City) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas is not available');
    this.ctx = ctx;
    this.base = this.drawBase(city);
  }

  /** The streets never change, so they are drawn once and reused. */
  private drawBase(city: City): HTMLCanvasElement {
    const base = document.createElement('canvas');
    base.width = SIZE;
    base.height = SIZE;
    const ctx = base.getContext('2d');
    if (!ctx) throw new Error('2D canvas is not available');
    ctx.fillStyle = ROAD_COLOR;
    ctx.fillRect(0, 0, SIZE, SIZE);
    for (const block of city.blocks) {
      const [x, y] = toMap(block.maxX, block.maxZ);
      ctx.fillStyle = BLOCK_COLORS[block.kind];
      ctx.fillRect(x, y, BLOCK_SIZE * SCALE, BLOCK_SIZE * SCALE);
    }
    ctx.fillStyle = '#ff7a1a';
    for (const ramp of city.ramps) {
      const [x, y] = toMap(ramp.x, ramp.z);
      ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
    }
    return base;
  }

  private dot(x: number, z: number, radius: number, color: string): void {
    const [mx, my] = toMap(x, z);
    this.ctx.beginPath();
    this.ctx.arc(mx, my, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.fill();
  }

  private drawCab(x: number, z: number, heading: number): void {
    const [mx, my] = toMap(x, z);
    const { ctx } = this;
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(-heading);
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 5);
    ctx.lineTo(0, 2.5);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#10131a';
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  draw(game: Game, time: number): void {
    const { ctx } = this;
    const { active, waiting } = game.fares;
    ctx.drawImage(this.base, 0, 0);
    const pulse = 1 + Math.sin(time * 6) * 0.25;
    if (active) this.dot(active.fare.to.x, active.fare.to.z, 6 * pulse, DESTINATION_COLOR);
    else for (const fare of waiting) this.dot(fare.from.x, fare.from.z, 4, TIER_COLORS[fare.tier]);
    this.drawCab(game.car.x, game.car.z, game.car.heading);
  }
}
