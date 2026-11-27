import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from "@tiptap/extension-table";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Placeholder } from "@tiptap/extensions";
import UniqueID from "@tiptap/extension-unique-id";
import { Callout } from "./callout";
import { PageLink } from "./page-link";
import { LayoutShortcuts } from "./layout-shortcuts";
import { Extension, type JSONContent } from "@tiptap/react";
import { insertOrEditLink, openLink } from "./links";

/**
 * ⌥Enter / Alt+Enter opens the link under the cursor in a new tab (M5.7).
 * Ctrl/⌘+K inserts a link or moves focus to the link bar (D27).
 */
const LinkShortcuts = Extension.create({
  name: "linkShortcuts",
  addKeyboardShortcuts() {
    return {
      "Mod-k": () => insertOrEditLink(this.editor),
      "Alt-Enter": () => {
        if (!this.editor.isActive("link")) return false;
        openLink(this.editor.getAttributes("link").href);
        return true;
      },
    };
  },
});

/** Block node types that get a stable id (D48). */
export const BLOCK_TYPES = [
  "paragraph",
  "heading",
  "blockquote",
  "callout",
  "codeBlock",
  "bulletList",
  "orderedList",
  "taskList",
  "table",
  "horizontalRule",
  "pageLink",
];

/**
 * Markdown shortcuts (# heading, - list, 1. list, [ ] task, > quote, ``` code,
 * **bold**, *italic*, ==highlight==) come from each extension's input rules.
 */
export const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    // Drop line while dragging a block (D48): drawn by the `.block-drop-cursor` class.
    dropcursor: { color: false, width: 3, class: "block-drop-cursor" },
    // Editing: clicks place the cursor; locked notes are not editable, so links open as normal anchors.
    link: {
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      defaultProtocol: "https",
    },
  }),
  TaskList,
  TaskItem.configure({
    nested: true,
    a11y: {
      checkboxLabel: (node, checked) =>
        `${checked ? "Done" : "To do"}: ${node.textContent || "empty task"}`,
    },
  }),
  LinkShortcuts,
  LayoutShortcuts,
  Highlight.configure({ multicolor: true }),
  TextStyle,
  Color,
  Table.configure({ resizable: false }),
  TableRow,
  TableHeader,
  TableCell,
  Callout,
  PageLink,
  // Stable block ids for "Copy link to block" (D48); rendered as data-id.
  UniqueID.configure({ types: BLOCK_TYPES }),
  Placeholder.configure({ placeholder: "Start writing…  Type / for blocks" }),
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
