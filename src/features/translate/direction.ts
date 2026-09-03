export type Lang = "en" | "vi";

const VI_CHARS = /[àáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]/i;

export function detectDirection(text: string): { from: Lang; to: Lang } {
  return VI_CHARS.test(text) ? { from: "vi", to: "en" } : { from: "en", to: "vi" };
}
