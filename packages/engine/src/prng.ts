/**
 * Deterministic Pseudo-Random Number Generator (Mulberry32).
 *
 * Conforms to docs/13-engine-spec.md §3 and ADR-015:
 * - Pure TypeScript, zero DOM/Node APIs.
 * - 32-bit unsigned state progression with 2^32 period (~4.29 billion values).
 * - Identical numerical sequence across V8, SpiderMonkey, and JavaScriptCore.
 */
export class DeterministicPRNG {
  private state: number;

  constructor(seed: number) {
    // Force 32-bit unsigned integer initialization
    this.state = seed >>> 0;
  }

  /**
   * Advances state and returns an unsigned 32-bit pseudo-random integer.
   */
  public nextUint32(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t ^ (t >>> 14)) >>> 0;
  }

  /**
   * Returns a float in the half-open interval [0.0, 1.0).
   * Exact division by 2^32 (4294967296).
   */
  public nextFloat(): number {
    return this.nextUint32() / 4294967296;
  }

  /**
   * Returns an integer within the closed range [min, max].
   * Validates min <= max.
   */
  public nextInt(min: number, max: number): number {
    if (max < min) {
      throw new RangeError(`DeterministicPRNG.nextInt: max (${max}) must be >= min (${min})`);
    }
    const range = max - min + 1;
    return min + Math.floor(this.nextFloat() * range);
  }

  /**
   * Returns a deterministic boolean with specified probability of true.
   */
  public nextBoolean(probability = 0.5): boolean {
    return this.nextFloat() < probability;
  }

  /**
   * Shuffles an array in-place using Fisher-Yates deterministic algorithm.
   */
  public shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      const temp = array[i] as T;
      array[i] = array[j] as T;
      array[j] = temp;
    }
    return array;
  }

  /**
   * Captures PRNG internal state for snapshot/restore operations.
   */
  public getState(): number {
    return this.state;
  }

  /**
   * Restores PRNG internal state.
   */
  public setState(savedState: number): void {
    this.state = savedState >>> 0;
  }

  /**
   * Forks a child PRNG initialized from the next generated value.
   */
  public fork(): DeterministicPRNG {
    return new DeterministicPRNG(this.nextUint32());
  }
}
