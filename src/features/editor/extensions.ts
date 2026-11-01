import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from "@tiptap/extension-table";
import { Placeholder } from "@tiptap/extensions";
import type { JSONContent } from "@tiptap/react";

/**
 * Markdown shortcuts (# heading, - list, 1. list, > quote, ``` code,
 * **bold**, *italic*, ==highlight==) come from each extension's input rules.
 */
export const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: { openOnClick: false },
  }),
  Highlight.configure({ multicolor: true }),
  TextStyle,
  Color,
  Table.configure({ resizable: false }),
  TableRow,
  TableHeader,
  TableCell,
  Placeholder.configure({ placeholder: "Start writing…" }),
];

export const TEXT_COLORS = [
  { label: "Red", value: "#ef4444" },
  { label: "Orange", value: "#f97316" },
  { label: "Green", value: "#22c55e" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Purple", value: "#a855f7" },
  { label: "Gray", value: "#71717a" },
];

/** Translucent so highlights read in both light and dark themes. */
export const HIGHLIGHT_COLORS = [
  { label: "Yellow", value: "rgb(250 204 21 / 0.4)" },
  { label: "Green", value: "rgb(34 197 94 / 0.3)" },
  { label: "Blue", value: "rgb(59 130 246 / 0.3)" },
  { label: "Pink", value: "rgb(236 72 153 / 0.3)" },
];

export function parseContent(content: string): JSONContent {
  try {
    return JSON.parse(content) as JSONContent;
  } catch {
    return { type: "doc", content: [] };
  }
}
