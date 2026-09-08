export interface TtsProvider {
  /** Trả MP3 (24 kHz, 48 kbps, mono). Ném Error("TTS_UNAVAILABLE") khi dịch vụ lỗi/timeout, Error("EMPTY") khi text rỗng. */
  synthesize(input: { text: string; voice: string }): Promise<Uint8Array>;
}
