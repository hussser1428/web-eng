import { describe, it, expect } from "vitest";
import { createEdgeTts, type EdgeClient } from "./edge-tts";

function fakeClient(overrides: Partial<EdgeClient> & { chunks?: Uint8Array[] } = {}) {
  const calls = { setMetadata: 0, toStream: 0, close: 0 };
  const chunks = overrides.chunks ?? [new Uint8Array([1, 2]), new Uint8Array([3, 4, 5])];
  const client: EdgeClient = {
    async setMetadata() {
      calls.setMetadata++;
    },
    toStream() {
      calls.toStream++;
      return {
        audioStream: (async function* () {
          for (const c of chunks) yield c;
        })(),
      };
    },
    close() {
      calls.close++;
    },
    ...overrides,
  };
  return { client, calls };
}

describe("createEdgeTts", () => {
  it("gom các chunk thành một mảng byte", async () => {
    const { client } = fakeClient({ chunks: [new Uint8Array([1, 2]), new Uint8Array([3, 4, 5])] });
    const p = createEdgeTts({ createClient: () => client });
    const result = await p.synthesize({ text: "hello", voice: "en-US-JennyNeural" });
    expect(Array.from(result)).toEqual([1, 2, 3, 4, 5]);
  });

  it("ném EMPTY khi text rỗng", async () => {
    const { client } = fakeClient();
    const p = createEdgeTts({ createClient: () => client });
    await expect(p.synthesize({ text: "   ", voice: "en-US-JennyNeural" })).rejects.toThrow("EMPTY");
  });

  it("ném TTS_UNAVAILABLE khi client ném lỗi", async () => {
    const client: EdgeClient = {
      async setMetadata() {
        throw new Error("boom");
      },
      toStream() {
        return { audioStream: (async function* () {})() };
      },
      close() {},
    };
    const p = createEdgeTts({ createClient: () => client });
    await expect(p.synthesize({ text: "hello", voice: "en-US-JennyNeural" })).rejects.toThrow("TTS_UNAVAILABLE");
  });

  it("ném TTS_UNAVAILABLE khi quá thời gian", async () => {
    const client: EdgeClient = {
      async setMetadata() {},
      toStream() {
        return {
          audioStream: (async function* () {
            await new Promise(() => {});
            yield new Uint8Array([1]);
          })(),
        };
      },
      close() {},
    };
    const p = createEdgeTts({ createClient: () => client, timeoutMs: 10 });
    await expect(p.synthesize({ text: "hello", voice: "en-US-JennyNeural" })).rejects.toThrow("TTS_UNAVAILABLE");
  });

  it("luôn gọi close", async () => {
    const { client, calls } = fakeClient();
    const p = createEdgeTts({ createClient: () => client });
    await p.synthesize({ text: "hello", voice: "en-US-JennyNeural" });
    expect(calls.close).toBe(1);

    const failing: EdgeClient = {
      async setMetadata() {
        throw new Error("boom");
      },
      toStream() {
        return { audioStream: (async function* () {})() };
      },
      close: () => {
        calls.close++;
      },
    };
    const p2 = createEdgeTts({ createClient: () => failing });
    await expect(p2.synthesize({ text: "hello", voice: "en-US-JennyNeural" })).rejects.toThrow();
    expect(calls.close).toBe(2);
  });
});
