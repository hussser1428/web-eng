import { pickDueWords, type DueWord, type PickDueDb } from "./pick-due";
import { pickDistractors, type Distractor, type DistractorDb } from "./pick-distractors";

export type SessionDb = PickDueDb & DistractorDb;

export type ReviewMode = "FLASHCARD" | "QUIZ";
export type Direction = "EN_TO_VI" | "VI_TO_EN";

export type QuizChoice = { id: string; text: string };

/** Một câu trắc nghiệm gửi xuống client. Cố tình không có trường đáp án. */
export type QuizItem = {
  wordId: string;
  direction: Direction;
  prompt: string;
  phonetic: string | null;
  choices: QuizChoice[];
};

export type VocabSession =
  | { mode: "FLASHCARD"; early: boolean; items: DueWord[] }
  | { mode: "QUIZ"; early: boolean; items: QuizItem[] };

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rand() * (i + 1)));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function textOf(direction: Direction, w: { headword: string; meaningVi: string }): string {
  return direction === "EN_TO_VI" ? w.meaningVi : w.headword;
}

function buildQuizItem(word: DueWord, distractors: Distractor[], direction: Direction, rand: () => number): QuizItem {
  const choices = shuffle(
    [
      { id: word.wordId, text: textOf(direction, word) },
      ...distractors.map((d) => ({ id: d.id, text: textOf(direction, d) })),
    ],
    rand,
  );
  return {
    wordId: word.wordId,
    direction,
    prompt: direction === "EN_TO_VI" ? word.headword : word.meaningVi,
    // Chiều Việt → Anh mà hiện phiên âm là lộ đáp án
    phonetic: direction === "EN_TO_VI" ? word.phonetic : null,
    choices,
  };
}

/**
 * Dựng sẵn cả một phiên ôn trong một lần gọi, để trang server chỉ cần truyền
 * xuống component client — không có màn hình chờ giữa chừng.
 */
export async function startVocabSession(
  db: SessionDb,
  p: { userId: string; mode: ReviewMode; now?: Date; rand?: () => number },
): Promise<VocabSession> {
  const rand = p.rand ?? Math.random;
  const { early, words } = await pickDueWords(db, { userId: p.userId, now: p.now });

  if (p.mode === "FLASHCARD") return { mode: "FLASHCARD", early, items: words };

  const items: QuizItem[] = [];
  for (const w of words) {
    const direction: Direction = rand() < 0.5 ? "EN_TO_VI" : "VI_TO_EN";
    try {
      const distractors = await pickDistractors(db, {
        userId: p.userId,
        word: { id: w.wordId, pos: w.pos, meaningVi: w.meaningVi },
        rand,
      });
      items.push(buildQuizItem(w, distractors, direction, rand));
    } catch (e) {
      // Từ điển chưa đủ từ cùng loại: bỏ qua từ này, phiên vẫn chạy tiếp
      if (e instanceof Error && e.message === "NOT_ENOUGH_WORDS") continue;
      throw e;
    }
  }
  if (items.length === 0 && words.length > 0) throw new Error("NOT_ENOUGH_WORDS");
  return { mode: "QUIZ", early, items };
}
