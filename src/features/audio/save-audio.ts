import type { PrismaClient } from "@prisma/client";
import { audioUrlOf } from "./audio-url";

/** Lưu file audio vào database, trả về id và đường dẫn phục vụ tương đối. */
export async function saveAudio(
  db: Pick<PrismaClient, "audioFile">,
  bytes: Uint8Array,
  mime = "audio/mpeg",
): Promise<{ id: string; url: string }> {
  if (bytes.length === 0) throw new Error("EMPTY");
  const file = await db.audioFile.create({ data: { mime, bytes: Buffer.from(bytes) } });
  return { id: file.id, url: audioUrlOf(file.id) };
}
