import { createEdgeTts } from "./edge-tts";
import type { TtsProvider } from "./types";

let cached: TtsProvider | null = null;

export function getTtsProvider(): TtsProvider {
  if (!cached) {
    cached = createEdgeTts({});
  }
  return cached;
}
