/** Trạng thái ôn ngắt quãng của một từ; tên trường khớp các cột của bảng UserWord. */
export type Sm2State = { easeFactor: number; intervalDays: number; repetitions: number };

/** Chất lượng trả lời quy đổi theo spec mục 6. */
export const QUALITY = {
  FORGOT: 1,
  HARD: 3,
  EASY: 5,
  QUIZ_CORRECT: 4,
  QUIZ_WRONG: 1,
} as const;

/** SM-2 không cho easeFactor xuống thấp hơn mức này, nếu không khoảng cách sẽ co lại vô hạn. */
export const MIN_EASE_FACTOR = 1.3;

const MS_MOT_NGAY = 24 * 60 * 60 * 1000;

/**
 * Một lượt ôn theo SM-2. Hàm thuần: không chạm database, không đọc đồng hồ.
 * Việc quy ra mốc `dueAt` do `review-word.ts` làm, vì chỉ chỗ đó mới biết "bây giờ" là lúc nào.
 */
export function reviewSm2(state: Sm2State, quality: number): Sm2State {
  const q = Math.max(0, Math.min(5, Math.round(quality)));
  const easeFactor = Math.max(MIN_EASE_FACTOR, state.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

  // Quên: học lại từ đầu, nhưng easeFactor đã giảm nên lần sau lên chậm hơn.
  if (q < 3) return { easeFactor, intervalDays: 1, repetitions: 0 };

  const repetitions = state.repetitions + 1;
  const intervalDays =
    repetitions === 1 ? 1 : repetitions === 2 ? 6 : Math.round(state.intervalDays * easeFactor);
  return { easeFactor, intervalDays, repetitions };
}

/** Cộng số ngày vào một mốc thời gian, trả về Date mới. */
export function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * MS_MOT_NGAY);
}
