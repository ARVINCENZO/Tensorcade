/**
 * Pure TypeScript xxHash64 and Deterministic State Hashing.
 *
 * Conforms to docs/13-engine-spec.md §4 and ADR-015:
 * - 64-bit non-cryptographic hash for 60 Hz tick validation (> 5 GB/s throughput).
 * - Little-Endian byte packing across DataView instances.
 * - Bit-identical across V8, SpiderMonkey, and JavaScriptCore.
 */

const PRIME64_1 = 0x9e3779b185ebca87n;
const PRIME64_2 = 0xc2b2ae3d27d4eb4fn;
const PRIME64_3 = 0x165667b19e3779f9n;
const PRIME64_4 = 0x85ebca77c2b2ae63n;
const PRIME64_5 = 0x27d4eb2f165667c5n;
const MASK64 = 0xffffffffffffffffn;

function rotl64(x: bigint, r: bigint): bigint {
  return ((x << r) | (x >> (64n - r))) & MASK64;
}

function round64(acc: bigint, input: bigint): bigint {
  acc = (acc + ((input * PRIME64_2) & MASK64)) & MASK64;
  acc = rotl64(acc, 31n);
  acc = (acc * PRIME64_1) & MASK64;
  return acc;
}

function mergeRound64(acc: bigint, val: bigint): bigint {
  const roundVal = round64(0n, val);
  acc = (acc ^ roundVal) & MASK64;
  acc = ((acc * PRIME64_1) + PRIME64_4) & MASK64;
  return acc;
}

/**
 * Converts string to UTF-8 Uint8Array without DOM or Node dependencies.
 */
export function stringToBytes(str: string): Uint8Array {
  // Use TextEncoder where available (standard global in modern JS)
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str);
  }
  // Fallback UTF-8 encoder
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let code = str.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0xd800 || code >= 0xe000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      i++;
      code = 0x10000 + (((code & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return new Uint8Array(bytes);
}

/**
 * Computes 64-bit xxHash64 over binary input or string.
 */
export function xxHash64(
  input: Uint8Array | ArrayBuffer | string,
  seed = 0n,
): bigint {
  const bytes =
    typeof input === 'string'
      ? stringToBytes(input)
      : input instanceof Uint8Array
        ? input
        : new Uint8Array(input);

  const len = bytes.length;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let h64 = 0n;
  let offset = 0;

  if (len >= 32) {
    let v1 = (seed + PRIME64_1 + PRIME64_2) & MASK64;
    let v2 = (seed + PRIME64_2) & MASK64;
    let v3 = seed & MASK64;
    let v4 = (seed - PRIME64_1) & MASK64;

    const limit = len - 32;
    while (offset <= limit) {
      v1 = round64(v1, view.getBigUint64(offset, true));
      offset += 8;
      v2 = round64(v2, view.getBigUint64(offset, true));
      offset += 8;
      v3 = round64(v3, view.getBigUint64(offset, true));
      offset += 8;
      v4 = round64(v4, view.getBigUint64(offset, true));
      offset += 8;
    }

    h64 = (rotl64(v1, 1n) + rotl64(v2, 7n) + rotl64(v3, 12n) + rotl64(v4, 18n)) & MASK64;
    h64 = mergeRound64(h64, v1);
    h64 = mergeRound64(h64, v2);
    h64 = mergeRound64(h64, v3);
    h64 = mergeRound64(h64, v4);
  } else {
    h64 = (seed + PRIME64_5) & MASK64;
  }

  h64 = (h64 + BigInt(len)) & MASK64;

  // Remaining 8-byte chunks
  while (offset <= len - 8) {
    const k1 = round64(0n, view.getBigUint64(offset, true));
    h64 = (rotl64(h64 ^ k1, 27n) * PRIME64_1 + PRIME64_4) & MASK64;
    offset += 8;
  }

  // Remaining 4-byte chunk
  if (offset <= len - 4) {
    const k1 = BigInt(view.getUint32(offset, true)) * PRIME64_1 & MASK64;
    h64 = (rotl64(h64 ^ k1, 23n) * PRIME64_2 + PRIME64_3) & MASK64;
    offset += 4;
  }

  // Remaining bytes
  while (offset < len) {
    const k1 = BigInt(bytes[offset] ?? 0) * PRIME64_5 & MASK64;
    h64 = (rotl64(h64 ^ k1, 11n) * PRIME64_1) & MASK64;
    offset += 1;
  }

  // Final avalanche
  h64 = (h64 ^ (h64 >> 33n)) & MASK64;
  h64 = (h64 * PRIME64_2) & MASK64;
  h64 = (h64 ^ (h64 >> 29n)) & MASK64;
  h64 = (h64 * PRIME64_3) & MASK64;
  h64 = (h64 ^ (h64 >> 32n)) & MASK64;

  return h64;
}

/**
 * Formats a 64-bit bigint as a 16-character lowercase hexadecimal string.
 */
export function bigintToHex16(h: bigint): string {
  return (h & MASK64).toString(16).padStart(16, '0');
}

/**
 * Parses a 16-character hex string to a 64-bit bigint.
 */
export function hex16ToBigint(hex: string): bigint {
  if (!/^[0-9a-fA-F]{1,16}$/.test(hex)) {
    throw new TypeError(`Invalid hex16 string: "${hex}"`);
  }
  return BigInt(`0x${hex}`) & MASK64;
}

/**
 * Computes initial state hash H_0 = xxHash64(seed || levelId).
 */
export function computeInitialStateHash(seed: number, levelId: string): bigint {
  const levelBytes = stringToBytes(levelId);
  const buf = new Uint8Array(4 + levelBytes.length);
  const view = new DataView(buf.buffer);
  view.setUint32(0, seed >>> 0, true); // Little-Endian
  buf.set(levelBytes, 4);
  return xxHash64(buf);
}

/**
 * Updates cumulative state hash H_t = xxHash64(H_t-1 || tick || packedState).
 */
export function updateCumulativeStateHash(
  prevHash: bigint,
  tick: number,
  packedState: Uint8Array,
  reusableBuf?: Uint8Array,
  reusableView?: DataView,
): bigint {
  const requiredLen = 8 + 4 + packedState.length;
  const buf =
    reusableBuf && reusableBuf.length === requiredLen
      ? reusableBuf
      : new Uint8Array(requiredLen);
  const view =
    reusableView && reusableView.byteLength === requiredLen
      ? reusableView
      : new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  view.setBigUint64(0, prevHash & MASK64, true); // Little-Endian
  view.setUint32(8, tick >>> 0, true); // Little-Endian
  buf.set(packedState, 12);
  return xxHash64(buf);
}

/**
 * Canonical JSON Serialization (docs/13-engine-spec.md §5.2).
 * - Alphabetical key sorting.
 * - Undefined object properties are omitted.
 * - Undefined array elements are serialized as null.
 */
export function canonicalJsonStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj) ?? 'null';
  }
  if (Array.isArray(obj)) {
    return (
      '[' +
      obj
        .map((item) => (item === undefined ? 'null' : canonicalJsonStringify(item)))
        .join(',') +
      ']'
    );
  }
  const record = obj as Record<string, unknown>;
  const keys = Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort();
  const entries = keys.map(
    (key) => `${JSON.stringify(key)}:${canonicalJsonStringify(record[key])}`,
  );
  return '{' + entries.join(',') + '}';
}
