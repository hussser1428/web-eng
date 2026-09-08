import type { ReadingGenre, ReadingLevel } from "@prisma/client";
import { GENRES, LEVELS } from "@/features/reading/labels";

/** Số câu mục tiêu cho mỗi section TOEIC khi gieo dữ liệu ban đầu. */
export const TARGETS: Record<string, number> = {
  "toeic.p1": 6,
  "toeic.p2": 40,
  "toeic.p3": 45,
  "toeic.p4": 36,
  "toeic.p5": 80,
  "toeic.p6": 32,
  "toeic.p7": 60,
};

/** Section chia nhóm câu theo bội số (P3/P4: hội thoại/bài nói 3 câu một nhóm; P6: đoạn văn 4 câu một nhóm). */
const GROUP_UNIT: Record<string, number> = { "toeic.p3": 3, "toeic.p4": 3, "toeic.p6": 4 };
const GROUP_MAX_BATCH: Record<string, number> = { "toeic.p3": 9, "toeic.p4": 9, "toeic.p6": 8 };

/** Chia phần thiếu thành các lô ≤ max. P3/P4 lô là bội của 3 (nhóm 3 câu, tối đa 3 nhóm = 9); P6 bội của 4 (tối đa 8). Trả [] khi đủ. */
export function planBatches(section: string, have: number, target = TARGETS[section], max = 10): number[] {
  const shortfall = Math.max(0, (target ?? 0) - have);
  if (shortfall === 0) return [];

  const unit = GROUP_UNIT[section] ?? 1;
  const maxBatch = GROUP_MAX_BATCH[section] ?? max;

  const batches: number[] = [];
  let remaining = shortfall;
  while (remaining > maxBatch) {
    batches.push(maxBatch);
    remaining -= maxBatch;
  }
  batches.push(unit > 1 ? Math.ceil(remaining / unit) * unit : remaining);
  return batches;
}

export type ReadingSpec = { genre: ReadingGenre; level: ReadingLevel; length: "short" | "medium" | "long" };

const LENGTHS: ReadingSpec["length"][] = ["short", "medium", "long"];

/** 20 bài: thể loại xoay vòng HUMOR, FAIRY_TALE, ANIME, NEWS; độ khó xoay vòng A2,B1,B2,C1; độ dài short,medium,long. Xác định, không ngẫu nhiên. */
export function readingSpecs(count = 20): ReadingSpec[] {
  return Array.from({ length: count }, (_, i) => ({
    genre: GENRES[i % GENRES.length],
    level: LEVELS[Math.floor(i / GENRES.length) % LEVELS.length],
    length: LENGTHS[i % LENGTHS.length],
  }));
}
