import { describe, it, expect } from "vitest";
import { isSelectableTarget, blockContext } from "./selection-utils";

function html(s: string) {
  document.body.innerHTML = s;
  return document.body;
}

describe("isSelectableTarget", () => {
  it("false trong input/textarea/contenteditable", () => {
    html(`<input id="i"><textarea id="t"></textarea><div contenteditable id="c"><span id="cs">x</span></div>`);
    expect(isSelectableTarget(document.getElementById("i"))).toBe(false);
    expect(isSelectableTarget(document.getElementById("t"))).toBe(false);
    expect(isSelectableTarget(document.getElementById("cs"))).toBe(false);
  });
  it("false trong data-no-translate và trong popup", () => {
    html(`<div data-no-translate><p id="p">x</p></div><div data-translate-popup><b id="b">y</b></div>`);
    expect(isSelectableTarget(document.getElementById("p"))).toBe(false);
    expect(isSelectableTarget(document.getElementById("b"))).toBe(false);
  });
  it("true với text thường", () => {
    html(`<p id="p">hello <em id="e">world</em></p>`);
    expect(isSelectableTarget(document.getElementById("e")!.firstChild)).toBe(true);
  });
  it("null thì false", () => {
    expect(isSelectableTarget(null)).toBe(false);
  });
});

describe("blockContext", () => {
  it("lấy text của phần tử khối gần nhất, cắt 300 ký tự", () => {
    html(`<div><p id="p">The committee will <b id="b">postpone</b> the meeting.</p></div>`);
    expect(blockContext(document.getElementById("b")!.firstChild)).toBe("The committee will postpone the meeting.");
    html(`<p id="p">${"a".repeat(400)}</p>`);
    expect(blockContext(document.getElementById("p")!.firstChild)!.length).toBe(300);
  });
  it("ưu tiên phần tử có data-translate-context thay vì thẻ khối", () => {
    html(`<p><span data-translate-context id="ctx">Câu một.</span> <span>Câu hai.</span></p>`);
    expect(blockContext(document.getElementById("ctx")!.firstChild)).toBe("Câu một.");
  });
  it("vẫn lấy thẻ khối khi không có thuộc tính", () => {
    html(`<p id="p">The meeting is <b id="b">postponed</b>.</p>`);
    expect(blockContext(document.getElementById("b")!.firstChild)).toBe("The meeting is postponed.");
  });
});
