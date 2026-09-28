import { CanvasTexture, Sprite, SpriteMaterial, SRGBColorSpace } from 'three';
import { memo } from './memo.ts';

const SIZE = 128;

function drawText(text: string, color: string): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE * 2;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  ctx.font = `900 italic ${SIZE * 0.7}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 16;
  ctx.strokeStyle = '#10131a';
  ctx.strokeText(text, SIZE, SIZE / 2);
  ctx.fillStyle = color;
  ctx.fillText(text, SIZE, SIZE / 2);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** One texture and material per distinct label, drawn the first time it is asked for. */
const labelMaterial = memo((key: string) => {
  const [text = '', color = '#ffffff'] = key.split('|');
  return new SpriteMaterial({ map: drawText(text, color), depthTest: false, transparent: true, fog: false });
});

/** A text label that always faces the camera. Labels with the same text share a texture. */
export function makeLabel(text: string, color: string): Sprite {
  const sprite = new Sprite(labelMaterial(`${text}|${color}`));
  sprite.scale.set(7, 3.5, 1);
  sprite.renderOrder = 5;
  return sprite;
}
