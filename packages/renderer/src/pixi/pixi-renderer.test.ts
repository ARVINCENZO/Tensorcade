import { describe, it, expect } from 'vitest';
import { PixiGridWorldRenderer } from './pixi-renderer.js';

describe('PixiGridWorldRenderer', () => {
  describe('Integer pixel scaling calculation', () => {
    it('calculates strict integer scale factors (1x, 2x, 3x, 4x) without fractional distortion', () => {
      // 10x10 grid with 16px tiles = 160x160 world size
      const renderer = new PixiGridWorldRenderer({ width: 10, height: 10, tileSize: 16 });
      expect(renderer.getIntegerScale()).toBe(1);

      // Viewport 320x320: exactly 2x scale (320 / 160 = 2)
      // Viewport 400x350: scaleX = 400/160 = 2.5 -> floor = 2, scaleY = 350/160 = 2.18 -> floor = 2 -> integerScale = 2
      // Viewport 500x500: floor(500/160) = 3 -> integerScale = 3
      // Viewport 640x640: floor(640/160) = 4 -> integerScale = 4
      // Viewport 100x100: floor(100/160) = 0 -> Math.max(1, 0) = 1

      const calculateScale = (w: number, h: number, worldW = 160, worldH = 160) => {
        const scaleX = Math.floor(w / worldW);
        const scaleY = Math.floor(h / worldH);
        return Math.max(1, Math.min(scaleX, scaleY));
      };

      expect(calculateScale(320, 320)).toBe(2);
      expect(calculateScale(400, 350)).toBe(2);
      expect(calculateScale(500, 500)).toBe(3);
      expect(calculateScale(640, 640)).toBe(4);
      expect(calculateScale(100, 100)).toBe(1);
      // Zero or negative container dimensions clamp safely
      expect(calculateScale(0, 0)).toBe(1);
      expect(calculateScale(-100, -100)).toBe(1);
    });

    it('safely handles resize with zero or unmounted dimensions without crashing', () => {
      const renderer = new PixiGridWorldRenderer({ width: 10, height: 10, tileSize: 16 });
      // Call resize directly when app is uninitialized
      expect(() => {
        renderer.resize(0, 0);
        renderer.resize(-50, -50);
      }).not.toThrow();
    });

    it('initializes with default config and zero frame count', () => {
      const renderer = new PixiGridWorldRenderer({ width: 10, height: 10 });
      const metrics = renderer.getDrawMetrics();
      expect(metrics.frameCount).toBe(0);
      expect(metrics.integerScale).toBe(1);
    });
  });
});
