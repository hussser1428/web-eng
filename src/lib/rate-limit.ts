// ponytail: giới hạn trong bộ nhớ một tiến trình; nhiều tiến trình thì thay bằng Redis.
export function createRateLimiter(opts: { limit: number; windowMs: number; now?: () => number }) {
  const { limit, windowMs, now = Date.now } = opts;
  const hits = new Map<string, number[]>();

  return {
    check(key: string): boolean {
      const t = now();
      const cutoff = t - windowMs;
      const recent = (hits.get(key) ?? []).filter((ts) => ts > cutoff);
      if (recent.length === 0) hits.delete(key);
      else hits.set(key, recent);

      if (recent.length >= limit) return false;

      recent.push(t);
      hits.set(key, recent);
      return true;
    },
    /** Số key đang được theo dõi — chỉ dùng để test việc dọn key rỗng. */
    size(): number {
      return hits.size;
    },
  };
}
