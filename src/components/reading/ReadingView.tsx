"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { ReadingForClient, SentenceForClient } from "@/features/reading/get-reading";

type Props = { reading: ReadingForClient };

/** Trang đọc hai cột Anh–Việt: rê chuột vào một câu tô sáng câu cùng thứ tự ở cột kia, có thể ẩn cột Việt trên di động. */
export function ReadingView({ reading }: Props) {
  const [hoverOrder, setHoverOrder] = useState<number | null>(null);
  const [showVi, setShowVi] = useState(true);

  const spans = (sentences: SentenceForClient[], lang: "en" | "vi") =>
    sentences.flatMap((s, idx) => {
      const highlighted = s.order === hoverOrder;
      const span = (
        <span
          key={s.order}
          {...(lang === "en" ? { "data-translate-context": true } : {})}
          data-order={s.order}
          {...(highlighted ? { "data-highlight": "true" } : {})}
          className={highlighted ? "bg-accent/20 rounded" : undefined}
          onMouseEnter={() => setHoverOrder(s.order)}
          onMouseLeave={() => setHoverOrder(null)}
          // Trên màn hình cảm ứng, câu vừa chạm giữ tô sáng cho tới khi chạm câu khác — có chủ ý, làm mốc đọc.
          onTouchStart={() => setHoverOrder(s.order)}
        >
          {s[lang]}
        </span>
      );
      return idx === 0 ? [span] : [" ", span];
    });

  return (
    <div className="flex flex-col gap-6">
      <div className="md:hidden">
        <button
          type="button"
          aria-pressed={!showVi}
          onClick={() => setShowVi((v) => !v)}
          className="btn-primary inline-flex items-center gap-2 text-sm"
        >
          {showVi ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          {showVi ? "Ẩn tiếng Việt" : "Hiện tiếng Việt"}
        </button>
      </div>

      {reading.paragraphs.map((sentences, i) => (
        <div key={i} className="grid gap-3 md:grid-cols-2 md:gap-8">
          <p lang="en">{spans(sentences, "en")}</p>
          <p lang="vi" data-no-translate className={showVi ? "" : "hidden md:block"}>
            {spans(sentences, "vi")}
          </p>
        </div>
      ))}

      <footer className="text-sm text-muted">
        Nguồn: {reading.sourceName}
        {reading.sourceUrl && (
          <a href={reading.sourceUrl} target="_blank" rel="noreferrer" className="ml-1 text-info hover:underline">
            (xem gốc)
          </a>
        )}{" "}
        · Giấy phép: {reading.license}
      </footer>
    </div>
  );
}
