import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSelection } from "./use-selection";

describe("useSelection", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("mouseup trong popup (bấm Lưu từ/Phát âm) không đọc lại selection và không đóng popup", () => {
    const popup = document.createElement("div");
    popup.setAttribute("data-translate-popup", "");
    const button = document.createElement("button");
    button.textContent = "Lưu từ";
    popup.appendChild(button);
    document.body.appendChild(popup);

    const getSelectionSpy = vi.spyOn(window, "getSelection");

    const { result } = renderHook(() => useSelection());
    expect(result.current).toBeNull();

    act(() => {
      button.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBeNull();
    expect(getSelectionSpy).not.toHaveBeenCalled();
  });

  it("mouseup ngoài popup vẫn đọc lại selection sau 150ms như cũ", () => {
    const p = document.createElement("p");
    const textNode = document.createTextNode("postpone the meeting");
    p.appendChild(textNode);
    document.body.appendChild(p);

    const fakeSelection = {
      rangeCount: 1,
      isCollapsed: false,
      toString: () => "postpone",
      anchorNode: textNode,
      focusNode: textNode,
      getRangeAt: () => ({
        getBoundingClientRect: () => ({ top: 10, left: 20, width: 30, height: 40 }),
      }),
    };
    vi.spyOn(window, "getSelection").mockReturnValue(fakeSelection as unknown as Selection);

    const { result } = renderHook(() => useSelection());

    act(() => {
      p.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toEqual({
      text: "postpone",
      rect: { top: 10, left: 20, width: 30, height: 40 },
      context: "postpone the meeting",
    });
  });
});
