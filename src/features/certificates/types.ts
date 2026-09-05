export type Skill = "listening" | "reading";

export type SectionSpec = {
  id: string; // "toeic.p5"
  name: string; // "Part 5 – Hoàn thành câu"
  skill: Skill;
  questionCount: number;
  hasAudio: boolean;
  hasImage: boolean;
  choiceCount: 3 | 4;
};

export type ScoreResult = { parts: Record<string, number>; total: number };

export type CertificateSpec = {
  id: string;
  name: string;
  sections: SectionSpec[];
  /** Phút cho mỗi kỹ năng. */
  timeLimits: Record<Skill, number>;
  /** Nhận số câu đúng theo section id, trả điểm theo kỹ năng và tổng. */
  score(correctBySection: Record<string, number>): ScoreResult;
};
