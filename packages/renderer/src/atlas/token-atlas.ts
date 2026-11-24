/**
 * Token-Driven Procedural Sprite Atlas.
 *
 * Conforms to docs/03-art-direction.md §4 (Pixel-Art Standards):
 * - Exactly 16x16 base tile grid for all sprites.
 * - Drawn strictly from design tokens in @tensorcade/ui/tokens.
 * - Nearest-neighbor pixelated filtering with zero bilinear blur.
 * - Generates PixiJS Texture instances dynamically from in-memory canvases.
 */

import { colors, pixelGrid } from '@tensorcade/ui/tokens';
import { Texture } from 'pixi.js';

export type TextureKey =
  | 'EMPTY_TILE'
  | 'BASE_TILE'
  | 'ROVER'
  | 'CROP'
  | 'ROCK'
  | 'RAVINE'
  | 'CRASH';

export class TokenSpriteAtlas {
  private textures: Map<TextureKey, Texture> = new Map();
  private readonly tileSize = pixelGrid.baseTilePx; // 16px

  /**
   * Initializes all procedural 16x16 textures and registers them with nearest-neighbor scaling.
   */
  public initTextures(): void {
    if (typeof document === 'undefined') {
      return; // Headless environment, skip DOM canvas generation
    }

    this.textures.set('EMPTY_TILE', this.createEmptyTileTexture());
    this.textures.set('BASE_TILE', this.createBaseTileTexture());
    this.textures.set('ROVER', this.createRoverTexture());
    this.textures.set('CROP', this.createCropTexture());
    this.textures.set('ROCK', this.createRockTexture());
    this.textures.set('RAVINE', this.createRavineTexture());
    this.textures.set('CRASH', this.createCrashTexture());
  }

  public getTexture(key: TextureKey): Texture {
    const tex = this.textures.get(key);
    if (!tex) {
      return Texture.EMPTY;
    }
    return tex;
  }

  public destroy(): void {
    for (const tex of this.textures.values()) {
      if (tex !== Texture.EMPTY) {
        tex.destroy(true);
      }
    }
    this.textures.clear();
  }

  private createCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    const canvas = document.createElement('canvas');
    canvas.width = this.tileSize;
    canvas.height = this.tileSize;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.imageSmoothingEnabled = false;
    return { canvas, ctx };
  }

  private finalizeTexture(canvas: HTMLCanvasElement): Texture {
    const texture = Texture.from(canvas);
    if (texture.source) {
      texture.source.scaleMode = 'nearest';
    }
    return texture;
  }

  /**
   * 16x16 Dark laboratory grid tile with subtle division borders.
   */
  private createEmptyTileTexture(): Texture {
    const { canvas, ctx } = this.createCanvas();
    ctx.fillStyle = colors.bg.surface; // #151C28
    ctx.fillRect(0, 0, 16, 16);

    ctx.strokeStyle = colors.border.subtle; // #232E42
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, 15, 15);

    // Subtle 1px corner markers
    ctx.fillStyle = colors.border.subtle;
    ctx.fillRect(0, 0, 1, 1);
    ctx.fillRect(15, 0, 1, 1);
    ctx.fillRect(0, 15, 1, 1);
    ctx.fillRect(15, 15, 1, 1);

    return this.finalizeTexture(canvas);
  }

  /**
   * 16x16 Starting Base / Launch Tile with cyan telemetry markings.
   */
  private createBaseTileTexture(): Texture {
    const { canvas, ctx } = this.createCanvas();
    ctx.fillStyle = colors.bg.surface;
    ctx.fillRect(0, 0, 16, 16);

    // Division grid
    ctx.strokeStyle = colors.border.subtle;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, 15, 15);

    // Cyan base corners
    ctx.fillStyle = colors.accent.cyan; // #38BDF8
    ctx.fillRect(2, 2, 3, 1);
    ctx.fillRect(2, 2, 1, 3);

    ctx.fillRect(11, 2, 3, 1);
    ctx.fillRect(13, 2, 1, 3);

    ctx.fillRect(2, 13, 3, 1);
    ctx.fillRect(2, 11, 1, 3);

    ctx.fillRect(11, 13, 3, 1);
    ctx.fillRect(13, 11, 1, 3);

    return this.finalizeTexture(canvas);
  }

  /**
   * 16x16 Directional Rover Harvester facing North.
   * - Left & Right mechanical treads
   * - Cyan central computing chassis
   * - Top white optical sensor / cockpit
   * - Emerald energy status indicator
   */
  private createRoverTexture(): Texture {
    const { canvas, ctx } = this.createCanvas();

    // Transparent background
    ctx.clearRect(0, 0, 16, 16);

    // Left tread
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(2, 1, 3, 14);
    ctx.fillStyle = '#475569';
    ctx.fillRect(2, 3, 3, 2);
    ctx.fillRect(2, 7, 3, 2);
    ctx.fillRect(2, 11, 3, 2);

    // Right tread
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(11, 1, 3, 14);
    ctx.fillStyle = '#475569';
    ctx.fillRect(11, 3, 3, 2);
    ctx.fillRect(11, 7, 3, 2);
    ctx.fillRect(11, 11, 3, 2);

    // Main Chassis
    ctx.fillStyle = colors.accent.cyan; // #38BDF8
    ctx.fillRect(5, 3, 6, 10);

    // Optical Sensor / Cockpit (Facing North at top)
    ctx.fillStyle = colors.text.primary; // #F8FAFC
    ctx.fillRect(6, 2, 4, 3);
    ctx.fillStyle = colors.accent.amber; // Lens pip
    ctx.fillRect(7, 3, 2, 1);

    // Rear engine / Energy core
    ctx.fillStyle = colors.accent.emerald; // #10B981
    ctx.fillRect(7, 10, 2, 2);

    return this.finalizeTexture(canvas);
  }

  /**
   * 16x16 Harvestable Energy Crop.
   * - Green foliage nodes
   * - Golden energy bloom center
   */
  private createCropTexture(): Texture {
    const { canvas, ctx } = this.createCanvas();
    ctx.clearRect(0, 0, 16, 16);

    // Outer leaf petals
    ctx.fillStyle = colors.accent.emerald; // #10B981
    ctx.fillRect(6, 2, 4, 3); // Top leaf
    ctx.fillRect(2, 6, 3, 4); // Left leaf
    ctx.fillRect(11, 6, 3, 4); // Right leaf
    ctx.fillRect(6, 11, 4, 3); // Bottom leaf

    // Core energy node
    ctx.fillStyle = colors.accent.amber; // #F59E0B
    ctx.fillRect(5, 5, 6, 6);

    // Center glow
    ctx.fillStyle = colors.text.primary; // #F8FAFC
    ctx.fillRect(7, 7, 2, 2);

    return this.finalizeTexture(canvas);
  }

  /**
   * 16x16 Rugged Obstacle Rock.
   */
  private createRockTexture(): Texture {
    const { canvas, ctx } = this.createCanvas();
    ctx.clearRect(0, 0, 16, 16);

    // Deep shadow
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(3, 4, 10, 9);

    // Rock body
    ctx.fillStyle = '#334155';
    ctx.fillRect(4, 3, 8, 10);
    ctx.fillRect(3, 5, 10, 6);

    // Facet highlights
    ctx.fillStyle = '#64748B';
    ctx.fillRect(5, 4, 4, 2);
    ctx.fillRect(4, 6, 3, 3);
    ctx.fillStyle = '#94A3B8';
    ctx.fillRect(6, 5, 2, 1);

    return this.finalizeTexture(canvas);
  }

  /**
   * 16x16 Dangerous Ravine / Hazard Pit.
   */
  private createRavineTexture(): Texture {
    const { canvas, ctx } = this.createCanvas();
    ctx.clearRect(0, 0, 16, 16);

    // Pitch black void
    ctx.fillStyle = '#020617';
    ctx.fillRect(2, 2, 12, 12);

    // Crimson hazard crosshatch boundary
    ctx.fillStyle = colors.accent.crimson; // #FB7185
    ctx.fillRect(2, 1, 12, 1);
    ctx.fillRect(2, 14, 12, 1);
    ctx.fillRect(1, 2, 1, 12);
    ctx.fillRect(14, 2, 1, 12);

    // Diagonal hazard stripes
    ctx.fillStyle = '#881337';
    ctx.fillRect(4, 4, 2, 2);
    ctx.fillRect(8, 8, 2, 2);
    ctx.fillRect(10, 4, 2, 2);
    ctx.fillRect(4, 10, 2, 2);

    return this.finalizeTexture(canvas);
  }

  /**
   * 16x16 Crash Hazard Warning Indicator.
   */
  private createCrashTexture(): Texture {
    const { canvas, ctx } = this.createCanvas();
    ctx.clearRect(0, 0, 16, 16);

    ctx.strokeStyle = colors.accent.crimson; // #FB7185
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 14, 14);

    // Danger X
    ctx.fillStyle = colors.accent.crimson;
    ctx.fillRect(3, 3, 2, 2);
    ctx.fillRect(11, 3, 2, 2);
    ctx.fillRect(5, 5, 2, 2);
    ctx.fillRect(9, 5, 2, 2);
    ctx.fillRect(7, 7, 2, 2);
    ctx.fillRect(5, 9, 2, 2);
    ctx.fillRect(9, 9, 2, 2);
    ctx.fillRect(3, 11, 2, 2);
    ctx.fillRect(11, 11, 2, 2);

    return this.finalizeTexture(canvas);
  }
}
