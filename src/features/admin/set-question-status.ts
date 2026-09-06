import type { ContentStatus, PrismaClient } from "@prisma/client";
import { getCertificate, getSection } from "@/features/certificates";

export type SetQuestionStatusDb = Pick<PrismaClient, "question">;

export type SetQuestionStatusResult = { updated: number; blocked: string[] };

type Row = { id: string; section: string; audioUrl: string | null; group: { audioUrl: string | null } | null };

/**
 * Đổi trạng thái hàng loạt. Khi đăng, câu thuộc phần thi có audio mà thiếu cả audio của câu
 * lẫn audio của nhóm thì không đăng và trả về trong `blocked`. Khi gỡ thì không kiểm tra audio.
 */
export async function setQuestionStatus(
  db: SetQuestionStatusDb,
  p: { ids: string[]; status: ContentStatus; certificate?: string },
): Promise<SetQuestionStatusResult> {
  if (p.ids.length === 0) return { updated: 0, blocked: [] };

  if (p.status !== "PUBLISHED") {
    const r = await db.question.updateMany({ where: { id: { in: p.ids } }, data: { status: p.status } });
    return { updated: r.count, blocked: [] };
  }

  const cert = getCertificate(p.certificate ?? "toeic");
  const rows = (await db.question.findMany({
    where: { id: { in: p.ids } },
    select: { id: true, section: true, audioUrl: true, group: { select: { audioUrl: true } } },
  })) as unknown as Row[];

  const blocked: string[] = [];
  const dangDuoc: string[] = [];
  for (const r of rows) {
    const thieuAudio = getSection(cert, r.section)?.hasAudio && !(r.audioUrl ?? r.group?.audioUrl);
    if (thieuAudio) blocked.push(r.id);
    else dangDuoc.push(r.id);
  }
  if (dangDuoc.length === 0) return { updated: 0, blocked };

  const r = await db.question.updateMany({ where: { id: { in: dangDuoc } }, data: { status: "PUBLISHED" } });
  return { updated: r.count, blocked };
}
