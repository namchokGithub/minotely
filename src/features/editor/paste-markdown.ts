import { Node as PMNode, Slice, type ResolvedPos } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";
import { markdownToContent } from "@/features/data/markdown";

/** Block or inline Markdown syntax that plain prose rarely contains (D41). */
const MARKDOWN_SIGNS = [
  /^ {0,3}#{1,6} \S/m, // heading
  /^ {0,3}(?:[-*+]|\d+[.)]) \S/m, // list, checklist
  /^ {0,3}> ?\S/m, // quote
  /^ {0,3}(?:```|~~~)/m, // code fence
  /^:::callout\s*$/m, // callout (D48)
  /!\[[^\]\n]*\]\(https?:\/\/[^)\s]+\)/, // image (D55)
  /^ {0,3}\|?(?: *:?-{3,}:? *\|)+/m, // table separator row
  /^ {0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/m, // horizontal rule
  /\*\*[^*\n]+\*\*/, // bold
  /__[^_\n]+__/, // bold
  /~~[^~\n]+~~/, // strike
  /==[^=\n]+==/, // highlight
  /`[^`\n]+`/, // inline code
  /\[[^\]\n]+\]\([^)\s]+\)/, // link
];

export function looksLikeMarkdown(text: string): boolean {
  return MARKDOWN_SIGNS.some((sign) => sign.test(text));
}

/**
 * ProseMirror `clipboardTextParser`: pasted plain text that looks like Markdown
 * becomes rich text (D41). Returning nothing keeps the default paste: for
 * Ctrl/⌘+Shift+V (`plain`), inside a code block, and for ordinary text.
 */
export function parsePastedMarkdown(
  text: string,
  $context: ResolvedPos,
  plain: boolean,
  view: EditorView,
): Slice {
  // ProseMirror falls back to its own text parser on a falsy result; the prop type does not say so.
  const useDefault = undefined as unknown as Slice;
  if (plain || $context.parent.type.spec.code || !looksLikeMarkdown(text)) {
    return useDefault;
  }
  try {
    const doc = PMNode.fromJSON(view.state.schema, markdownToContent(text));
    return Slice.maxOpen(doc.content);
  } catch (error) {
    console.error("Markdown paste failed", error);
    return useDefault;
  }
}

/**
 * Context menu "Paste as Markdown" (D41): the clipboard text is always parsed as
 * Markdown, even without the signs `looksLikeMarkdown` looks for. Inside a code
 * block it stays plain text.
 */
export function pasteAsMarkdown(view: EditorView, text: string) {
  const { $from } = view.state.selection;
  if ($from.parent.type.spec.code) {
    view.pasteText(text);
    return;
  }
  try {
    const doc = PMNode.fromJSON(view.state.schema, markdownToContent(text));
    view.dispatch(
      view.state.tr
        .replaceSelection(Slice.maxOpen(doc.content))
        .scrollIntoView(),
    );
  } catch (error) {
    console.error("Markdown paste failed", error);
    view.pasteText(text);
  }
}
