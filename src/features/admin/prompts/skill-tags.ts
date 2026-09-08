/** Danh sách kỹ năng cố định để câu sinh ra gắn tag thống nhất, dùng chung cho mọi Part. */
export const SKILL_TAGS = [
  "grammar.tense",
  "grammar.preposition",
  "grammar.word-form",
  "grammar.pronoun",
  "grammar.conjunction",
  "vocab.collocation",
  "vocab.meaning",
  "reading.inference",
  "reading.detail",
  "reading.main-idea",
  "reading.vocabulary",
  "listening.question-response",
  "listening.detail",
  "listening.inference",
  "listening.gist",
] as const;

/** Câu nhắc model chỉ dùng tag trong danh sách, hoặc bám một tag cụ thể. */
export function skillTagLine(skillTag?: string): string {
  const list = `Allowed skillTags (use only these): ${SKILL_TAGS.join(", ")}.`;
  return skillTag
    ? `${list}\nEvery question must target the skill tag "${skillTag}".`
    : `${list}\nVary the skill tags across the questions.`;
}
