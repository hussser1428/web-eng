import type { PrismaClient } from "@prisma/client";
import type { TtsProvider } from "@/lib/providers/tts/types";
import { saveAudio } from "@/features/audio/save-audio";
import { splitTranscript } from "./segments";
import { pickVoice, type SpeakerKind } from "./voices";

export const MAX_TTS_ITEMS = 10;

export type GenerateAudioDb = Pick<PrismaClient, "question" | "questionGroup" | "audioFile">;

export type GenerateAudioResult = {
  done: number;
  skipped: number;
  failed: number;
  overflow: number;
  errors: string[];
};

function errorCode(e: unknown): string {
  return e instanceof Error ? e.message : "TTS_UNAVAILABLE";
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/** Tổng hợp một transcript thành một file audio, giữ cùng giọng cho cùng người nói trong cả transcript. */
async function synthesizeTranscript(
  db: GenerateAudioDb,
  tts: TtsProvider,
  section: string,
  transcript: string,
  rand: () => number,
): Promise<string> {
  const voiceOf = new Map<SpeakerKind, string>();
  const chunks: Uint8Array[] = [];
  for (const seg of splitTranscript(section, transcript)) {
    let voice = voiceOf.get(seg.speaker);
    if (!voice) {
      voice = pickVoice(seg.speaker, rand);
      voiceOf.set(seg.speaker, voice);
    }
    chunks.push(await tts.synthesize({ text: seg.text, voice }));
  }
  const { url } = await saveAudio(db, concatBytes(chunks));
  return url;
}

/**
 * Tạo audio TOEIC Listening từ transcript cho các câu đã chọn (tối đa `MAX_TTS_ITEMS`).
 * Câu thuộc nhóm (Part 3/4) tổng hợp chung một file cho cả nhóm, dedupe theo `groupId` trong cùng lô.
 */
export async function generateAudio(
  db: GenerateAudioDb,
  tts: TtsProvider,
  p: { ids: string[] },
  deps: { rand?: () => number } = {},
): Promise<GenerateAudioResult> {
  const rand = deps.rand ?? Math.random;
  const overflow = Math.max(0, p.ids.length - MAX_TTS_ITEMS);
  const ids = p.ids.slice(0, MAX_TTS_ITEMS);
  const result: GenerateAudioResult = { done: 0, skipped: 0, failed: 0, overflow, errors: [] };
  if (ids.length === 0) return result;

  const rows = await db.question.findMany({ where: { id: { in: ids } }, include: { group: true } });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const seenGroups = new Set<string>();

  for (const id of ids) {
    const q = byId.get(id);
    if (!q) {
      result.skipped++;
      continue;
    }

    if (q.groupId) {
      if (seenGroups.has(q.groupId)) continue; // đã xử lý (hoặc thử xử lý) nhóm này trong lô — không đếm lại
      seenGroups.add(q.groupId);
      const group = q.group;
      if (!group || group.audioUrl || !group.transcript) {
        result.skipped++;
        continue;
      }
      try {
        const audioUrl = await synthesizeTranscript(db, tts, q.section, group.transcript, rand);
        await db.questionGroup.update({ where: { id: group.id }, data: { audioUrl } });
        result.done++;
      } catch (e) {
        result.failed++;
        result.errors.push(`${id}: ${errorCode(e)}`);
      }
      continue;
    }

    if (q.audioUrl || !q.transcript) {
      result.skipped++;
      continue;
    }
    try {
      const audioUrl = await synthesizeTranscript(db, tts, q.section, q.transcript, rand);
      await db.question.update({ where: { id }, data: { audioUrl } });
      result.done++;
    } catch (e) {
      result.failed++;
      result.errors.push(`${id}: ${errorCode(e)}`);
    }
  }

  return result;
}
