"use client";

import type { QuestionForClient } from "@/features/questions/dto";
import { AudioOnce } from "./AudioOnce";

const LABELS = ["A", "B", "C", "D"];

type Props = {
  q: QuestionForClient;
  index: number;
  selected: number | null;
  onSelect?: (i: number) => void;
  disabled?: boolean;
  reveal?: { answer: number; explanation: string } | null;
  autoPlayAudio?: boolean;
  playedAudio?: ReadonlySet<string>;
  onAudioPlayed?: (src: string) => void;
};

export function QuestionCard({ q, index, selected, onSelect, disabled, reveal, autoPlayAudio, playedAudio, onAudioPlayed }: Props) {
  const locked = disabled || !!reveal;
  const audio = q.audioUrl ?? q.group?.audioUrl ?? null;
  const image = q.imageUrl ?? q.group?.imageUrl ?? null;
  // Part 1 và Part 2 thi thật chỉ nghe (Part 1 kèm ảnh), đề in mỗi chữ cái — chỉ hiện nội dung sau khi chấm.
  const hideChoiceText = (q.section === "toeic.p1" || q.section === "toeic.p2") && !reveal;

  const stateOf = (i: number): "correct" | "wrong" | "selected" | "idle" => {
    if (reveal) {
      if (i === reveal.answer) return "correct";
      if (i === selected) return "wrong";
      return "idle";
    }
    return i === selected ? "selected" : "idle";
  };

  const cls: Record<string, string> = {
    idle: "border-line hover:border-accent/60 hover:bg-surface-2",
    selected: "border-accent bg-accent/15",
    correct: "border-emerald-400 bg-emerald-400/15",
    wrong: "border-danger bg-danger/15",
  };

  return (
    <article className="card p-5 md:p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">Câu số {index}</p>
      {q.group?.passage && (
        <div className="mt-3 whitespace-pre-wrap rounded-xl border border-line bg-surface-2 p-4 text-sm leading-relaxed">{q.group.passage}</div>
      )}
      {image && <img src={image} alt="Hình của câu hỏi" className="mt-3 max-h-72 rounded-xl" />}
      {audio && (
        <div className="mt-3">
          <AudioOnce key={audio} src={audio} autoPlay={autoPlayAudio} played={playedAudio?.has(audio)} onPlayed={onAudioPlayed} />
        </div>
      )}
      {q.stem && <p className="mt-4 text-lg font-semibold leading-relaxed">{q.stem}</p>}

      <div role="radiogroup" aria-label="Lựa chọn" className="mt-4 flex flex-col gap-2">
        {q.choices.map((c, i) => {
          const st = stateOf(i);
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={i === selected}
              data-state={st}
              disabled={locked}
              onClick={() => !locked && onSelect?.(i)}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition disabled:cursor-default ${cls[st]}`}
            >
              {hideChoiceText ? (
                <span className="font-bold text-info">{LABELS[i]}</span>
              ) : (
                <>
                  <span className="font-bold text-info">{LABELS[i]}.</span>
                  <span>{c}</span>
                </>
              )}
            </button>
          );
        })}
      </div>

      {reveal && (
        <div className="mt-4 rounded-xl border border-line bg-surface-2 p-4 text-sm">
          <p className="font-semibold">Đáp án: {LABELS[reveal.answer]}</p>
          <p className="mt-1 leading-relaxed text-foreground/90">{reveal.explanation}</p>
        </div>
      )}
    </article>
  );
}
