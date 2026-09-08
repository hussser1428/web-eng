import { describe, it, expect, vi } from "vitest";
import { generateAudio, MAX_TTS_ITEMS } from "./generate-audio";
import type { TtsProvider } from "@/lib/providers/tts/types";

type Group = { id: string; transcript: string | null; audioUrl: string | null };
type QuestionRow = {
  id: string;
  section: string;
  transcript: string | null;
  audioUrl: string | null;
  groupId: string | null;
  group: Group | null;
};

function question(p: Partial<QuestionRow> = {}): QuestionRow {
  return {
    id: "q1",
    section: "toeic.p4",
    transcript: "Attention passengers.",
    audioUrl: null,
    groupId: null,
    group: null,
    ...p,
  };
}

function fakeDb(rows: QuestionRow[]) {
  const findMany = vi.fn(async () => rows);
  const questionUpdate = vi.fn(async () => ({}));
  const groupUpdate = vi.fn(async () => ({}));
  let nextAudioId = 1;
  const audioCreate = vi.fn(async () => ({ id: `a${nextAudioId++}` }));
  const db = {
    question: { findMany, update: questionUpdate },
    questionGroup: { update: groupUpdate },
    audioFile: { create: audioCreate },
  } as unknown as Parameters<typeof generateAudio>[0];
  return { db, findMany, questionUpdate, groupUpdate, audioCreate };
}

function fakeTts(impl?: (input: { text: string; voice: string }) => Promise<Uint8Array>): TtsProvider & {
  synthesize: ReturnType<typeof vi.fn>;
} {
  const synthesize = vi.fn(impl ?? (async () => new Uint8Array([1])));
  return { synthesize };
}

describe("generateAudio", () => {
  it("nhóm chỉ tổng hợp một lần dù chọn ba câu", async () => {
    const group: Group = { id: "g1", transcript: "M: Hello\nW: Hi", audioUrl: null };
    const rows = [
      question({ id: "q1", section: "toeic.p3", groupId: "g1", group, transcript: null }),
      question({ id: "q2", section: "toeic.p3", groupId: "g1", group, transcript: null }),
      question({ id: "q3", section: "toeic.p3", groupId: "g1", group, transcript: null }),
    ];
    const { db, groupUpdate } = fakeDb(rows);
    const tts = fakeTts();

    const r = await generateAudio(db, tts, { ids: ["q1", "q2", "q3"] });

    expect(r).toEqual({ done: 1, skipped: 0, failed: 0, overflow: 0, errors: [] });
    expect(groupUpdate).toHaveBeenCalledTimes(1);
    expect(groupUpdate).toHaveBeenCalledWith({ where: { id: "g1" }, data: { audioUrl: "/api/audio/a1" } });
    expect(tts.synthesize).toHaveBeenCalledTimes(2); // M + W, một lần cho mỗi lượt trong transcript nhóm
  });

  it("bỏ qua câu đã có audio", async () => {
    const rows = [question({ id: "q1", audioUrl: "/api/audio/cu" })];
    const { db, questionUpdate } = fakeDb(rows);
    const tts = fakeTts();

    const r = await generateAudio(db, tts, { ids: ["q1"] });

    expect(r).toEqual({ done: 0, skipped: 1, failed: 0, overflow: 0, errors: [] });
    expect(questionUpdate).not.toHaveBeenCalled();
    expect(tts.synthesize).not.toHaveBeenCalled();
  });

  it("bỏ qua câu không có transcript", async () => {
    const rows = [question({ id: "q1", transcript: null })];
    const { db } = fakeDb(rows);
    const tts = fakeTts();

    const r = await generateAudio(db, tts, { ids: ["q1"] });

    expect(r).toEqual({ done: 0, skipped: 1, failed: 0, overflow: 0, errors: [] });
    expect(tts.synthesize).not.toHaveBeenCalled();
  });

  it("một mục lỗi không chặn mục sau", async () => {
    const rows = [
      question({ id: "q1", transcript: "Broken." }),
      question({ id: "q2", transcript: "Fine." }),
    ];
    const { db, questionUpdate } = fakeDb(rows);
    let call = 0;
    const tts = fakeTts(async () => {
      call++;
      if (call === 1) throw new Error("TTS_UNAVAILABLE");
      return new Uint8Array([9]);
    });

    const r = await generateAudio(db, tts, { ids: ["q1", "q2"] });

    expect(r).toEqual({ done: 1, skipped: 0, failed: 1, overflow: 0, errors: ["q1: TTS_UNAVAILABLE"] });
    expect(questionUpdate).toHaveBeenCalledTimes(1);
    expect(questionUpdate).toHaveBeenCalledWith({ where: { id: "q2" }, data: { audioUrl: "/api/audio/a1" } });
  });

  it("giữ cùng giọng cho cùng người nói", async () => {
    const rows = [question({ id: "q1", section: "toeic.p3", transcript: "M: Hi\nW: Hi\nM: Bye" })];
    const { db } = fakeDb(rows);
    const seenVoices: string[] = [];
    const tts = fakeTts(async ({ voice }) => {
      seenVoices.push(voice);
      return new Uint8Array([1]);
    });
    const rand = () => 0; // rand cố định để chọn cùng một giọng mỗi lần gọi pickVoice

    await generateAudio(db, tts, { ids: ["q1"] }, { rand });

    expect(seenVoices).toHaveLength(3);
    expect(seenVoices[0]).toBe(seenVoices[2]); // hai lượt "M" dùng chung một giọng
    expect(seenVoices[0]).not.toBe(seenVoices[1]); // "M" và "W" khác giọng
  });

  it("quá 10 mục thì overflow", async () => {
    const ids = Array.from({ length: 11 }, (_, i) => `q${i + 1}`); // 11 câu lẻ = 11 mục
    const rows = ids.map((id) => question({ id, transcript: null, audioUrl: "/a.mp3" }));
    const { db } = fakeDb(rows);
    const tts = fakeTts();

    const r = await generateAudio(db, tts, { ids });

    expect(r.overflow).toBe(1);
    expect(r.skipped).toBe(MAX_TTS_ITEMS);
    expect(tts.synthesize).not.toHaveBeenCalled();
  });

  it("chọn 15 câu của 5 nhóm là 5 mục, không overflow", async () => {
    const nhom = Array.from({ length: 5 }, (_, i) => ({
      id: `g${i + 1}`,
      transcript: "M: Hello\nW: Hi",
      audioUrl: null,
    }));
    const rows = nhom.flatMap((group, i) =>
      Array.from({ length: 3 }, (_, j) =>
        question({ id: `q${i * 3 + j + 1}`, section: "toeic.p3", groupId: group.id, group, transcript: null }),
      ),
    );
    const { db, groupUpdate } = fakeDb(rows);
    const tts = fakeTts();

    const r = await generateAudio(db, tts, { ids: rows.map((q) => q.id) });

    expect(r).toEqual({ done: 5, skipped: 0, failed: 0, overflow: 0, errors: [] });
    expect(groupUpdate).toHaveBeenCalledTimes(5);
  });

  it("id trùng trong cùng lô chỉ xử lý một lần", async () => {
    const rows = [question({ id: "q1", section: "toeic.p2", transcript: "Q: Hi there?" })];
    const { db, questionUpdate } = fakeDb(rows);
    const tts = fakeTts();

    const r = await generateAudio(db, tts, { ids: ["q1", "q1", "q1"] });

    expect(r).toEqual({ done: 1, skipped: 0, failed: 0, overflow: 0, errors: [] });
    expect(questionUpdate).toHaveBeenCalledTimes(1);
    expect(tts.synthesize).toHaveBeenCalledTimes(1);
  });
});
