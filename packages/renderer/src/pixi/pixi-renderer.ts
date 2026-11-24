/**
 * PixiJS v8 Hardware-Accelerated 2D Grid-World Renderer.
 *
 * Conforms to docs/03-art-direction.md §4, docs/11-lld.md §2, and ADR-001 / ADR-019:
 * - Decoupled rendering: receives read-only state snapshots; zero sim mutation.
 * - Hardware accelerated: automatic WebGPU preference with WebGL2 fallback.
 * - Strict integer pixel scaling (1x, 2x, 3x, 4x) preventing sub-pixel blur.
 * - Device Pixel Ratio (DPR) awareness, capped at 2.0.
 * - Nearest-neighbor texture filtering on all pixel art.
 * - Interpolated 60 Hz sprite animation respecting reduced-motion settings.
 */

import type { EngineSnapshot, GridWorldState } from '@tensorcade/engine';
import { CellType } from '@tensorcade/engine';
import { Application, Container, Sprite } from 'pixi.js';
import { TokenSpriteAtlas } from '../atlas/token-atlas.js';
import { interpolateGridWorld } from '../interpolation.js';
import type {
  DrawMetrics,
  GridWorldRenderConfig,
  InterpolatedRoverState,
  Renderer,
} from '../types.js';

export class PixiGridWorldRenderer implements Renderer<GridWorldState, GridWorldRenderConfig> {
  private app: Application | null = null;
  private containerElement: HTMLElement | null = null;
  private atlas: TokenSpriteAtlas;
  private config: Required<GridWorldRenderConfig>;

  // Pixi Scene Graph Layers
  private rootContainer: Container | null = null;
  private terrainContainer: Container | null = null;
  private cropContainer: Container | null = null;
  private hazardContainer: Container | null = null;
  private roverContainer: Container | null = null;
  private effectsContainer: Container | null = null;

  // Sprite references
  private roverSprite: Sprite | null = null;
  private crashSprite: Sprite | null = null;
  private cropSprites: Map<string, Sprite> = new Map();

  // Playback & Interpolation State
  private previousState: GridWorldState | null = null;
  private integerScale = 1;
  private frameCount = 0;
  private lastFrameTimeMs = 0;
  private dpr = 1.0;

  constructor(initialConfig?: GridWorldRenderConfig) {
    this.atlas = new TokenSpriteAtlas();
    this.config = {
      width: initialConfig?.width ?? 10,
      height: initialConfig?.height ?? 10,
      tileSize: initialConfig?.tileSize ?? 16,
      maxDpr: initialConfig?.maxDpr ?? 2.0,
      reducedMotion: initialConfig?.reducedMotion ?? false,
    };
  }

  public async init(container: HTMLElement, config: GridWorldRenderConfig): Promise<void> {
    this.containerElement = container;
    this.config = {
      width: config.width,
      height: config.height,
      tileSize: config.tileSize ?? 16,
      maxDpr: config.maxDpr ?? 2.0,
      reducedMotion: config.reducedMotion ?? false,
    };

    this.dpr = Math.min(
      typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
      this.config.maxDpr,
    );

    // 1. Initialize PixiJS v8 Application
    const app = new Application();
    await app.init({
      preference: 'webgpu',
      backgroundColor: 0x0b0f17,
      antialias: false,
      autoDensity: true,
      resolution: this.dpr,
    });
    this.app = app;

    // Apply pixel-art styles to canvas
    const canvas = app.canvas as HTMLCanvasElement;
    canvas.style.imageRendering = 'pixelated';
    canvas.style.display = 'block';
    canvas.style.margin = 'auto';

    container.appendChild(canvas);

    // 2. Initialize token texture atlas
    this.atlas.initTextures();

    // 3. Construct layered scene graph
    const root = new Container();
    const terrain = new Container();
    const cropLayer = new Container();
    const hazardLayer = new Container();
    const roverLayer = new Container();
    const effects = new Container();

    root.addChild(terrain);
    root.addChild(hazardLayer);
    root.addChild(cropLayer);
    root.addChild(roverLayer);
    root.addChild(effects);

    app.stage.addChild(root);

    this.rootContainer = root;
    this.terrainContainer = terrain;
    this.cropContainer = cropLayer;
    this.hazardContainer = hazardLayer;
    this.roverContainer = roverLayer;
    this.effectsContainer = effects;

    // 4. Create rover sprite (anchor at center for smooth rotation)
    const rover = new Sprite(this.atlas.getTexture('ROVER'));
    rover.anchor.set(0.5, 0.5);
    rover.visible = false;
    roverLayer.addChild(rover);
    this.roverSprite = rover;

    // 5. Create crash indicator sprite
    const crash = new Sprite(this.atlas.getTexture('CRASH'));
    crash.anchor.set(0.5, 0.5);
    crash.visible = false;
    effects.addChild(crash);
    this.crashSprite = crash;

    // 6. Initial sizing
    const containerWidth = container.clientWidth || 640;
    const containerHeight = container.clientHeight || 480;
    this.resize(containerWidth, containerHeight);
  }

  public render(snapshot: Readonly<EngineSnapshot<GridWorldState>>, alpha: number): void {
    if (!this.app || !this.rootContainer) return;

    const startTime = typeof performance !== 'undefined' ? performance.now() : 0;
    const curr = snapshot.state;
    const prev = this.previousState ?? curr;
    const tileSize = this.config.tileSize;

    // 1. Rebuild terrain grid if not yet built or dimensions changed
    const dimensionsChanged =
      curr.width !== this.config.width || curr.height !== this.config.height;

    if (dimensionsChanged) {
      this.config = { ...this.config, width: curr.width, height: curr.height };
      if (this.terrainContainer) this.terrainContainer.removeChildren();
      if (this.hazardContainer) this.hazardContainer.removeChildren();
      if (this.cropContainer) this.cropContainer.removeChildren();
      this.cropSprites.clear();
      this.buildStaticGrid(curr);
      if (this.app) {
        this.resize(this.app.renderer.width, this.app.renderer.height);
      }
    } else if (this.terrainContainer && this.terrainContainer.children.length === 0) {
      this.buildStaticGrid(curr);
    }

    // 2. Interpolate rover position and rotation
    const rover: InterpolatedRoverState = interpolateGridWorld(
      prev,
      curr,
      alpha,
      this.config.reducedMotion,
    );

    if (this.roverSprite) {
      this.roverSprite.visible = true;
      // Position at center of the tile
      this.roverSprite.position.set(
        rover.x * tileSize + tileSize / 2,
        rover.y * tileSize + tileSize / 2,
      );
      this.roverSprite.rotation = rover.rotationRad;
    }

    // 3. Update harvestable crop visibility
    this.updateCrops(curr);

    // 4. Update crash indicator
    if (this.crashSprite) {
      this.crashSprite.visible = curr.crashed;
      if (curr.crashed) {
        this.crashSprite.position.set(
          curr.rover.x * tileSize + tileSize / 2,
          curr.rover.y * tileSize + tileSize / 2,
        );
      }
    }

    this.previousState = curr;
    this.frameCount++;

    const endTime = typeof performance !== 'undefined' ? performance.now() : 0;
    this.lastFrameTimeMs = endTime > startTime ? endTime - startTime : 0.05;
  }

  public resize(width: number, height: number): void {
    if (!this.app || !this.rootContainer) return;
    if (width <= 0 || height <= 0) return;

    const worldWidth = this.config.width * this.config.tileSize;
    const worldHeight = this.config.height * this.config.tileSize;

    if (worldWidth <= 0 || worldHeight <= 0) return;

    this.app.renderer.resize(width, height);

    // Calculate strict integer scale factor (1x, 2x, 3x, 4x...)
    const scaleX = Math.floor(width / worldWidth);
    const scaleY = Math.floor(height / worldHeight);
    this.integerScale = Math.max(1, Math.min(scaleX, scaleY));

    this.rootContainer.scale.set(this.integerScale);

    // Center root container within viewport
    const scaledWidth = worldWidth * this.integerScale;
    const scaledHeight = worldHeight * this.integerScale;
    this.rootContainer.position.set(
      Math.floor((width - scaledWidth) / 2),
      Math.floor((height - scaledHeight) / 2),
    );
  }

  public destroy(): void {
    this.atlas.destroy();
    this.cropSprites.clear();

    if (this.app) {
      this.app.destroy(true, { children: true, texture: true });
      this.app = null;
    }

    this.containerElement = null;
    this.previousState = null;
  }

  public getCanvas(): HTMLCanvasElement | null {
    return (this.app?.canvas as HTMLCanvasElement) || null;
  }

  public getDrawMetrics(): DrawMetrics {
    return {
      frameCount: this.frameCount,
      lastFrameTimeMs: this.lastFrameTimeMs,
      totalDrawCalls: this.rootContainer ? this.countDescendants(this.rootContainer) : 0,
      visibleSprites: this.rootContainer ? this.countVisibleSprites(this.rootContainer) : 0,
      integerScale: this.integerScale,
      dpr: this.dpr,
    };
  }

  public getIntegerScale(): number {
    return this.integerScale;
  }

  private buildStaticGrid(state: GridWorldState): void {
    if (!this.terrainContainer || !this.hazardContainer || !this.cropContainer) return;

    const tileSize = this.config.tileSize;

    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const cell = state.grid[y]?.[x] ?? CellType.EMPTY;
        const posX = x * tileSize;
        const posY = y * tileSize;

        // Base or empty terrain tile
        const tileTex =
          cell === CellType.BASE
            ? this.atlas.getTexture('BASE_TILE')
            : this.atlas.getTexture('EMPTY_TILE');
        const tileSprite = new Sprite(tileTex);
        tileSprite.position.set(posX, posY);
        this.terrainContainer.addChild(tileSprite);

        // Hazards
        if (cell === CellType.ROCK) {
          const rock = new Sprite(this.atlas.getTexture('ROCK'));
          rock.position.set(posX, posY);
          this.hazardContainer.addChild(rock);
        } else if (cell === CellType.RAVINE) {
          const ravine = new Sprite(this.atlas.getTexture('RAVINE'));
          ravine.position.set(posX, posY);
          this.hazardContainer.addChild(ravine);
        } else if (cell === CellType.CROP) {
          const crop = new Sprite(this.atlas.getTexture('CROP'));
          crop.position.set(posX, posY);
          this.cropContainer.addChild(crop);
          this.cropSprites.set(`${x},${y}`, crop);
        }
      }
    }
  }

  private updateCrops(state: GridWorldState): void {
    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const key = `${x},${y}`;
        const sprite = this.cropSprites.get(key);
        if (sprite) {
          const isHarvested = state.grid[y]?.[x] !== CellType.CROP;
          sprite.visible = !isHarvested;
        }
      }
    }
  }

  private countDescendants(container: Container): number {
    let count = container.children.length;
    for (const child of container.children) {
      if ('children' in child && Array.isArray((child as Container).children)) {
        count += this.countDescendants(child as Container);
      }
    }
    return count;
  }

  private countVisibleSprites(container: Container): number {
    let count = 0;
    for (const child of container.children) {
      if (child.visible) {
        count++;
        if ('children' in child && Array.isArray((child as Container).children)) {
          count += this.countVisibleSprites(child as Container);
        }
      }
    }
    return count;
  }
}
