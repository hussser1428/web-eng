"use client";

import { useEffect, useState } from "react";
import { isSelectableTarget, blockContext } from "./selection-utils";

export type SelectionInfo = {
  text: string;
  rect: { top: number; left: number; width: number; height: number };
  context: string;
};

export function useSelection(): SelectionInfo | null {
  const [info, setInfo] = useState<SelectionInfo | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const read = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return setInfo(null);
      const text = sel.toString().trim();
      if (!text || text.length > 500) return setInfo(null);
      if (!isSelectableTarget(sel.anchorNode) || !isSelectableTarget(sel.focusNode)) return setInfo(null);
      const range = sel.getRangeAt(0);
      const r = range.getBoundingClientRect();
      setInfo({
        text,
        rect: { top: r.top + window.scrollY, left: r.left + window.scrollX, width: r.width, height: r.height },
        context: blockContext(sel.anchorNode) ?? text,
      });
    };

    const onUp = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Element | null;
      if (t?.closest?.("[data-translate-popup]")) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(read, 150);
    };
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Element | null;
      if (t?.closest?.("[data-translate-popup]")) return;
      setInfo(null);
    };

    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchend", onUp);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchend", onUp);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, []);

  return info;
}
