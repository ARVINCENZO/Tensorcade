import { describe, expect, it } from 'vitest';
import {
  Fixed16,
  detClamp,
  detCos,
  detExp,
  detLerp,
  detPow2,
  detSigmoid,
  detSin,
  detSoftmax,
} from './math.js';

describe('Deterministic Math Helpers (packages/engine/math)', () => {
  describe('detPow2', () => {
    it('computes exact powers of two for integer exponents', () => {
      expect(detPow2(0)).toBe(1.0);
      expect(detPow2(1)).toBe(2.0);
      expect(detPow2(2)).toBe(4.0);
      expect(detPow2(10)).toBe(1024.0);
      expect(detPow2(-1)).toBe(0.5);
      expect(detPow2(-2)).toBe(0.25);
      expect(detPow2(-10)).toBe(1.0 / 1024.0);
    });

    it('handles underflow and overflow', () => {
      expect(detPow2(-1023)).toBe(0.0);
      expect(detPow2(1024)).toBe(Infinity);
    });
  });

  describe('detExp', () => {
    it('evaluates special values accurately', () => {
      expect(detExp(0)).toBe(1.0);
      expect(Number.isNaN(detExp(NaN))).toBe(true);
      expect(detExp(800)).toBe(Infinity);
      expect(detExp(-800)).toBe(0.0);
    });

    it('approximates e^x with high precision compared to reference', () => {
      // e^1 approx 2.718281828459
      expect(detExp(1.0)).toBeCloseTo(2.718281828459, 10);
      // e^-1 approx 0.367879441171
      expect(detExp(-1.0)).toBeCloseTo(0.367879441171, 10);
      // e^2 approx 7.38905609893
      expect(detExp(2.0)).toBeCloseTo(7.38905609893, 9);
      // e^-3 approx 0.049787068367
      expect(detExp(-3.0)).toBeCloseTo(0.049787068367, 10);
      // e^0.5 approx 1.6487212707
      expect(detExp(0.5)).toBeCloseTo(1.6487212707, 10);
    });

    it('is strictly bit-identical across multiple identical calls', () => {
      const v1 = detExp(1.23456789);
      const v2 = detExp(1.23456789);
      expect(v1).toBe(v2);
    });
  });

  describe('detSigmoid', () => {
    it('computes sigmoid accurately with clamping', () => {
      expect(detSigmoid(0)).toBe(0.5);
      expect(detSigmoid(2.0)).toBeCloseTo(0.880797077977, 8);
      expect(detSigmoid(-2.0)).toBeCloseTo(0.119202922022, 8);
      // Extreme values clamped (|x| > 40.0)
      expect(detSigmoid(50.0)).toBe(1.0);
      expect(detSigmoid(-50.0)).toBe(0.0);
      expect(detSigmoid(20.0)).toBeCloseTo(0.9999999979, 8);
    });
  });

  describe('detSoftmax', () => {
    it('normalizes vector elements into probabilities summing to 1.0', () => {
      const input = [1.0, 2.0, 3.0, 4.0];
      const probs = detSoftmax(input);

      expect(probs).toHaveLength(4);
      const sum = probs.reduce((acc, p) => acc + p, 0);
      expect(sum).toBeCloseTo(1.0, 10);
      // Monotonicity: higher input -> higher probability
      expect(probs[3]).toBeGreaterThan(probs[2] ?? 0);
      expect(probs[2]).toBeGreaterThan(probs[1] ?? 0);
      expect(probs[1]).toBeGreaterThan(probs[0] ?? 0);
    });

    it('remains numerically stable on very large inputs without NaN', () => {
      const input = [1000.0, 1001.0, 1002.0];
      const probs = detSoftmax(input);
      expect(probs.some((p) => Number.isNaN(p))).toBe(false);
      const sum = probs.reduce((acc, p) => acc + p, 0);
      expect(sum).toBeCloseTo(1.0, 10);
    });

    it('handles empty or single-element vectors', () => {
      expect(detSoftmax([])).toEqual([]);
      expect(detSoftmax([5.0])).toEqual([1.0]);
    });

    it('handles non-finite or all -Infinity fallback gracefully (MA-09)', () => {
      const result = detSoftmax([-Infinity, -Infinity]);
      expect(result).toEqual([0.5, 0.5]);
    });
  });

  describe('detSin & detCos', () => {
    it('computes sine and cosine accurately', () => {
      const pi = 3.141592653589793;
      expect(detSin(0)).toBe(0.0);
      expect(detSin(pi / 2)).toBeCloseTo(1.0, 9);
      expect(detSin(pi)).toBeCloseTo(0.0, 9);
      expect(detSin(-pi / 2)).toBeCloseTo(-1.0, 9);

      expect(detCos(0)).toBeCloseTo(1.0, 9);
      expect(detCos(pi / 2)).toBeCloseTo(0.0, 9);
      expect(detCos(pi)).toBeCloseTo(-1.0, 9);
    });

    it('satisfies pythagorean trigonometric identity sin^2(x) + cos^2(x) = 1', () => {
      const angles = [0.1, 0.5, 1.0, 2.5, 4.0, 6.0];
      for (const a of angles) {
        const s = detSin(a);
        const c = detCos(a);
        expect(s * s + c * c).toBeCloseTo(1.0, 8);
      }
    });
  });

  describe('detClamp & detLerp', () => {
    it('clamps values properly', () => {
      expect(detClamp(5, 0, 10)).toBe(5);
      expect(detClamp(-5, 0, 10)).toBe(0);
      expect(detClamp(15, 0, 10)).toBe(10);
    });

    it('interpolates linearly', () => {
      expect(detLerp(10, 20, 0.0)).toBe(10);
      expect(detLerp(10, 20, 0.5)).toBe(15);
      expect(detLerp(10, 20, 1.0)).toBe(20);
    });
  });

  describe('Fixed16 (16.16 Fixed Point)', () => {
    it('converts to and from float accurately', () => {
      expect(Fixed16.toFloat(Fixed16.fromFloat(3.5))).toBe(3.5);
      expect(Fixed16.toFloat(Fixed16.fromFloat(-2.25))).toBe(-2.25);
    });

    it('multiplies fixed point numbers', () => {
      const a = Fixed16.fromFloat(2.5);
      const b = Fixed16.fromFloat(4.0);
      const prod = Fixed16.mul(a, b);
      expect(Fixed16.toFloat(prod)).toBe(10.0);
    });

    it('divides fixed point numbers and throws on division by zero', () => {
      const a = Fixed16.fromFloat(15.0);
      const b = Fixed16.fromFloat(3.0);
      const quot = Fixed16.div(a, b);
      expect(Fixed16.toFloat(quot)).toBe(5.0);
      expect(() => Fixed16.div(a, 0)).toThrowError(RangeError);
    });
  });
});
