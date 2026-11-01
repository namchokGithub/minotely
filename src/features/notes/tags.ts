const MAX_TAG_LENGTH = 32;

/** "#Work Notes " → "work-notes". Returns "" when nothing usable is left. */
export function normalizeTag(input: string): string {
  return input
    .trim()
    .replace(/^#+/, "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .slice(0, MAX_TAG_LENGTH);
}

/** Unique tags across notes, sorted A–Z. */
export function collectTags(notes: { tags: string[] }[]): string[] {
  return [...new Set(notes.flatMap((n) => n.tags))].sort((a, b) =>
    a.localeCompare(b),
  );
}
