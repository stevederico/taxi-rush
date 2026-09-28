import {
  BackSide,
  Color,
  DirectionalLight,
  Float32BufferAttribute,
  Fog,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  PCFShadowMap,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import { isTouchDevice } from '../ui/device.ts';
import * as palette from './palette.ts';

const SKY_RADIUS = 1400;
const FOG_NEAR = 180;
const FOG_FAR = 760;
const SHADOW_REACH = 95;
const SHADOW_MAP = 2048;
const SUN_OFFSET = { x: 70, y: 130, z: 45 };
const MAX_PIXEL_RATIO = 2;
const MAX_PIXEL_RATIO_LOW = 1.5;

function makeSky(): Mesh {
  const geometry = new SphereGeometry(SKY_RADIUS, 24, 12);
  const top = new Color(palette.SKY_TOP);
  const horizon = new Color(palette.SKY_HORIZON);
  const blend = new Color();
  const colors: number[] = [];
  const position = geometry.getAttribute('position');
  for (let i = 0; i < position.count; i++) {
    const rise = Math.max(0, position.getY(i) / SKY_RADIUS);
    blend.copy(horizon).lerp(top, Math.pow(rise, 0.55));
    colors.push(blend.r, blend.g, blend.b);
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  const material = new MeshBasicMaterial({ vertexColors: true, side: BackSide, fog: false, depthWrite: false });
  const sky = new Mesh(geometry, material);
  sky.renderOrder = -1;
  return sky;
}

/** The renderer, the scene, the sun and the sky. */
export class Stage {
  readonly scene = new Scene();
  readonly renderer: WebGLRenderer;
  readonly isLowPower: boolean;
  private sun = new DirectionalLight(palette.SUN, 2.4);
  private sky = makeSky();

  constructor(canvas: HTMLCanvasElement) {
    this.isLowPower = isTouchDevice();
    this.renderer = new WebGLRenderer({ canvas, antialias: !this.isLowPower, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.shadowMap.enabled = !this.isLowPower;
    this.renderer.shadowMap.type = PCFShadowMap;
    this.scene.fog = new Fog(palette.FOG, FOG_NEAR, FOG_FAR);
    this.scene.background = new Color(palette.SKY_HORIZON);
    this.scene.add(new HemisphereLight(palette.SKY_LIGHT, palette.GROUND_LIGHT, 1.5), this.sky);
    this.setUpSun();
  }

  private setUpSun(): void {
    const { shadow } = this.sun;
    this.sun.castShadow = !this.isLowPower;
    shadow.mapSize.set(SHADOW_MAP, SHADOW_MAP);
    shadow.camera.left = -SHADOW_REACH;
    shadow.camera.right = SHADOW_REACH;
    shadow.camera.top = SHADOW_REACH;
    shadow.camera.bottom = -SHADOW_REACH;
    shadow.camera.near = 10;
    shadow.camera.far = 400;
    shadow.bias = -0.0006;
    shadow.normalBias = 0.05;
    this.scene.add(this.sun, this.sun.target);
  }

  get maxAnisotropy(): number {
    return Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
  }

  resize(width: number, height: number): void {
    const cap = this.isLowPower ? MAX_PIXEL_RATIO_LOW : MAX_PIXEL_RATIO;
    this.renderer.setPixelRatio(Math.min(cap, window.devicePixelRatio || 1));
    this.renderer.setSize(width, height, false);
  }

  /** Keep the sun's shadow and the sky centered on a point. */
  center(x: number, z: number): void {
    this.sun.position.set(x + SUN_OFFSET.x, SUN_OFFSET.y, z + SUN_OFFSET.z);
    this.sun.target.position.set(x, 0, z);
    this.sky.position.set(x, 0, z);
  }
}
