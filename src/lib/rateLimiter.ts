/**
 * Simple token-bucket rate limiter to keep us inside free-tier quotas
 * (e.g. Twelve Data allows ~8 requests/minute on the free plan). Client-side
 * best-effort guard — the proxy can enforce harder limits server-side later.
 */
export class TokenBucket {
  private tokens: number;
  private last: number;

  constructor(
    private readonly capacity: number,
    private readonly refillPerMinute: number,
  ) {
    this.tokens = capacity;
    this.last = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsedMin = (now - this.last) / 60_000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsedMin * this.refillPerMinute);
    this.last = now;
  }

  /** Take `n` tokens if available; returns false (without consuming) otherwise. */
  tryTake(n = 1): boolean {
    this.refill();
    if (this.tokens >= n) {
      this.tokens -= n;
      return true;
    }
    return false;
  }

  get available(): number {
    this.refill();
    return Math.floor(this.tokens);
  }
}
