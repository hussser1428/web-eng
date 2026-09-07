/** Số câu tối đa một lô sinh: sinh đồng bộ trong một request nên phải vừa giới hạn thời gian.
 *  Dùng chung cho chỗ kẹp `count` và chỗ quy số câu ra số đoạn văn của Part 6. */
export const MAX_COUNT = 10;

/** Part 3–4 nghe theo nhóm 3 câu: quy số câu yêu cầu ra số nhóm, tối thiểu 1 và tối đa 3 nhóm một lô. */
export function groupCount(count: number): number {
  return Math.min(3, Math.max(1, Math.round(count / 3)));
}
