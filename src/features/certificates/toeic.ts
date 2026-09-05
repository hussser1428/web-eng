import type { CertificateSpec, SectionSpec } from "./types";

// Bảng ước lượng quy đổi số câu đúng (0–100) sang điểm 5–495. Chỉ số mảng = số câu đúng. 101 phần tử mỗi bảng.
const LISTENING = [
  5, 5, 5, 5, 5, 5, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 110, 115, 120, 125,
  130, 135, 140, 145, 150, 160, 165, 170, 175, 180, 185, 190, 195, 200, 210, 215, 220, 230, 240, 245, 250, 255, 260, 270,
  275, 280, 290, 295, 300, 310, 315, 320, 325, 330, 340, 345, 350, 360, 365, 370, 380, 385, 390, 395, 400, 405, 410, 420,
  425, 430, 440, 445, 450, 460, 465, 470, 475, 480, 485, 490, 495, 495, 495, 495, 495, 495, 495, 495, 495, 495, 495,
];
const READING = [
  5, 5, 5, 5, 5, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125,
  130, 135, 140, 145, 150, 155, 160, 165, 170, 175, 180, 185, 190, 195, 200, 205, 210, 215, 220, 225, 230, 235, 240, 245,
  250, 255, 260, 265, 270, 275, 280, 285, 290, 295, 300, 305, 310, 320, 325, 330, 335, 340, 350, 355, 360, 365, 370, 380,
  385, 390, 395, 400, 405, 415, 420, 425, 430, 435, 445, 450, 455, 460, 465, 470, 475, 480, 485, 490, 495, 495, 495,
];

const sections: SectionSpec[] = [
  { id: "toeic.p1", name: "Part 1 – Mô tả tranh", skill: "listening", questionCount: 6, hasAudio: true, hasImage: true, choiceCount: 4 },
  { id: "toeic.p2", name: "Part 2 – Hỏi đáp", skill: "listening", questionCount: 25, hasAudio: true, hasImage: false, choiceCount: 3 },
  { id: "toeic.p3", name: "Part 3 – Hội thoại ngắn", skill: "listening", questionCount: 39, hasAudio: true, hasImage: false, choiceCount: 4 },
  { id: "toeic.p4", name: "Part 4 – Bài nói ngắn", skill: "listening", questionCount: 30, hasAudio: true, hasImage: false, choiceCount: 4 },
  { id: "toeic.p5", name: "Part 5 – Hoàn thành câu", skill: "reading", questionCount: 30, hasAudio: false, hasImage: false, choiceCount: 4 },
  { id: "toeic.p6", name: "Part 6 – Hoàn thành đoạn văn", skill: "reading", questionCount: 16, hasAudio: false, hasImage: false, choiceCount: 4 },
  { id: "toeic.p7", name: "Part 7 – Đọc hiểu", skill: "reading", questionCount: 54, hasAudio: false, hasImage: false, choiceCount: 4 },
];

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export const TOEIC: CertificateSpec = {
  id: "toeic",
  name: "TOEIC Listening & Reading",
  sections,
  timeLimits: { listening: 45, reading: 75 },
  score(correctBySection) {
    let listening = 0;
    let reading = 0;
    for (const s of sections) {
      const n = correctBySection[s.id] ?? 0;
      if (s.skill === "listening") listening += n;
      else reading += n;
    }
    const parts = { listening: LISTENING[clamp(listening)], reading: READING[clamp(reading)] };
    return { parts, total: parts.listening + parts.reading };
  },
};
