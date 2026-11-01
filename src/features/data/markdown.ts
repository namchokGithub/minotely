import { MarkdownManager } from "@tiptap/markdown";
import { getSchema, type JSONContent } from "@tiptap/react";
import { Node as PMNode } from "@tiptap/pm/model";
import { editorExtensions, parseContent } from "@/features/editor/extensions";
import type { Note, NoteContentFields } from "@/features/notes/types";

let manager: MarkdownManager | null = null;
const getManager = () =>
  (manager ??= new MarkdownManager({ extensions: editorExtensions }));

/** Note → Markdown file text. Text colors are not representable and are dropped. */
export function noteToMarkdown(note: Pick<Note, "title" | "content">): string {
  const body = getManager().serialize(parseContent(note.content)).trim();
  const title = note.title.trim();
  return `${title ? `# ${title}\n\n` : ""}${body}\n`;
}

/** Markdown file → note fields. A leading `# Heading` becomes the title. */
export function markdownToNote(
  markdown: string,
  fileName: string,
): NoteContentFields {
  const doc = getManager().parse(markdown);
  const blocks = [...(doc.content ?? [])];
  let title = fileName.replace(/\.(md|markdown|txt)$/i, "");

  const first = blocks[0];
  if (first?.type === "heading" && first.attrs?.level === 1) {
    title = textOf(first) || title;
    blocks.shift();
  }

  const content: JSONContent = { type: "doc", content: blocks };
  return {
    title,
    content: JSON.stringify(content),
    plainText: plainTextOf(content),
  };
}

function textOf(node: JSONContent): string {
  if (node.text) return node.text;
  return (node.content ?? []).map(textOf).join("");
}

/** Same text the editor stores on save (`getText` with "\n" between blocks). */
export function plainTextOf(content: JSONContent): string {
  const node = PMNode.fromJSON(getSchema(editorExtensions), content);
  return node.textBetween(0, node.content.size, "\n");
}
