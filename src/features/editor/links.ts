import type { Editor } from "@tiptap/react";

const SAFE_PROTOCOL = /^(https?:|mailto:|tel:)/i;

/** "example.com" → "https://example.com"; keeps http(s), mailto and tel links; "" stays "". */
export function normalizeHref(input: string): string {
  const value = input.trim();
  if (!value) return "";
  if (SAFE_PROTOCOL.test(value)) return value;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return value; // other scheme: Link's validator decides
  return `https://${value}`;
}

/** Opens a link in a new tab. Only http(s), mailto and tel; never javascript: or data:. */
export function openLink(href: unknown) {
  if (typeof href !== "string" || !SAFE_PROTOCOL.test(href)) return;
  window.open(href, "_blank", "noopener,noreferrer");
}

/** Placeholder href of a just-inserted link; the link bar focuses its URL field. */
export const NEW_LINK_HREF = "https://";

/** Marks the link bar's URL field so the shortcut can focus it. */
export const LINK_URL_FIELD = "data-link-url";

/**
 * Ctrl/⌘+K, the toolbar Link button and the right-click Link item (M5.9, D27):
 * on a link → move focus to the link bar's URL field; with selected text → make it a link;
 * otherwise insert a "link" placeholder. New links open the bar with the URL field focused.
 */
export function insertOrEditLink(editor: Editor): boolean {
  if (!editor.isEditable) return false;
  if (editor.isActive("link")) {
    // The bar is already shown for this link; focus once it has rendered.
    requestAnimationFrame(() =>
      document.querySelector<HTMLInputElement>(`[${LINK_URL_FIELD}]`)?.focus(),
    );
    return true;
  }
  const { from, empty } = editor.state.selection;
  if (!empty)
    return editor.chain().focus().setLink({ href: NEW_LINK_HREF }).run();
  return editor
    .chain()
    .focus()
    .insertContent({
      type: "text",
      text: "link",
      marks: [{ type: "link", attrs: { href: NEW_LINK_HREF } }],
    })
    .setTextSelection({ from, to: from + 4 })
    .run();
}
