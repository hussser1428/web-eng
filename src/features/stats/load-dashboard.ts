import type { PrismaClient } from "@prisma/client";
import { getCertificate, getSection, type ScoreResult } from "@/features/certificates";
import { computeWeakness, type AnswerRow, type RateItem } from "./weakness";
import { countDueWords } from "@/features/vocab/count-due";

export type DashboardDb = Pick<PrismaClient, "attempt" | "attemptAnswer" | "userWord">;

/** Cửa sổ thời gian của bản đồ điểm yếu (spec mục 4.1). */
export const WINDOW_DAYS = 30;
/** Số lượt thi gần nhất vẽ lên đường tiến bộ. */
export const HISTORY_LIMIT = 5;
/** Số gợi ý luyện tập hiển thị. */
export const SUGGESTION_LIMIT = 3;

export type ExamPoint = { attemptId: string; submittedAt: string; total: number };
export type SectionRate = RateItem & { name: string };
export type Suggestion = { tag: string; section: string; sectionName: string; correct: number; total: number; rate: number };

export type Dashboard = {
  certificate: string;
  latest: { attemptId: string; submittedAt: string; scores: ScoreResult } | null;
  history: ExamPoint[];
  bySection: SectionRate[];
  byTag: RateItem[];
  suggestions: Suggestion[];
  answered: number;
  vocab: { due: number; saved: number };
};

export async function loadDashboard(db: DashboardDb, p: { userId: string; certificate: string; now?: Date }): Promise<Dashboard> {
  const cert = getCertificate(p.certificate);
  const now = p.now ?? new Date();
  const since = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // Các lượt thi thử đã nộp, mới nhất trước
  const exams = await db.attempt.findMany({
    where: { userId: p.userId, certificate: cert.id, type: "EXAM", submittedAt: { not: null } },
    orderBy: { submittedAt: "desc" },
    take: HISTORY_LIMIT,
    select: { id: true, submittedAt: true, scores: true },
  });

  const scored: { attemptId: string; submittedAt: string; scores: ScoreResult }[] = [];
  for (const e of exams) {
    const s = e.scores as ScoreResult | null;
    if (!e.submittedAt || !s || typeof s.total !== "number") continue;
    scored.push({ attemptId: e.id, submittedAt: e.submittedAt.toISOString(), scores: s });
  }
  const latest = scored[0] ?? null;
  // Đường tiến bộ đọc từ trái sang phải nên đảo lại thành cũ → mới
  const history: ExamPoint[] = [...scored].reverse().map((r) => ({ attemptId: r.attemptId, submittedAt: r.submittedAt, total: r.scores.total }));

  // Câu đã trả lời trong các lượt đã nộp gần đây (cả thi thử lẫn luyện tập)
  const rows = await db.attemptAnswer.findMany({
    where: {
      chosen: { not: null },
      attempt: { userId: p.userId, certificate: cert.id, submittedAt: { gte: since } },
    },
    select: { isCorrect: true, question: { select: { section: true, skillTags: true } } },
  });

  const answers: AnswerRow[] = rows.map((r) => ({ section: r.question.section, skillTags: r.question.skillTags, isCorrect: r.isCorrect }));
  const { bySection, byTag } = computeWeakness(answers);

  const named: SectionRate[] = bySection.map((s) => ({ ...s, name: getSection(cert, s.key)?.name ?? s.key }));

  // Mỗi kỹ năng gắn với phần thi hay gặp nhất, để gợi ý mở đúng bài drill
  const seen = new Map<string, Map<string, number>>();
  for (const a of answers) {
    if (a.isCorrect === null) continue;
    for (const tag of new Set(a.skillTags)) {
      const m = seen.get(tag) ?? new Map<string, number>();
      m.set(a.section, (m.get(a.section) ?? 0) + 1);
      seen.set(tag, m);
    }
  }
  const mainSection = (tag: string) => {
    const m = seen.get(tag);
    if (!m || m.size === 0) return "";
    return [...m].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))[0][0];
  };

  const suggestions: Suggestion[] = byTag.slice(0, SUGGESTION_LIMIT).map((t) => {
    const section = mainSection(t.key);
    return { tag: t.key, section, sectionName: getSection(cert, section)?.name ?? section, correct: t.correct, total: t.total, rate: t.rate };
  });

  const vocab = await countDueWords(db, { userId: p.userId, now });

  return {
    certificate: cert.id,
    latest,
    history,
    bySection: named,
    byTag,
    suggestions,
    answered: answers.filter((a) => a.isCorrect !== null).length,
    vocab,
  };
}
