/**
 * Code block colors (D48): a per-device preview setting for all notes, like page
 * width (D45). Each name maps to a `.code-theme-*` class in index.css.
 */
export type CodeTheme = "default" | "dark" | "sepia" | "blue" | "green";

export const CODE_THEMES: Record<CodeTheme, string> = {
  default: "Default",
  dark: "Dark",
  sepia: "Sepia",
  blue: "Blue",
  green: "Green",
};

export const isCodeTheme = (value: unknown): value is CodeTheme =>
  typeof value === "string" && value in CODE_THEMES;
