import type { ChainedCommands, Editor, Range } from "@tiptap/react";
import {
  CheckSquare,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Lightbulb,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Table as TableIcon,
  type LucideIcon,
} from "lucide-react";

/**
 * Block types offered by the `/` menu, the `+` button and "Turn into" (D48).
 * One list so every entry point offers the same blocks. No images yet.
 */
export type BlockType = {
  id: string;
  label: string;
  /** Extra words the `/` filter matches. */
  keywords: string[];
  icon: LucideIcon;
  /** Can an existing block be turned into this (not table or divider). */
  turnInto: boolean;
  /** Applies the type at the current selection. */
  apply: (chain: ChainedCommands) => ChainedCommands;
};

export const BLOCK_TYPE_LIST: BlockType[] = [
  {
    id: "text",
    label: "Text",
    keywords: ["paragraph", "plain"],
    icon: Pilcrow,
    turnInto: true,
    apply: (c) => c.setParagraph(),
  },
  {
    id: "h1",
    label: "Heading 1",
    keywords: ["title", "h1", "#"],
    icon: Heading1,
    turnInto: true,
    apply: (c) => c.setHeading({ level: 1 }),
  },
  {
    id: "h2",
    label: "Heading 2",
    keywords: ["subtitle", "h2", "##"],
    icon: Heading2,
    turnInto: true,
    apply: (c) => c.setHeading({ level: 2 }),
  },
  {
    id: "h3",
    label: "Heading 3",
    keywords: ["h3", "###"],
    icon: Heading3,
    turnInto: true,
    apply: (c) => c.setHeading({ level: 3 }),
  },
  {
    id: "bullet",
    label: "Bulleted list",
    keywords: ["unordered", "ul", "-"],
    icon: List,
    turnInto: true,
    apply: (c) => c.toggleBulletList(),
  },
  {
    id: "numbered",
    label: "Numbered list",
    keywords: ["ordered", "ol", "1."],
    icon: ListOrdered,
    turnInto: true,
    apply: (c) => c.toggleOrderedList(),
  },
  {
    id: "todo",
    label: "Checklist",
    keywords: ["todo", "task", "checkbox", "[ ]"],
    icon: CheckSquare,
    turnInto: true,
    apply: (c) => c.toggleTaskList(),
  },
  {
    id: "quote",
    label: "Quote",
    keywords: ["blockquote", ">"],
    icon: Quote,
    turnInto: true,
    apply: (c) => c.setBlockquote(),
  },
  {
    id: "callout",
    label: "Callout",
    keywords: ["note", "tip", "info", "box", "!>"],
    icon: Lightbulb,
    turnInto: true,
    apply: (c) => c.setCallout(),
  },
  {
    id: "code",
    label: "Code block",
    keywords: ["code", "snippet", "```"],
    icon: Code2,
    turnInto: true,
    apply: (c) => c.setCodeBlock(),
  },
  {
    id: "table",
    label: "Table",
    keywords: ["grid", "rows", "columns"],
    icon: TableIcon,
    turnInto: false,
    apply: (c) => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true }),
  },
  {
    id: "divider",
    label: "Divider",
    keywords: ["hr", "line", "separator", "---"],
    icon: Minus,
    turnInto: false,
    apply: (c) => c.setHorizontalRule(),
  },
];

/** Block types whose label or keywords start with, or contain, the query. */
export function filterBlockTypes(query: string): BlockType[] {
  const q = query.trim().toLowerCase();
  if (!q) return BLOCK_TYPE_LIST;
  return BLOCK_TYPE_LIST.filter(
    (type) =>
      type.label.toLowerCase().includes(q) ||
      type.keywords.some((word) => word.toLowerCase().startsWith(q)),
  );
}

/** Replaces the typed `/query` with a block of this type. */
export function applyBlockTypeAt(
  editor: Editor,
  range: Range,
  type: BlockType,
) {
  type.apply(editor.chain().focus().deleteRange(range)).run();
}

/**
 * "Turn into": converts the top-level block at `pos` (size `size`) to the type.
 * Lists, quotes and callouts are first unwrapped to plain paragraphs.
 */
export function turnBlockInto(
  editor: Editor,
  pos: number,
  size: number,
  type: BlockType,
) {
  const chain = editor
    .chain()
    .focus()
    .setTextSelection({ from: pos + 1, to: pos + size - 1 })
    .clearNodes();
  type.apply(chain).run();
}
