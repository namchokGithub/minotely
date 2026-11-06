import type { EditorView } from "@tiptap/pm/view";
import { toast } from "sonner";

/** Copy the selected editor text without Markdown or HTML. */
export async function copySelectionAsText(view: EditorView): Promise<void> {
  const { from, to, empty } = view.state.selection;
  if (empty) return;

  const text = view.state.doc.textBetween(from, to, "\n", "\n");
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    console.error("Copy as text failed", error);
    toast.error("Could not copy text");
  }
}
