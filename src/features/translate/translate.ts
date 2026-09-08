import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { lookupWord, type WordDto } from "@/features/dictionary/lookup";
import { detectDirection, type Lang } from "./direction";
import type { TranslateProvider } from "@/lib/providers/translate/types";

export const MAX_TEXT_LENGTH = 500;

export type TranslateResult =
  | { kind: "word"; word: WordDto; from: "en"; to: "vi" }
  | { kind: "text"; from: Lang; to: Lang; result: string }
  | { kind: "unavailable"; from: Lang; to: Lang };

export type TranslateDeps = {
  db: Pick<PrismaClient, "word" | "translationCache">;
  provider: TranslateProvider;
  rand?: () => number;
  now?: () => Date;
};

const CACHE_TTL_MS = 90 * 24 * 60 * 60 * 1000;

export function cacheKey(text: string, from: Lang, to: Lang): string {
  return createHash("sha256").update(`${from}:${to}:${text.trim().toLowerCase()}`).digest("hex");
}

export async function translateText(deps: TranslateDeps, rawText: string): Promise<TranslateResult> {
  const text = rawText.trim().replace(/\s+/g, " ");
  if (!text) throw new Error("EMPTY");
  if (text.length > MAX_TEXT_LENGTH) throw new Error("TEXT_TOO_LONG");

  const { from, to } = detectDirection(text);

  if (from === "en" && !/\s/.test(text)) {
    const word = await lookupWord(deps.db, text);
    if (word) return { kind: "word", word, from: "en", to: "vi" };
  }

  const key = cacheKey(text, from, to);
  const cached = await deps.db.translationCache.findUnique({ where: { key } });
  if (cached) return { kind: "text", from, to, result: cached.result };

  let result: string;
  try {
    result = await deps.provider.translate(text, from, to);
  } catch {
    return { kind: "unavailable", from, to };
  }

  try {
    await deps.db.translationCache.create({ data: { key, text, from, to, result } });
    // dọn cache cũ theo xác suất 1% mỗi lần ghi, tránh chạy DELETE trên mọi request
    if ((deps.rand ?? Math.random)() < 0.01) {
      const cutoff = new Date((deps.now ?? (() => new Date()))().getTime() - CACHE_TTL_MS);
      await deps.db.translationCache.deleteMany({ where: { createdAt: { lt: cutoff } } });
    }
  } catch (e) {
    console.warn("translationCache write failed", e);
  }

  return { kind: "text", from, to, result };
}
