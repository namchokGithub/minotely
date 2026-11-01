import type { Note } from "@/features/notes/types";

export type SearchResult = { note: Note; snippet: string };

const SNIPPET_RADIUS = 40;

/**
 * Client-side search (D4). Every whitespace-separated term must appear in the
 * title, content, or tags. Title matches rank first, then most recently updated.
 */
export function searchNotes(notes: Note[], input: string, limit = 50) {
  const terms = input.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  const results: (SearchResult & { titleHit: boolean })[] = [];
  for (const note of notes) {
    const title = note.title.toLowerCase();
    const text = note.plainText.toLowerCase();
    const tags = note.tags.join(" ").toLowerCase();
    const matches = terms.every(
      (t) =>
        title.includes(t) ||
        text.includes(t) ||
        tags.includes(t.replace(/^#/, "")),
    );
    if (!matches) continue;
    results.push({
      note,
      snippet: makeSnippet(note.plainText, text, terms),
      titleHit: terms.some((t) => title.includes(t)),
    });
  }

  return results
    .sort(
      (a, b) =>
        Number(b.titleHit) - Number(a.titleHit) ||
        b.note.updatedAt.getTime() - a.note.updatedAt.getTime(),
    )
    .slice(0, limit)
    .map(({ note, snippet }) => ({ note, snippet }));
}

function makeSnippet(original: string, lower: string, terms: string[]) {
  const index = terms
    .map((t) => lower.indexOf(t))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b)[0];
  if (index === undefined) return original.slice(0, SNIPPET_RADIUS * 2).trim();
  const start = Math.max(0, index - SNIPPET_RADIUS);
  const end = Math.min(original.length, index + SNIPPET_RADIUS);
  return (
    (start > 0 ? "…" : "") +
    original.slice(start, end).replace(/\s+/g, " ").trim() +
    (end < original.length ? "…" : "")
  );
}
