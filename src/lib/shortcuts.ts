const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * One shortcut in three forms (M5.9): `keys` like "Mod+Shift+H" → a label for titles ("⌘⇧H" / "Ctrl+Shift+H")
 * and an `aria-keyshortcuts` value ("Meta+Shift+H" / "Control+Shift+H").
 */
export function shortcut(keys: string) {
  const parts = keys.split("+");
  const mac = { Mod: "⌘", Shift: "⇧", Alt: "⌥" } as Record<string, string>;
  return {
    label: isMac
      ? parts.map((p) => mac[p] ?? p).join("")
      : parts.map((p) => (p === "Mod" ? "Ctrl" : p)).join("+"),
    aria: parts
      .map((p) => (p === "Mod" ? (isMac ? "Meta" : "Control") : p))
      .join("+"),
  };
}

/**
 * The Latin letter or digit of the physical key (`KeyS` → "s", `Digit1` → "1"),
 * so shortcuts work with any keyboard layout, Thai included (D51). Other keys:
 * the produced character, lowercased.
 */
export function shortcutKey(event: KeyboardEvent) {
  const code = /^(?:Key([A-Z])|Digit([0-9]))$/.exec(event.code);
  if (code) return (code[1] ?? code[2]).toLowerCase();
  return event.key.toLowerCase();
}

/** Ctrl+S on Windows/Linux, ⌘S on macOS, on any keyboard layout. */
export function isSaveShortcut(event: KeyboardEvent) {
  return (
    (event.metaKey || event.ctrlKey) &&
    !event.altKey &&
    shortcutKey(event) === "s"
  );
}

/** Plain-text copy in the focused WYSIWYG editor. */
export function isPlainTextCopyShortcut(event: KeyboardEvent) {
  return (
    (isMac
      ? event.metaKey && !event.ctrlKey
      : event.ctrlKey && !event.metaKey) &&
    event.altKey &&
    event.shiftKey &&
    (event.code === "KeyC" || event.key.toLowerCase() === "c")
  );
}
