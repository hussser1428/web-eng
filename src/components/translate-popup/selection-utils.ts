const BLOCKED = "input, textarea, [contenteditable], [data-no-translate], [data-translate-popup]";

export function isSelectableTarget(node: Node | null): boolean {
  if (!node) return false;
  const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  if (!el) return false;
  return el.closest(BLOCKED) === null;
}

const BLOCK_TAGS = new Set(["P", "DIV", "LI", "TD", "TH", "BLOCKQUOTE", "ARTICLE", "SECTION", "H1", "H2", "H3", "H4", "H5", "H6", "MAIN", "BODY"]);

export function blockContext(node: Node | null): string | null {
  let el: Element | null = node ? (node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement) : null;
  const marked = el?.closest("[data-translate-context]");
  if (marked) return marked.textContent?.replace(/\s+/g, " ").trim().slice(0, 300) || null;
  while (el && !BLOCK_TAGS.has(el.tagName)) el = el.parentElement;
  const text = el?.textContent?.replace(/\s+/g, " ").trim();
  return text ? text.slice(0, 300) : null;
}
