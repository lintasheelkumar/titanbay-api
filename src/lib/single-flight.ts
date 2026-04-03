/**
 * Single-flight deduplication: if multiple concurrent callers request the
 * same key, only ONE underlying call is made. All others share its result.
 * Prevents cache stampedes under high load.
 */
export class SingleFlight {
  private readonly inFlight = new Map<string, Promise<unknown>>();

  async do<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.inFlight.get(key);
    if (existing) return existing as Promise<T>;

    const promise = fn().finally(() => {
      this.inFlight.delete(key);
    });

    this.inFlight.set(key, promise);
    return promise;
  }
}
