/** Column width limits in px for the resizable Library and Notes columns (M5.4, D25). */
export const LIBRARY_WIDTH = { min: 180, max: 400, default: 240 };
export const NOTES_WIDTH = { min: 220, max: 520, default: 288 };
/** The editor always keeps at least this much room. */
export const EDITOR_MIN_WIDTH = 320;

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/**
 * Widths actually shown: saved widths, clamped to their limits, then shrunk (Notes first, then Library) so
 * the editor keeps EDITOR_MIN_WIDTH on narrow screens. Saved values are not changed.
 */
export function fitWidths(
  library: number,
  notes: number,
  viewport: number,
  libraryVisible: boolean,
) {
  let lib = libraryVisible
    ? clamp(library, LIBRARY_WIDTH.min, LIBRARY_WIDTH.max)
    : 0;
  let nts = clamp(notes, NOTES_WIDTH.min, NOTES_WIDTH.max);
  let overflow = lib + nts + EDITOR_MIN_WIDTH - viewport;
  if (overflow > 0) {
    const fromNotes = Math.min(overflow, nts - NOTES_WIDTH.min);
    nts -= fromNotes;
    overflow -= fromNotes;
  }
  if (overflow > 0 && libraryVisible) {
    lib -= Math.min(overflow, lib - LIBRARY_WIDTH.min);
  }
  return { library: lib, notes: nts };
}
