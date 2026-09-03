import type { Lang } from "@/features/translate/direction";

export interface TranslateProvider {
  translate(text: string, from: Lang, to: Lang): Promise<string>;
}
