import { Extension } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";

/** What Shift+digit gives on a US layout, so a retried key matches English typing. */
const SHIFTED_DIGITS: Record<string, string> = {
  "1": "!",
  "2": "@",
  "3": "#",
  "4": "$",
  "5": "%",
  "6": "^",
  "7": "&",
  "8": "*",
  "9": "(",
  "0": ")",
};

/** The key a US layout gives for this physical key, or null for other keys. */
function usKey(event: KeyboardEvent): string | null {
  const match = /^(?:Key([A-Z])|Digit([0-9]))$/.exec(event.code);
  if (!match) return null;
  if (match[1]) return event.shiftKey ? match[1] : match[1].toLowerCase();
  return event.shiftKey ? SHIFTED_DIGITS[match[2]] : match[2];
}

/**
 * Editor shortcuts on any keyboard layout (D51). With a Thai (or other
 * non-Latin) layout, Ctrl/⌘ + a key reports a Thai character, and ProseMirror
 * does not retry by key position for Ctrl+Alt on Windows (AltGr). Here such a
 * press is offered to the editor again as the US-layout key at the same
 * position; the retry has a Latin key, so it is not retried twice.
 */
export const LayoutShortcuts = Extension.create({
  name: "layoutShortcuts",
  // Before the other keymaps, so the retry reaches all of them.
  priority: 1000,

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("layoutShortcuts"),
        props: {
          handleKeyDown: (view, event) => {
            if (!(event.ctrlKey || event.metaKey || event.altKey)) return false;
            // Only characters outside ASCII (Thai and other scripts).
            if (event.key.length !== 1 || event.key.charCodeAt(0) < 128) {
              return false;
            }
            const key = usKey(event);
            if (!key) return false;
            const retry = new KeyboardEvent("keydown", {
              key,
              code: event.code,
              keyCode: event.keyCode,
              ctrlKey: event.ctrlKey,
              metaKey: event.metaKey,
              altKey: event.altKey,
              shiftKey: event.shiftKey,
              bubbles: true,
              cancelable: true,
            });
            const handled = view.someProp("handleKeyDown", (handler) =>
              handler(view, retry),
            );
            if (handled) event.preventDefault();
            return Boolean(handled);
          },
        },
      }),
    ];
  },
});
