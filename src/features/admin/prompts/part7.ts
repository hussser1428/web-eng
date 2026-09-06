import { skillTagLine } from "./skill-tags";

export const system = [
  "You are a TOEIC item writer. You produce exam content as JSON only: no markdown fence, no comment, no text before or after the JSON object.",
  'Every "explanation" field must be written in Vietnamese (tiếng Việt), 1–2 sentences, explaining why the key is correct.',
  "All other fields (stem, choices, passage) stay in natural business English.",
].join("\n");

/** Ví dụ đầu ra để model bám theo; test chạy qua `questionFileSchema` để không lệch schema. */
export const example = {
  certificate: "toeic",
  groups: [
    {
      key: "email1",
      section: "toeic.p7",
      passage:
        "To: r.tanaka@brightlogistics.com\nFrom: orders@greenleafsupply.com\nSubject: Order 4471\n\nDear Mr. Tanaka,\n\nThank you for your order of 20 ergonomic chairs. The items left our warehouse on May 2 and should reach your Harbor Street office within three business days. Because the order exceeds $2,000, the delivery fee has been waived. Please inspect the shipment on arrival and report any damage within 48 hours.\n\nSincerely,\nDana Ruiz, Customer Service",
    },
  ],
  questions: [
    {
      section: "toeic.p7",
      groupKey: "email1",
      stem: "Why was the delivery fee waived?",
      choices: [
        "The order was placed online.",
        "The order was worth more than $2,000.",
        "The customer is a new client.",
        "The shipment was delayed.",
      ],
      answer: 1,
      explanation: "Thư ghi rõ đơn hàng vượt 2.000 đô la nên được miễn phí giao hàng.",
      skillTags: ["reading.detail"],
    },
    {
      section: "toeic.p7",
      groupKey: "email1",
      stem: "What is Mr. Tanaka asked to do?",
      choices: [
        "Pay the remaining balance",
        "Check the goods when they arrive",
        "Return a signed contract",
        "Visit the warehouse",
      ],
      answer: 1,
      explanation: "Câu cuối yêu cầu kiểm tra hàng khi nhận và báo hư hỏng trong 48 giờ.",
      skillTags: ["reading.detail"],
    },
    {
      section: "toeic.p7",
      groupKey: "email1",
      stem: "What is suggested about Bright Logistics?",
      choices: [
        "It has an office on Harbor Street.",
        "It manufactures office furniture.",
        "It has cancelled a previous order.",
        "It operates only on weekends.",
      ],
      answer: 0,
      explanation: "Hàng được giao tới văn phòng ở Harbor Street nên suy ra công ty có văn phòng tại đó.",
      skillTags: ["reading.inference"],
    },
  ],
};

export function user(count: number, skillTag?: string): string {
  const passages = count <= 3 ? 1 : 2;
  return [
    `Write ${passages} ${passages === 1 ? "passage" : "passages"} for section "toeic.p7" (TOEIC Part 7 – reading comprehension) with ${count} questions in total, 2 to 5 questions per passage.`,
    "Each passage is a self-contained business document of 100–180 words: an email, a notice, an advertisement or a short article, with a realistic header when the type calls for one.",
    'Put each passage in "groups" with a unique "key"; every question repeats that key in "groupKey" and asks a full question in its "stem" with exactly 4 choices.',
    "Mix question types: detail, inference, main idea, and vocabulary in context. Every answer must be verifiable from the passage alone.",
    'Set "section" to "toeic.p7" on every group and every question. "answer" is the 0-based index of the correct choice.',
    skillTagLine(skillTag),
    "Return one JSON object with the same shape as this example:",
    JSON.stringify(example, null, 2),
  ].join("\n\n");
}
