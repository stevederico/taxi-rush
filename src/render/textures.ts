import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

const WINDOW_TILE = 256;
const WINDOWS_PER_TILE = 4;
const GROUND_TILE = 128;

function makeCanvas(size: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  return { canvas, ctx };
}

function finish(canvas: HTMLCanvasElement, anisotropy: number): CanvasTexture {
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = anisotropy;
  return texture;
}

/** Deterministic 0..1 noise for a cell, so the texture is the same every load. */
function cellNoise(a: number, b: number): number {
  const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

/** A tile of office windows. Walls tint it through vertex colors. */
export function makeWindowTexture(anisotropy: number): CanvasTexture {
  const { canvas, ctx } = makeCanvas(WINDOW_TILE);
  const cell = WINDOW_TILE / WINDOWS_PER_TILE;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, WINDOW_TILE, WINDOW_TILE);
  for (let row = 0; row < WINDOWS_PER_TILE; row++) {
    for (let col = 0; col < WINDOWS_PER_TILE; col++) {
      const shade = cellNoise(col, row);
      ctx.fillStyle = shade > 0.72 ? '#9fd4ee' : shade > 0.35 ? '#4f7f9f' : '#3a627f';
      ctx.fillRect(col * cell + 10, row * cell + 12, cell - 20, cell - 26);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(col * cell + 10, row * cell + 12, cell - 20, 5);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, row * cell, WINDOW_TILE, 3);
  }
  return finish(canvas, anisotropy);
}

/** Speckled surface used for asphalt, so the road shows motion at speed. */
export function makeGroundTexture(anisotropy: number): CanvasTexture {
  const { canvas, ctx } = makeCanvas(GROUND_TILE);
  ctx.fillStyle = '#dcdcdc';
  ctx.fillRect(0, 0, GROUND_TILE, GROUND_TILE);
  for (let i = 0; i < 900; i++) {
    const x = cellNoise(i, 1) * GROUND_TILE;
    const y = cellNoise(i, 2) * GROUND_TILE;
    const dark = cellNoise(i, 3) > 0.5;
    ctx.fillStyle = dark ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.10)';
    ctx.fillRect(x, y, 2, 2);
  }
  return finish(canvas, anisotropy);
}
