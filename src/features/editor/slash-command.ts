import { Extension, type Editor, type Range } from "@tiptap/react";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion from "@tiptap/suggestion";
import type { LucideIcon } from "lucide-react";
import {
  applyBlockTypeAt,
  BLOCK_TYPE_LIST,
  filterBlockTypes,
} from "./block-types";

/** One entry of the `/` menu: a block type, or an action such as Sub-page (D48, D49). */
export type SlashItem = {
  id: string;
  label: string;
  keywords: string[];
  icon: LucideIcon;
  /** Runs the entry; `range` is the typed `/query`, still in the document. */
  run: (editor: Editor, range: Range) => void;
};

const BLOCK_ITEMS: SlashItem[] = BLOCK_TYPE_LIST.map((type) => ({
  id: type.id,
  label: type.label,
  keywords: type.keywords,
  icon: type.icon,
  run: (editor, range) => applyBlockTypeAt(editor, range, type),
}));

/** What the `/` menu shows; null when it is closed (D48). */
export type SlashMenuState = {
  items: SlashItem[];
  selected: number;
  /** Where the typed `/query` is, in viewport coordinates. */
  rect: DOMRect | null;
  pick: (item: SlashItem) => void;
} | null;

/**
 * Tiny store between the ProseMirror plugin and the React menu, one per editor
 * (several editors can exist: the note and version previews).
 */
export class SlashMenuStore {
  private state: SlashMenuState = null;
  /** Entries that depend on the open note (Sub-page, D49), read each time the menu filters. */
  private extras: () => SlashItem[] = () => [];

  setExtras(extras: () => SlashItem[]) {
    this.extras = extras;
  }

  getExtras = () => this.extras();
  private listeners = new Set<() => void>();

  get = () => this.state;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  set(next: SlashMenuState) {
    this.state = next;
    this.listeners.forEach((listener) => listener());
  }
}

type SlashOptions = { store: SlashMenuStore };

/**
 * `/` at the start of a block or after a space opens a filterable menu of
 * block types (D48). Arrow keys move, Enter or Tab picks, Escape closes.
 */
export const SlashCommand = Extension.create<SlashOptions>({
  name: "slashCommand",

  addOptions() {
    return { store: new SlashMenuStore() };
  },

  addProseMirrorPlugins() {
    const { store } = this.options;
    let range: Range | null = null;
    let editor: Editor | null = null;

    const pick = (item: SlashItem) => {
      if (editor && range) item.run(editor, range);
      store.set(null);
    };

    const show = (props: {
      editor: Editor;
      range: Range;
      items: SlashItem[];
      clientRect?: (() => DOMRect | null) | null;
    }) => {
      editor = props.editor;
      range = props.range;
      const previous = store.get();
      store.set(
        props.items.length === 0
          ? null
          : {
              items: props.items,
              selected: Math.min(
                previous?.selected ?? 0,
                props.items.length - 1,
              ),
              rect: props.clientRect?.() ?? null,
              pick,
            },
      );
    };

    return [
      Suggestion<SlashItem, SlashItem>({
        editor: this.editor,
        pluginKey: new PluginKey("slashCommand"),
        char: "/",
        // Not inside code blocks, where "/" is ordinary text.
        allow: ({ state, range: r }) =>
          !state.doc.resolve(r.from).parent.type.spec.code,
        items: ({ query }) => {
          const ids = new Set(filterBlockTypes(query).map((type) => type.id));
          const q = query.trim().toLowerCase();
          const extra = store
            .getExtras()
            .filter(
              (item) =>
                !q ||
                item.label.toLowerCase().includes(q) ||
                item.keywords.some((word) => word.startsWith(q)),
            );
          return [...BLOCK_ITEMS.filter((item) => ids.has(item.id)), ...extra];
        },
        command: ({ editor: e, range: r, props: item }) => item.run(e, r),
        render: () => ({
          onStart: (props) => {
            store.set(null);
            show(props);
          },
          onUpdate: show,
          onExit: () => {
            range = null;
            store.set(null);
          },
          onKeyDown: ({ event }) => {
            const current = store.get();
            if (!current) return false;
            const count = current.items.length;
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              const step = event.key === "ArrowDown" ? 1 : -1;
              store.set({
                ...current,
                selected: (current.selected + step + count) % count,
              });
              return true;
            }
            if (event.key === "Enter" || event.key === "Tab") {
              current.pick(current.items[current.selected]);
              return true;
            }
            if (event.key === "Escape") {
              store.set(null);
              return true;
            }
            return false;
          },
        }),
      }),
    ];
  },
});
