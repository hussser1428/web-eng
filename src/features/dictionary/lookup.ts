import type { PrismaClient } from "@prisma/client";
import { candidateForms } from "./normalize";

export type WordDto = {
  id: string;
  headword: string;
  phonetic: string | null;
  pos: string | null;
  meaningVi: string;
  exampleEn: string | null;
  exampleVi: string | null;
};

export async function lookupWord(db: Pick<PrismaClient, "word">, raw: string): Promise<WordDto | null> {
  if (/\s/.test(raw.trim())) return null;
  const forms = candidateForms(raw);
  if (forms.length === 0) return null;
  const rows = await db.word.findMany({
    where: { headword: { in: forms } },
    select: { id: true, headword: true, phonetic: true, pos: true, meaningVi: true, exampleEn: true, exampleVi: true },
  });
  for (const f of forms) {
    const hit = rows.find((r) => r.headword === f);
    if (hit) return hit;
  }
  return null;
}
