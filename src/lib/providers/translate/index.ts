import { createLibreTranslate } from "./libretranslate";
import type { TranslateProvider } from "./types";

let cached: TranslateProvider | null = null;

export function getTranslateProvider(): TranslateProvider {
  if (!cached) {
    cached = createLibreTranslate({ baseUrl: process.env.LIBRETRANSLATE_URL ?? "http://localhost:5000" });
  }
  return cached;
}
