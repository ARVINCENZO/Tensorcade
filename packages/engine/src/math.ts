/**
 * Deterministic Mathematics & Floating-Point Approximations.
 *
 * Conforms to docs/13-engine-spec.md §7, ADR-008, and ADR-015:
 * - ECMAScript §21.2.2 spec-undefined transcendental math functions
 *   (Math.sin, Math.cos, Math.exp, Math.pow, etc.) are strictly forbidden in sim paths
 *   because V8, SpiderMonkey, and JSC diverge by 1-2 ULP, breaking replay verification.
 * - All functions below use pure IEEE-754 bit-exact arithmetic (+, -, *, /, Math.sqrt, Math.abs, Math.floor).
 */

// High-precision split ln(2) constants for exact range reduction without precision loss
const LN2_HI = 0.6931471803691238;
const LN2_LO = 1.9082149292705877e-10;
const INV_LN2 = 1.4426950408889634; // 1 / ln(2)
const PI = 3.141592653589793;
const TWO_PI = 6.283185307179586;
const HALF_PI = 1.5707963267948966;

/**
 * Precomputed 2^k lookup table for integer k in [-1024, 1024].
 * Initialized once at module load via exact IEEE-754 double binary exponent bits.
 * Avoids transcendental Math.pow(2, k).
 */
const POW2_OFFSET = 1024;
const POW2_TABLE = new Float64Array(2049);

(() => {
  const buf = new ArrayBuffer(8);
  const u32 = new Uint32Array(buf);
  const f64 = new Float64Array(buf);

  // Endianness check
  u32[0] = 1;
  const isLittleEndian = new Uint8Array(buf)[0] === 1;

  for (let k = -1022; k <= 1023; k++) {
    const exponent = (k + 1023) >>> 0;
    if (isLittleEndian) {
      u32[0] = 0;
      u32[1] = (exponent << 20) >>> 0;
    } else {
      /* v8 ignore next 3 */
      u32[0] = (exponent << 20) >>> 0;
      u32[1] = 0;
    }
    POW2_TABLE[k + POW2_OFFSET] = f64[0] ?? 0;
  }
  // Exponent bounds
  POW2_TABLE[-1023 + POW2_OFFSET] = 0.0;
  POW2_TABLE[-1024 + POW2_OFFSET] = 0.0;
  POW2_TABLE[1024 + POW2_OFFSET] = Infinity;
})();

/**
 * Returns exact 2^k for integer k.
 */
export function detPow2(k: number): number {
  if (k < -1022) return 0.0;
  if (k > 1023) return Infinity;
  return POW2_TABLE[k + POW2_OFFSET] ?? (k < 0 ? 0.0 : Infinity);
}

/**
 * Fast Deterministic Exponential Function (e^x).
 * Uses range reduction x = k * ln(2) + r and an 8th-degree minimax rational polynomial.
 * Guarantees bit-identical output across V8, SpiderMonkey, and JavaScriptCore.
 */
export function detExp(x: number): number {
  if (Number.isNaN(x)) return NaN;
  if (x === 0) return 1.0;
  if (x > 709.78) return Infinity;
  if (x < -745.0) return 0.0;

  // High-precision range reduction: x = k * ln(2) + r
  const k = Math.round(x * INV_LN2);
  const r = x - k * LN2_HI - k * LN2_LO;

  // 10th-degree polynomial for e^r via Horner's form:
  const c10 = 1.0 / 3628800.0;
  const c9 = 1.0 / 362880.0;
  const c8 = 1.0 / 40320.0;
  const c7 = 1.0 / 5040.0;
  const c6 = 1.0 / 720.0;
  const c5 = 1.0 / 120.0;
  const c4 = 1.0 / 24.0;
  const c3 = 1.0 / 6.0;
  const c2 = 0.5;
  const c1 = 1.0;
  const c0 = 1.0;

  const er =
    c0 +
    r *
      (c1 +
        r *
          (c2 +
            r * (c3 + r * (c4 + r * (c5 + r * (c6 + r * (c7 + r * (c8 + r * (c9 + r * c10)))))))));

  return detPow2(k) * er;
}

/**
 * Deterministic Sigmoid Activation Function: sigma(x) = 1 / (1 + e^-x).
 * Clamped for |x| > 40.0 to avoid numerical drift and underflow.
 */
export function detSigmoid(x: number): number {
  if (Number.isNaN(x)) return NaN;
  if (x > 40.0) return 1.0;
  if (x < -40.0) return 0.0;
  return 1.0 / (1.0 + detExp(-x));
}

/**
 * Deterministic Softmax Vector with numerical stability (max subtraction).
 */
export function detSoftmax(z: ReadonlyArray<number>): number[] {
  if (z.length === 0) return [];
  if (z.length === 1) return [1.0];

  // Step 1: Find max for numerical stability
  let maxVal = -Infinity;
  for (let i = 0; i < z.length; i++) {
    const val = z[i] ?? 0;
    if (val > maxVal) {
      maxVal = val;
    }
  }

  // Step 2: Compute exponentials and sum
  const expVals = new Array<number>(z.length);
  let sum = 0.0;
  for (let i = 0; i < z.length; i++) {
    const e = detExp((z[i] ?? 0) - maxVal);
    expVals[i] = e;
    sum += e;
  }

  // Step 3: Normalize probabilities
  if (sum === 0.0 || !Number.isFinite(sum)) {
    const uniform = 1.0 / z.length;
    return new Array<number>(z.length).fill(uniform);
  }

  for (let i = 0; i < expVals.length; i++) {
    expVals[i] = (expVals[i] ?? 0) / sum;
  }

  return expVals;
}

/**
 * Deterministic Sine via 11th-degree Chebyshev/Taylor expansion over [-PI/2, PI/2].
 */
export function detSin(x: number): number {
  if (Number.isNaN(x) || !Number.isFinite(x)) return NaN;

  // Range reduction to [0, TWO_PI)
  let y = x - Math.floor(x / TWO_PI) * TWO_PI;
  // Shift to [-PI, PI]
  if (y > PI) {
    y -= TWO_PI;
  }

  // Symmetry reduction to [-HALF_PI, HALF_PI]
  if (y > HALF_PI) {
    y = PI - y;
  } else if (y < -HALF_PI) {
    y = -PI - y;
  }

  const y2 = y * y;
  // 15th-degree polynomial expansion for sin(y):
  const c1 = 1.0;
  const c3 = 1.0 / 6.0;
  const c5 = 1.0 / 120.0;
  const c7 = 1.0 / 5040.0;
  const c9 = 1.0 / 362880.0;
  const c11 = 1.0 / 39916800.0;
  const c13 = 1.0 / 6227020800.0;
  const c15 = 1.0 / 1307674368000.0;

  return (
    y * (c1 - y2 * (c3 - y2 * (c5 - y2 * (c7 - y2 * (c9 - y2 * (c11 - y2 * (c13 - y2 * c15)))))))
  );
}

/**
 * Deterministic Cosine: cos(x) = sin(x + PI/2).
 */
export function detCos(x: number): number {
  return detSin(x + HALF_PI);
}

/**
 * Clamps a number between min and max.
 */
export function detClamp(x: number, min: number, max: number): number {
  return Math.min(Math.max(x, min), max);
}

/**
 * Deterministic Linear Interpolation: a + (b - a) * t.
 */
export function detLerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * 16.16 Fixed-Point arithmetic utilities for discrete physical coordinates.
 */
export const Fixed16 = {
  SCALE: 65536,
  fromFloat(f: number): number {
    return Math.round(f * 65536) | 0;
  },
  toFloat(fix: number): number {
    return fix / 65536;
  },
  mul(a: number, b: number): number {
    return Number((BigInt(a) * BigInt(b)) >> 16n) | 0;
  },
  div(a: number, b: number): number {
    if (b === 0) throw new RangeError('Fixed16.div: division by zero');
    return Number((BigInt(a) << 16n) / BigInt(b)) | 0;
  },
} as const;
