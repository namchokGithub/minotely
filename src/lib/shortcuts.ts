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

/** Ctrl+S on Windows/Linux, ⌘S on macOS. */
export function isSaveShortcut(event: KeyboardEvent) {
  return (
    (event.metaKey || event.ctrlKey) &&
    !event.altKey &&
    event.key.toLowerCase() === "s"
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
