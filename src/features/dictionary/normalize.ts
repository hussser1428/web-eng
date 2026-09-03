export function normalizeHeadword(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

function push(out: string[], w: string) {
  if (w.length >= 2 && !out.includes(w)) out.push(w);
}

export function candidateForms(input: string): string[] {
  const w = normalizeHeadword(input);
  const out: string[] = [];
  push(out, w);
  if (w.length < 4) return out;

  if (w.endsWith("ies")) push(out, w.slice(0, -3) + "y");
  if (w.endsWith("es")) push(out, w.slice(0, -2));
  if (w.endsWith("s") && !w.endsWith("ss")) push(out, w.slice(0, -1));

  if (w.endsWith("ied")) push(out, w.slice(0, -3) + "y");
  if (w.endsWith("ed")) {
    const stem = w.slice(0, -2);
    push(out, stem);
    push(out, stem + "e");
    if (stem.length >= 3 && stem[stem.length - 1] === stem[stem.length - 2]) push(out, stem.slice(0, -1));
  }

  if (w.endsWith("ing")) {
    const stem = w.slice(0, -3);
    push(out, stem);
    push(out, stem + "e");
    if (stem.length >= 3 && stem[stem.length - 1] === stem[stem.length - 2]) push(out, stem.slice(0, -1));
  }
  return out;
}
