import type { Question, QuestionGroup } from "@prisma/client";

export type QuestionForClient = {
  id: string;
  section: string;
  order: number;
  stem: string | null;
  choices: string[];
  audioUrl: string | null;
  imageUrl: string | null;
  group: { id: string; passage: string | null; audioUrl: string | null; imageUrl: string | null } | null;
  chosen: number | null;
};

/** Bỏ đáp án, giải thích, transcript trước khi gửi xuống client. */
export function toClientQuestion(q: Question & { group: QuestionGroup | null }, order: number, chosen: number | null): QuestionForClient {
  return {
    id: q.id,
    section: q.section,
    order,
    stem: q.stem,
    choices: q.choices as string[],
    audioUrl: q.audioUrl,
    imageUrl: q.imageUrl,
    group: q.group ? { id: q.group.id, passage: q.group.passage, audioUrl: q.group.audioUrl, imageUrl: q.group.imageUrl } : null,
    chosen,
  };
}
