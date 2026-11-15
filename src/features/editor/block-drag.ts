import { Extension } from "@tiptap/react";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

/**
 * Moving blocks with the `⠿` handle (D48). ProseMirror's own drop is not used
 * for these drags: it deletes whatever is selected at drop time (a moved
 * selection copies instead of moving) and drops a list line between paragraphs
 * by splitting the paragraph (empty rows). Here a drop always lands on a block
 * or list-line boundary and removes exactly the dragged node.
 */

const LIST_TYPES = new Set(["bulletList", "orderedList", "taskList"]);
const LIST_ITEM_TYPES = new Set(["listItem", "taskItem"]);

export const isListItem = (node: PMNode) => LIST_ITEM_TYPES.has(node.type.name);

/**
 * The list item at `clientY` inside the list at `pos`, deepest first, so each
 * line of a list is its own block. Null when the pointer is between items.
 */
function listItemAt(
  view: EditorView,
  list: PMNode,
  pos: number,
  clientY: number,
): number | null {
  let found: number | null = null;
  list.forEach((item, offset) => {
    if (found !== null) return;
    const itemPos = pos + 1 + offset;
    const dom = view.nodeDOM(itemPos);
    if (!(dom instanceof HTMLElement)) return;
    const rect = dom.getBoundingClientRect();
    if (clientY < rect.top - 2 || clientY > rect.bottom + 2) return;
    let inner: number | null = null;
    item.forEach((child, childOffset) => {
      if (inner === null && LIST_TYPES.has(child.type.name)) {
        inner = listItemAt(view, child, itemPos + 1 + childOffset, clientY);
      }
    });
    found = inner ?? itemPos;
  });
  return found;
}

export type BlockHit = {
  /** The block, or the list line, under the pointer. */
  pos: number;
  node: PMNode;
  dom: HTMLElement;
  /** The top-level block that contains it (the same block when not in a list). */
  topPos: number;
  topNode: PMNode;
  topDom: HTMLElement;
};

/** The block (a list line inside lists) at `clientY`, or null between blocks. */
export function blockAt(view: EditorView, clientY: number): BlockHit | null {
  let hit: BlockHit | null = null;
  view.state.doc.forEach((node, offset) => {
    if (hit) return;
    const topDom = view.nodeDOM(offset);
    if (!(topDom instanceof HTMLElement)) return;
    const rect = topDom.getBoundingClientRect();
    if (clientY < rect.top - 4 || clientY > rect.bottom + 4) return;
    const itemPos = LIST_TYPES.has(node.type.name)
      ? listItemAt(view, node, offset, clientY)
      : null;
    const pos = itemPos ?? offset;
    const dom = view.nodeDOM(pos);
    const target = view.state.doc.nodeAt(pos);
    if (!(dom instanceof HTMLElement) || !target) return;
    hit = { pos, node: target, dom, topPos: offset, topNode: node, topDom };
  });
  return hit;
}

/** The node being dragged, and its list when it is a list line. */
type ActiveDrag = {
  pos: number;
  node: PMNode;
  list: PMNode | null;
  listPos: number | null;
};

let activeDrag: ActiveDrag | null = null;

/** Where the blue drop line goes, in viewport coordinates; null hides it. */
export type DropLine = { top: number; left: number; width: number } | null;

let dropLine: DropLine = null;
const lineListeners = new Set<() => void>();

function setDropLine(next: DropLine) {
  dropLine = next;
  lineListeners.forEach((listener) => listener());
}

export const dropLineStore = {
  get: () => dropLine,
  subscribe: (listener: () => void) => {
    lineListeners.add(listener);
    return () => lineListeners.delete(listener);
  },
};

function endDrag() {
  activeDrag = null;
  setDropLine(null);
  document.body.classList.remove("block-dragging");
  for (const faded of document.querySelectorAll(".block-drag-source")) {
    faded.classList.remove("block-drag-source");
  }
}

/**
 * Starts dragging the block (or list line) at `pos` from the handle. False
 * when there is nothing to drag.
 */
export function startBlockDrag(
  view: EditorView,
  pos: number,
  event: React.DragEvent,
) {
  const node = view.state.doc.nodeAt(pos);
  const dom = view.nodeDOM(pos);
  if (!node || !(dom instanceof HTMLElement)) return false;
  const $pos = view.state.doc.resolve(pos);
  const inList = isListItem(node);
  activeDrag = {
    pos,
    node,
    list: inList ? $pos.parent : null,
    listPos: inList ? $pos.before() : null,
  };
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", dom.textContent ?? "");

  // What the pointer carries: a copy of the block on the page color with a shadow.
  const preview = dom.cloneNode(true) as HTMLElement;
  preview.classList.add("block-drag-preview");
  preview.style.width = `${dom.getBoundingClientRect().width}px`;
  const holder = document.createElement("div");
  holder.className = "minotely-editor block-drag-holder";
  holder.append(preview);
  document.body.append(holder);
  event.dataTransfer.setDragImage(preview, 16, 16);
  // The browser takes its picture right away; the copy is not needed after that.
  setTimeout(() => holder.remove(), 0);

  // The block stays in place, faded, until it is dropped.
  dom.classList.add("block-drag-source");
  document.body.classList.add("block-dragging");
  document.addEventListener("dragend", endDrag, { once: true });
  return true;
}

type DropPlan = {
  /** Where the node goes, in the document before the move. */
  at: number;
  /** What is inserted there (the dragged node, converted or wrapped to fit). */
  insert: PMNode;
  line: NonNullable<DropLine>;
};

/** Where a drop at `clientY` lands, and in what shape. Null: no valid place. */
function planDrop(
  view: EditorView,
  drag: ActiveDrag,
  clientY: number,
): DropPlan | null {
  const hit = blockAt(view, clientY);
  if (!hit) return null;
  const { schema } = view.state;
  const dragged = drag.node;

  // A list line lands between lines; any other block lands between top-level blocks.
  const onLine = isListItem(dragged) && isListItem(hit.node);
  const pos = onLine ? hit.pos : hit.topPos;
  const node = onLine ? hit.node : hit.topNode;
  const dom = onLine ? hit.dom : hit.topDom;
  const rect = dom.getBoundingClientRect();
  const after = clientY > rect.top + rect.height / 2;
  const at = after ? pos + node.nodeSize : pos;

  let insert = dragged;
  if (onLine) {
    // A line takes the kind of the list it lands in (bullet line into a checklist, and back).
    if (node.type !== dragged.type) {
      insert = node.type.create(
        node.type === schema.nodes.taskItem ? { checked: false } : null,
        dragged.content,
      );
    }
  } else if (isListItem(dragged) && drag.list) {
    // A line dropped between other blocks becomes a one-line list of its old kind.
    insert = drag.list.type.create(drag.list.attrs, dragged);
  }

  return {
    at,
    insert,
    line: {
      top: after ? rect.bottom : rect.top,
      left: rect.left,
      width: rect.width,
    },
  };
}

function performDrop(view: EditorView, drag: ActiveDrag, plan: DropPlan) {
  const { pos, node, list, listPos } = drag;
  const end = pos + node.nodeSize;
  // On itself or inside itself: nothing to do.
  if (plan.at > pos && plan.at < end) return;
  // The last line of a list takes the list with it.
  const lastLine = list && listPos !== null && list.childCount === 1;
  const from = lastLine ? listPos : pos;
  const to = lastLine ? listPos + list.nodeSize : end;
  try {
    const tr = view.state.tr.delete(from, to);
    const at = tr.mapping.map(plan.at);
    tr.insert(at, plan.insert);
    const inside = Math.min(at + 1, tr.doc.content.size);
    tr.setSelection(TextSelection.near(tr.doc.resolve(inside)));
    view.dispatch(tr.scrollIntoView());
    view.focus();
  } catch (error) {
    // The schema refused this shape there; the document stays as it was.
    console.error("Moving the block failed", error);
  }
}

/** Editor extension: the drop line and the drop itself for handle drags. */
export const BlockDragDrop = Extension.create({
  name: "blockDragDrop",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("blockDragDrop"),
        props: {
          handleDOMEvents: {
            dragover: (view, event) => {
              if (!activeDrag) return false;
              const plan = planDrop(view, activeDrag, event.clientY);
              setDropLine(plan?.line ?? null);
              return false;
            },
            dragleave: (view, event) => {
              if (!activeDrag) return false;
              const to = event.relatedTarget;
              if (!(to instanceof Node) || !view.dom.contains(to)) {
                setDropLine(null);
              }
              return false;
            },
          },
          handleDrop: (view, event) => {
            const drag = activeDrag;
            if (!drag) return false;
            const plan = planDrop(view, drag, event.clientY);
            endDrag();
            if (plan) performDrop(view, drag, plan);
            // Handled either way: ProseMirror's own drop must not run for these drags.
            return true;
          },
        },
      }),
    ];
  },
});
