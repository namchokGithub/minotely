import { Extension, type Editor, type Range } from "@tiptap/react";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion from "@tiptap/suggestion";
import {
  applyBlockTypeAt,
  filterBlockTypes,
  type BlockType,
} from "./block-types";

/** What the `/` menu shows; null when it is closed (D48). */
export type SlashMenuState = {
  items: BlockType[];
  selected: number;
  /** Where the typed `/query` is, in viewport coordinates. */
  rect: DOMRect | null;
  pick: (type: BlockType) => void;
} | null;

/**
 * Tiny store between the ProseMirror plugin and the React menu, one per editor
 * (several editors can exist: the note and version previews).
 */
export class SlashMenuStore {
  private state: SlashMenuState = null;
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
    const store = this.options.store;
    let range: Range | null = null;
    let editor: Editor | null = null;

    const pick = (type: BlockType) => {
      if (editor && range) applyBlockTypeAt(editor, range, type);
      store.set(null);
    };

    const show = (props: {
      editor: Editor;
      range: Range;
      items: BlockType[];
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
      Suggestion<BlockType, BlockType>({
        editor: this.editor,
        pluginKey: new PluginKey("slashCommand"),
        char: "/",
        // Not inside code blocks, where "/" is ordinary text.
        allow: ({ state, range: r }) =>
          !state.doc.resolve(r.from).parent.type.spec.code,
        items: ({ query }) => filterBlockTypes(query),
        command: ({ editor: e, range: r, props: type }) => {
          applyBlockTypeAt(e, r, type);
        },
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
