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

  // Push base word unconditionally
  if (w.length > 0) {
    out.push(w);
  } else {
    return out; // Return empty array if normalized word is empty
  }

  if (w.length < 4) return out;

  if (w.endsWith("ies")) push(out, w.slice(0, -3) + "y");

  // Handle es/s rules with sibilant heuristic
  if (w.endsWith("es") && !w.endsWith("ies")) {
    const beforeEs = w.slice(0, -2);
    const sibilantEndings = ["s", "x", "z", "ch", "sh"];
    const endsWithSibilant = sibilantEndings.some(ending => beforeEs.endsWith(ending));

    if (endsWithSibilant) {
      // For boxes, watches, dishes: es-stem first
      push(out, beforeEs);
      push(out, w.slice(0, -1));
    } else {
      // For bees, trees, goes: s-stem first
      push(out, w.slice(0, -1));
      push(out, beforeEs);
    }
  } else if (w.endsWith("s") && !w.endsWith("ss")) {
    push(out, w.slice(0, -1));
  }

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
