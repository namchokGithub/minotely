/** Longest icon accepted, in UTF-16 units; the same limit as firestore.rules (D46). */
export const MAX_NOTE_ICON_LENGTH = 16;

const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/**
 * The first character (grapheme) of the text, when it is not a letter, digit or
 * space; otherwise "". Note icons are one emoji or symbol (D46).
 */
export function toNoteIcon(text: string): string {
  const [first] = graphemes.segment(text.trim());
  const icon = first?.segment ?? "";
  if (!icon || icon.length > MAX_NOTE_ICON_LENGTH) return "";
  return /^[\p{L}\p{N}\s]/u.test(icon) ? "" : icon;
}
