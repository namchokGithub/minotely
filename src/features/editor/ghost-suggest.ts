import { Extension } from "@tiptap/react";
import type { Node as PMNode } from "@tiptap/pm/model";
import {
  Plugin,
  PluginKey,
  type EditorState,
  type Transaction,
} from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";

/**
 * Inline Autocomplete (D53): while typing, the rest of a word or two-word
 * phrase already used in this page shows as faint ghost text at the cursor.
 * Tab accepts it, Esc hides it. The suggestion is a decoration only; nothing
 * reaches the note until it is accepted.
 */

const words = new Intl.Segmenter("th", { granularity: "word" });
const graphemes = new Intl.Segmenter("th", { granularity: "grapheme" });

const MIN_PREFIX_GRAPHEMES = 2;
const REBUILD_DELAY_MS = 300;

/** Word or phrase → how often it appears in the page. */
type WordIndex = Map<string, number>;

type GhostState = {
  enabled: boolean;
  composing: boolean;
  index: WordIndex;
  /** The suggested rest of the word, shown at `pos` (the cursor). */
  suggestion: { pos: number; text: string } | null;
};

type GhostMeta = Partial<
  Pick<GhostState, "enabled" | "composing" | "index">
> & {
  dismiss?: boolean;
};

export const ghostSuggestKey = new PluginKey<GhostState>("ghostSuggest");

/** Words of one text block, and the two-word phrases of neighboring words. */
function addToIndex(index: WordIndex, text: string) {
  const parts = [...words.segment(text)];
  let previous: { start: number; end: number } | null = null;
  for (const part of parts) {
    if (!part.isWordLike) {
      // A single space keeps a phrase together; anything else ends it.
      if (part.segment !== " ") previous = null;
      continue;
    }
    const end = part.index + part.segment.length;
    index.set(part.segment, (index.get(part.segment) ?? 0) + 1);
    if (previous) {
      const phrase = text.slice(previous.start, end);
      index.set(phrase, (index.get(phrase) ?? 0) + 1);
    }
    previous = { start: part.index, end };
  }
}

/** The last word before `offset` in `text`: its start, or null when the cursor is not at a word's end. */
function wordStartBefore(text: string, offset: number): number | null {
  const before = text.slice(0, offset);
  const parts = [...words.segment(before)];
  const last = parts.at(-1);
  if (!last?.isWordLike || last.index + last.segment.length !== offset) {
    return null;
  }
  return last.index;
}

/**
 * The page's words, leaving out the word being typed at the cursor, so the
 * half-typed word never suggests itself.
 */
function buildIndex(doc: PMNode, cursor: number | null): WordIndex {
  const index: WordIndex = new Map();
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    if (node.type.spec.code) return false;
    let text = node.textBetween(0, node.content.size, undefined, " ");
    const start = pos + 1;
    if (
      cursor !== null &&
      cursor >= start &&
      cursor <= start + node.content.size
    ) {
      const offset = cursor - start;
      const wordStart = wordStartBefore(text, offset);
      if (wordStart !== null)
        text = text.slice(0, wordStart) + text.slice(offset);
    }
    addToIndex(index, text);
    return false;
  });
  return index;
}

/** The most used longer entry that starts with `prefix`; ties go to the shorter one. */
function bestCompletion(index: WordIndex, prefix: string): string | null {
  let best: string | null = null;
  let bestCount = 0;
  for (const [entry, count] of index) {
    if (entry.length <= prefix.length || !entry.startsWith(prefix)) continue;
    if (
      count > bestCount ||
      (count === bestCount && best !== null && entry.length < best.length)
    ) {
      best = entry;
      bestCount = count;
    }
  }
  return best;
}

/** The ghost text for the cursor in `state`, or null. */
function suggestionFor(
  state: EditorState,
  index: WordIndex,
): GhostState["suggestion"] {
  const { selection } = state;
  if (!selection.empty) return null;
  const { $from } = selection;
  if (!$from.parent.isTextblock || $from.parent.type.spec.code) return null;
  const text = $from.parent.textBetween(
    0,
    $from.parent.content.size,
    undefined,
    " ",
  );
  const offset = $from.parentOffset;
  // Only at the end of a word: next is nothing, a space or punctuation.
  if (/^[^\s.,;:!?)\]}"'”’]/.test(text.slice(offset, offset + 1))) return null;

  // Not while the `/` block menu is being typed (Tab picks from that menu).
  if (/(?:^|\s)\/\S*$/.test(text.slice(0, offset))) return null;

  const parts = [...words.segment(text.slice(0, offset))];
  const last = parts.at(-1);
  if (!last?.isWordLike || last.index + last.segment.length !== offset)
    return null;

  // Try the last two words as one prefix first (a phrase), then the last word.
  const candidates: string[] = [];
  const beforeLast = parts.at(-2);
  const gap = beforeLast && !beforeLast.isWordLike ? beforeLast : null;
  const prevWord = gap ? parts.at(-3) : beforeLast;
  if (prevWord?.isWordLike && (!gap || gap.segment === " ")) {
    candidates.push(text.slice(prevWord.index, offset));
  }
  candidates.push(last.segment);

  for (const prefix of candidates) {
    if ([...graphemes.segment(prefix)].length < MIN_PREFIX_GRAPHEMES) continue;
    const completion = bestCompletion(index, prefix);
    if (completion) {
      return { pos: selection.from, text: completion.slice(prefix.length) };
    }
  }
  return null;
}

function ghostWidget(text: string) {
  const span = document.createElement("span");
  span.className = "ghost-suggestion";
  span.textContent = text;
  span.setAttribute("aria-hidden", "true");
  return span;
}

/** Turns suggestions on or off for this editor (device setting, D53). */
export function setGhostSuggestEnabled(view: EditorView, enabled: boolean) {
  view.dispatch(
    view.state.tr.setMeta(ghostSuggestKey, { enabled } satisfies GhostMeta),
  );
}

export const GhostSuggest = Extension.create({
  name: "ghostSuggest",
  // Before list and `/` menu keymaps, so Tab accepts a shown suggestion first.
  priority: 900,

  addProseMirrorPlugins() {
    let rebuildTimer: ReturnType<typeof setTimeout> | undefined;

    return [
      new Plugin<GhostState>({
        key: ghostSuggestKey,

        state: {
          init: (_config, state) => ({
            enabled: false,
            composing: false,
            index: buildIndex(state.doc, null),
            suggestion: null,
          }),
          apply: (tr: Transaction, value, old, state) => {
            const meta = tr.getMeta(ghostSuggestKey) as GhostMeta | undefined;
            const next: GhostState = { ...value, ...meta, suggestion: null };
            if (!next.enabled || next.composing || meta?.dismiss) return next;
            if (tr.docChanged || meta?.index || meta?.enabled) {
              // Typing, or a fresh index after a pause: look again at the cursor.
              next.suggestion = suggestionFor(state, next.index);
            } else if (!meta && tr.selection.eq(old.selection)) {
              // Unrelated updates (decorations, focus) keep it; moving the cursor drops it.
              next.suggestion = value.suggestion;
            }
            return next;
          },
        },

        view: () => ({
          update: (view, previous) => {
            if (view.state.doc.eq(previous.doc)) return;
            clearTimeout(rebuildTimer);
            const rebuild = () => {
              // Never dispatch in the middle of an IME composition.
              if (view.composing) {
                rebuildTimer = setTimeout(rebuild, REBUILD_DELAY_MS);
                return;
              }
              const { state } = view;
              const cursor = state.selection.empty
                ? state.selection.from
                : null;
              view.dispatch(
                state.tr.setMeta(ghostSuggestKey, {
                  index: buildIndex(state.doc, cursor),
                } satisfies GhostMeta),
              );
            };
            rebuildTimer = setTimeout(rebuild, REBUILD_DELAY_MS);
          },
          destroy: () => clearTimeout(rebuildTimer),
        }),

        props: {
          decorations: (state) => {
            const ghost = ghostSuggestKey.getState(state)?.suggestion;
            if (!ghost) return null;
            return DecorationSet.create(state.doc, [
              Decoration.widget(ghost.pos, () => ghostWidget(ghost.text), {
                side: 1,
                ignoreSelection: true,
                key: `ghost:${ghost.text}`,
              }),
            ]);
          },

          handleKeyDown: (view, event) => {
            const ghost = ghostSuggestKey.getState(view.state)?.suggestion;
            if (!ghost || view.composing) return false;
            if (
              event.key === "Tab" &&
              !event.shiftKey &&
              !event.altKey &&
              !event.ctrlKey &&
              !event.metaKey
            ) {
              event.preventDefault();
              view.dispatch(
                view.state.tr
                  .insertText(ghost.text, ghost.pos)
                  .scrollIntoView(),
              );
              return true;
            }
            if (event.key === "Escape") {
              view.dispatch(
                view.state.tr.setMeta(ghostSuggestKey, {
                  dismiss: true,
                } satisfies GhostMeta),
              );
              return true;
            }
            return false;
          },

          handleDOMEvents: {
            compositionstart: (view) => {
              view.dispatch(
                view.state.tr.setMeta(ghostSuggestKey, {
                  composing: true,
                } satisfies GhostMeta),
              );
              return false;
            },
            compositionend: (view) => {
              // After the composed text lands, so the next keystroke can suggest again.
              setTimeout(() => {
                view.dispatch(
                  view.state.tr.setMeta(ghostSuggestKey, {
                    composing: false,
                  } satisfies GhostMeta),
                );
              }, 0);
              return false;
            },
            blur: (view) => {
              if (ghostSuggestKey.getState(view.state)?.suggestion) {
                view.dispatch(
                  view.state.tr.setMeta(ghostSuggestKey, {
                    dismiss: true,
                  } satisfies GhostMeta),
                );
              }
              return false;
            },
          },
        },
      }),
    ];
  },
});
