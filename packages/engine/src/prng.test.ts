import { describe, expect, it } from 'vitest';
import { DeterministicPRNG } from './prng.js';

describe('DeterministicPRNG (Mulberry32)', () => {
  it('generates bit-identical sequences for identical seeds', () => {
    const prng1 = new DeterministicPRNG(104729);
    const prng2 = new DeterministicPRNG(104729);

    for (let i = 0; i < 1000; i++) {
      expect(prng1.nextUint32()).toBe(prng2.nextUint32());
    }
  });

  it('generates different sequences for different seeds', () => {
    const prng1 = new DeterministicPRNG(104729);
    const prng2 = new DeterministicPRNG(224737);

    const values1 = Array.from({ length: 10 }, () => prng1.nextUint32());
    const values2 = Array.from({ length: 10 }, () => prng2.nextUint32());
    expect(values1).not.toEqual(values2);
  });

  it('generates floats in [0.0, 1.0)', () => {
    const prng = new DeterministicPRNG(42);
    for (let i = 0; i < 500; i++) {
      const f = prng.nextFloat();
      expect(f).toBeGreaterThanOrEqual(0.0);
      expect(f).toBeLessThan(1.0);
    }
  });

  it('generates integers strictly within [min, max]', () => {
    const prng = new DeterministicPRNG(1337);
    const min = -5;
    const max = 15;
    for (let i = 0; i < 500; i++) {
      const val = prng.nextInt(min, max);
      expect(Number.isInteger(val)).toBe(true);
      expect(val).toBeGreaterThanOrEqual(min);
      expect(val).toBeLessThanOrEqual(max);
    }
  });

  it('throws RangeError when max < min in nextInt', () => {
    const prng = new DeterministicPRNG(1);
    expect(() => prng.nextInt(10, 5)).toThrowError(RangeError);
  });

  it('captures and restores internal state identically', () => {
    const prng = new DeterministicPRNG(999);
    for (let i = 0; i < 50; i++) {
      prng.nextUint32();
    }
    const savedState = prng.getState();
    const next5Expected = Array.from({ length: 5 }, () => prng.nextUint32());

    // Restore state
    prng.setState(savedState);
    const next5Actual = Array.from({ length: 5 }, () => prng.nextUint32());
    expect(next5Actual).toEqual(next5Expected);
  });

  it('shuffles arrays deterministically using Fisher-Yates', () => {
    const prng1 = new DeterministicPRNG(777);
    const prng2 = new DeterministicPRNG(777);

    const arr1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const arr2 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    prng1.shuffle(arr1);
    prng2.shuffle(arr2);
    expect(arr1).toEqual(arr2);
    expect(arr1).toHaveLength(10);
  });

  it('forks independent child PRNG instances', () => {
    const parent = new DeterministicPRNG(42);
    const child1 = parent.fork();
    const child2 = parent.fork();

    expect(child1.getState()).not.toBe(child2.getState());
  });
});
