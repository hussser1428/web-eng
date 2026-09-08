import { getCertificate, getSection } from "@/features/certificates";
import { detectDirection } from "@/features/translate/direction";

export type QuestionForCheck = {
  id: string;
  section: string;
  choices: string[];
  answer: number;
  explanation: string;
  transcript: string | null;
  audioUrl: string | null;
  group: { transcript: string | null; audioUrl: string | null } | null;
};

const hasVietnamese = (text: string) => detectDirection(text).from === "vi";

/** trim, bỏ dấu câu cuối, không phân biệt hoa thường — để so khớp choices với transcript. */
const normalizeChoice = (s: string) => s.trim().toLowerCase().replace(/[.,!?;:]+$/, "").trim();

const P2_LINE_RE = [/^q:\s*(.*)$/i, /^a:\s*(.*)$/i, /^b:\s*(.*)$/i, /^c:\s*(.*)$/i];

/** Khớp transcript P2 với mẫu 4 dòng Q/A/B/C; trả về [a, b, c] hoặc null nếu sai định dạng. */
function matchP2Transcript(transcript: string | null): [string, string, string] | null {
  const lines = (transcript ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length !== 4) return null;

  const matched = lines.map((line, i) => line.match(P2_LINE_RE[i]));
  if (matched.some((m) => !m)) return null;

  return [matched[1]![1], matched[2]![1], matched[3]![1]];
}

/** mã lỗi: ANSWER_OUT_OF_RANGE, DUPLICATE_CHOICES, EXPLANATION_NOT_VI, MISSING_AUDIO, P2_TRANSCRIPT_LINES, P2_CHOICES_MISMATCH */
export function checkQuestion(q: QuestionForCheck): string[] {
  const errors: string[] = [];

  if (q.answer < 0 || q.answer >= q.choices.length) errors.push("ANSWER_OUT_OF_RANGE");

  const normalized = q.choices.map((c) => c.trim().toLowerCase());
  if (new Set(normalized).size !== normalized.length) errors.push("DUPLICATE_CHOICES");

  if (!hasVietnamese(q.explanation)) errors.push("EXPLANATION_NOT_VI");

  const spec = getSection(getCertificate("toeic"), q.section);
  if (spec?.hasAudio && !q.audioUrl && !q.group?.audioUrl) errors.push("MISSING_AUDIO");

  if (q.section === "toeic.p2") {
    const abc = matchP2Transcript(q.transcript);
    if (!abc) errors.push("P2_TRANSCRIPT_LINES");
    else if (abc.some((text, i) => normalizeChoice(text) !== normalizeChoice(q.choices[i] ?? ""))) {
      errors.push("P2_CHOICES_MISMATCH");
    }
  }

  return errors;
}

/** mã lỗi: TOO_SHORT (<8 câu), VI_NOT_VI (câu vi không có dấu), EN_HAS_VI (câu en có dấu tiếng Việt) */
export function checkReading(r: { sentences: Array<{ en: string; vi: string }> }): string[] {
  const errors: string[] = [];

  if (r.sentences.length < 8) errors.push("TOO_SHORT");
  if (r.sentences.some((s) => !hasVietnamese(s.vi))) errors.push("VI_NOT_VI");
  if (r.sentences.some((s) => hasVietnamese(s.en))) errors.push("EN_HAS_VI");

  return errors;
}
