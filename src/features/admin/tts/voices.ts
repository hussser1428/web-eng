export type SpeakerKind = "M" | "W" | "N";

export const VOICES: Record<"M" | "W", readonly string[]> = {
  M: ["en-US-GuyNeural", "en-GB-RyanNeural", "en-AU-WilliamNeural"],
  W: ["en-US-JennyNeural", "en-GB-SoniaNeural", "en-AU-NatashaNeural"],
};

/** "N" (dẫn/không rõ giới) chọn ngẫu nhiên giữa M và W. */
export function pickVoice(kind: SpeakerKind, rand: () => number = Math.random): string {
  const list = kind === "N" ? VOICES[rand() < 0.5 ? "M" : "W"] : VOICES[kind];
  return list[Math.floor(rand() * list.length)];
}
