/**
 * Page width presets (D45): how wide the page column is drawn, like a paper size
 * in a word processor. Length is never limited. A preview only: one value for
 * all notes, kept in the persisted UI store on this device.
 */
export type PageWidth = "default" | "a5" | "a4" | "letter" | "a3" | "full";

/** CSS max-width of the page column; it still shrinks to fit narrower editors. */
export const PAGE_WIDTHS: Record<
  PageWidth,
  { label: string; maxWidth: string }
> = {
  default: { label: "Default", maxWidth: "48rem" }, // 768px
  a5: { label: "A5", maxWidth: "148mm" }, // 559px at 96px per inch
  a4: { label: "A4", maxWidth: "210mm" }, // 794px
  letter: { label: "Letter", maxWidth: "8.5in" }, // 816px
  a3: { label: "A3", maxWidth: "297mm" }, // 1123px
  full: { label: "Full (90%)", maxWidth: "90%" }, // of the editor area
};

export const isPageWidth = (value: unknown): value is PageWidth =>
  typeof value === "string" && value in PAGE_WIDTHS;
