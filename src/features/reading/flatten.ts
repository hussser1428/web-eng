export type FlatSentence = { order: number; paragraphIndex: number; en: string; vi: string };

/**
 * Trải mảng đoạn thành danh sách câu: `order` đánh số liên tục qua mọi đoạn, `paragraphIndex`
 * giữ đoạn gốc. `wordCount` đếm từ tiếng Anh. Dùng chung cho nhập file và sửa bài, để hai
 * đường ghi không lệch cách tính.
 */
export function flattenParagraphs(paragraphs: Array<Array<{ en: string; vi: string }>>): {
  rows: FlatSentence[];
  wordCount: number;
} {
  const rows = paragraphs
    .flatMap((paragraph, paragraphIndex) => paragraph.map((s) => ({ paragraphIndex, en: s.en, vi: s.vi })))
    .map((s, i) => ({ order: i + 1, ...s }));
  const wordCount = rows.reduce((sum, s) => sum + s.en.split(/\s+/).filter(Boolean).length, 0);
  return { rows, wordCount };
}
