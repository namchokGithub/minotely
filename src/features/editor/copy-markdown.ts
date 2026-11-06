import type { EditorView } from "@tiptap/pm/view";
import { contentToMarkdown } from "@/features/data/markdown";

/** Copy the selected rich-text fragment as plain Markdown, without HTML. */
export function copySelectionAsMarkdown(
  view: EditorView,
  event: ClipboardEvent,
): boolean {
  const { selection } = view.state;
  if (selection.empty || !event.clipboardData) return false;

  const content = selection.content().content.toJSON();
  const markdown = contentToMarkdown({ type: "doc", content }).trimEnd();
  event.clipboardData.clearData();
  event.clipboardData.setData("text/plain", markdown);
  event.preventDefault();
  return true;
}
