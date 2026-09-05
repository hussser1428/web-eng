/** Rút `count` phần tử không lặp theo trọng số. Trọng số 0 chỉ được chọn khi mọi phần tử còn lại đều 0. */
export function weightedSample<T>(items: T[], weightOf: (t: T) => number, count: number, rand: () => number = Math.random): T[] {
  const pool = items.map((item) => ({ item, w: Math.max(0, weightOf(item)) }));
  const out: T[] = [];
  while (out.length < count && pool.length > 0) {
    const total = pool.reduce((s, p) => s + p.w, 0);
    let idx = 0;
    if (total > 0) {
      let r = rand() * total;
      for (idx = 0; idx < pool.length; idx++) {
        r -= pool[idx].w;
        if (r < 0) break;
      }
      if (idx >= pool.length) idx = pool.length - 1;
    } else {
      idx = Math.min(pool.length - 1, Math.floor(rand() * pool.length));
    }
    out.push(pool[idx].item);
    pool.splice(idx, 1);
  }
  return out;
}
