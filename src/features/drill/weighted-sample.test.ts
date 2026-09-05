import { describe, it, expect } from "vitest";
import { weightedSample } from "./weighted-sample";

// rand tất định: trả lần lượt các giá trị trong mảy
function seq(values: number[]) {
  let i = 0;
  return () => values[i++ % values.length];
}

describe("weightedSample", () => {
  it("không lặp phần tử và trả đúng số lượng", () => {
    const r = weightedSample([1, 2, 3, 4, 5], () => 1, 3, seq([0.1, 0.5, 0.9]));
    expect(r).toHaveLength(3);
    expect(new Set(r).size).toBe(3);
  });

  it("count lớn hơn số phần tử thì trả tất cả", () => {
    expect(weightedSample(["a", "b"], () => 1, 5, seq([0.3])).sort()).toEqual(["a", "b"]);
  });

  it("phần tử trọng số lớn được chọn trước khi rand nhỏ", () => {
    // trọng số: a=3, b=1 → tổng 4; rand 0.5*4 = 2 rơi vào a (0–3)
    expect(weightedSample(["a", "b"], (x) => (x === "a" ? 3 : 1), 1, seq([0.5]))).toEqual(["a"]);
    // rand 0.9*4 = 3.6 rơi vào b (3–4)
    expect(weightedSample(["a", "b"], (x) => (x === "a" ? 3 : 1), 1, seq([0.9]))).toEqual(["b"]);
  });

  it("phần tử trọng số 0 chỉ được chọn khi không còn gì khác", () => {
    const r = weightedSample(["zero", "one"], (x) => (x === "zero" ? 0 : 1), 2, seq([0.5]));
    expect(r[0]).toBe("one");
    expect(r[1]).toBe("zero");
  });
});
