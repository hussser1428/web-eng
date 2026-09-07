import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import type { TtsProvider } from "./types";

export type EdgeClient = {
  setMetadata(voice: string, format: string): Promise<void>;
  toStream(text: string): { audioStream: AsyncIterable<Uint8Array> };
  close(): void;
};

export function createEdgeTts(opts: { createClient?: () => EdgeClient; timeoutMs?: number }): TtsProvider {
  const createClient = opts.createClient ?? (() => new MsEdgeTTS() as unknown as EdgeClient);
  const timeoutMs = opts.timeoutMs ?? 20000;

  return {
    async synthesize({ text, voice }): Promise<Uint8Array> {
      if (text.trim() === "") throw new Error("EMPTY");

      const client = createClient();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const timeout = new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("TTS_UNAVAILABLE")), timeoutMs);
        });

        const synth = (async () => {
          await client.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
          const { audioStream } = client.toStream(text);
          const chunks: Buffer[] = [];
          for await (const chunk of audioStream) {
            chunks.push(Buffer.from(chunk));
          }
          const buf = Buffer.concat(chunks);
          if (buf.length === 0) throw new Error("TTS_UNAVAILABLE");
          return new Uint8Array(buf);
        })();

        return await Promise.race([synth, timeout]);
      } catch (e) {
        if (e instanceof Error && e.message === "TTS_UNAVAILABLE") throw e;
        throw new Error("TTS_UNAVAILABLE", { cause: e });
      } finally {
        clearTimeout(timer);
        client.close();
      }
    },
  };
}
