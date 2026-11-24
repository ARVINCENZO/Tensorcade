import { describe, expect, it } from 'vitest';
import {
  bigintToHex16,
  canonicalJsonStringify,
  computeInitialStateHash,
  hex16ToBigint,
  updateCumulativeStateHash,
  xxHash64,
} from './hash.js';

describe('xxHash64 & State Hashing (packages/engine/hash)', () => {
  describe('xxHash64 Reference Vectors', () => {
    it('matches golden xxHash64 vector for empty string and seed 0', () => {
      // Golden vector for xxHash64("", 0) is 0xef46db3751d8e999
      const hash = xxHash64('', 0n);
      expect(hash).toBe(0xef46db3751d8e999n);
      expect(bigintToHex16(hash)).toBe('ef46db3751d8e999');
    });

    it('produces identical output for identical inputs across invocations', () => {
      const h1 = xxHash64('The quick brown fox jumps over the lazy dog', 42n);
      const h2 = xxHash64('The quick brown fox jumps over the lazy dog', 42n);
      expect(h1).toBe(h2);
    });

    it('differentiates strings with single bit differences', () => {
      const h1 = xxHash64('hello world');
      const h2 = xxHash64('hello workd');
      expect(h1).not.toBe(h2);
    });

    it('processes inputs larger than 32 bytes with multiple blocks', () => {
      const longInput = 'A'.repeat(128);
      const h1 = xxHash64(longInput);
      const h2 = xxHash64(longInput);
      expect(h1).toBe(h2);
      expect(h1).not.toBe(0n);
    });
  });

  describe('Hex16 / BigInt serialization round-trip', () => {
    it('serializes to 16-character lowercase hex string and back', () => {
      const original = 0x0123456789abcdefn;
      const hex = bigintToHex16(original);
      expect(hex).toBe('0123456789abcdef');
      expect(hex).toHaveLength(16);
      expect(hex16ToBigint(hex)).toBe(original);
    });

    it('pads shorter values with leading zeroes', () => {
      const small = 0x42n;
      const hex = bigintToHex16(small);
      expect(hex).toBe('0000000000000042');
      expect(hex16ToBigint(hex)).toBe(small);
    });

    it('rejects invalid hex strings in hex16ToBigint', () => {
      expect(() => hex16ToBigint('not-hex-string!')).toThrowError(TypeError);
    });
  });

  describe('Cumulative State Hashing', () => {
    it('computes initial state hash deterministically from seed and levelId', () => {
      const h1 = computeInitialStateHash(104729, 'w1-robot-farm-1.1');
      const h2 = computeInitialStateHash(104729, 'w1-robot-farm-1.1');
      expect(h1).toBe(h2);

      const hDiffSeed = computeInitialStateHash(224737, 'w1-robot-farm-1.1');
      expect(h1).not.toBe(hDiffSeed);

      const hDiffLevel = computeInitialStateHash(104729, 'w1-robot-farm-1.2');
      expect(h1).not.toBe(hDiffLevel);
    });

    it('accumulates state hashes tick-by-tick deterministically', () => {
      const h0 = computeInitialStateHash(42, 'w3-blind-mountaineer-3.1');
      const state1 = new Uint8Array([1, 2, 3, 4]);
      const state2 = new Uint8Array([5, 6, 7, 8]);

      const h1a = updateCumulativeStateHash(h0, 1, state1);
      const h1b = updateCumulativeStateHash(h0, 1, state1);
      expect(h1a).toBe(h1b);

      const h2a = updateCumulativeStateHash(h1a, 2, state2);
      const h2b = updateCumulativeStateHash(h1b, 2, state2);
      expect(h2a).toBe(h2b);
    });
  });

  describe('canonicalJsonStringify', () => {
    it('sorts object keys alphabetically regardless of insertion order', () => {
      const obj1 = { z: 1, a: 2, m: 3 };
      const obj2 = { a: 2, m: 3, z: 1 };
      expect(canonicalJsonStringify(obj1)).toBe('{"a":2,"m":3,"z":1}');
      expect(canonicalJsonStringify(obj1)).toBe(canonicalJsonStringify(obj2));
    });

    it('omits undefined object properties conforming to JSON standard', () => {
      const obj = { visible: 'yes', secret: undefined };
      expect(canonicalJsonStringify(obj)).toBe('{"visible":"yes"}');
    });

    it('serializes undefined array items as null', () => {
      const arr = ['first', undefined, 'third'];
      expect(canonicalJsonStringify(arr)).toBe('["first",null,"third"]');
    });

    it('handles nested objects, arrays, and primitive values', () => {
      const complex = {
        tick: 42,
        actions: [{ type: 'HARVEST', x: 2, y: undefined }],
        tags: ['alpha', 'beta'],
      };
      const result = canonicalJsonStringify(complex);
      expect(result).toBe('{"actions":[{"type":"HARVEST","x":2}],"tags":["alpha","beta"],"tick":42}');
    });
  });
});
