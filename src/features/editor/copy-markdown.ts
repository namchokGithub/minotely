import type { EditorView } from "@tiptap/pm/view";
import { toast } from "sonner";
import { contentToMarkdown } from "@/features/data/markdown";

/**
 * "Copy as Markdown" (D52): the selected fragment as Markdown text only. Text
 * colors and custom highlights cannot be written in Markdown and are left out.
 */
export async function copySelectionAsMarkdown(view: EditorView) {
  const { selection } = view.state;
  if (selection.empty) return;
  const content = selection.content().content.toJSON();
  const markdown = contentToMarkdown({ type: "doc", content }).trimEnd();
  try {
    await navigator.clipboard.writeText(markdown);
  } catch (error) {
    console.error("Copy as Markdown failed", error);
    toast.error("Could not copy as Markdown");
  }
}
