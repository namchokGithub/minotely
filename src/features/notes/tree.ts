import { sortNotes } from "./sort";
import type { Note, NoteSort } from "./types";

/**
 * Note tree (D49), built from the flat list of live notes the app already has.
 * Pure: no Firestore. Bad data never hides a note: a parent that is missing, in
 * another book, part of a cycle, or deeper than MAX_NOTE_DEPTH is ignored and
 * the note shows at the top level.
 */

/** Top level is depth 1. */
export const MAX_NOTE_DEPTH = 3;

export type TreeNode = { note: Note; depth: number; children: TreeNode[] };

/** What the tree needs from a note; backup import passes these without full notes. */
export type TreeLink = Pick<Note, "id" | "bookId" | "parentId">;

type Index<T extends TreeLink = Note> = {
  byId: Map<string, T>;
  parent: Map<string, string | null>;
};

const indexCache = new WeakMap<TreeLink[], Index<TreeLink>>();

/** Effective parent of every note, computed once per list. */
function indexOf<T extends TreeLink>(notes: T[]): Index<T> {
  const cached = indexCache.get(notes) as Index<T> | undefined;
  if (cached) return cached;
  const byId = new Map(notes.map((note) => [note.id, note]));
  const parent = new Map<string, string | null>();
  const depth = new Map<string, number>();

  const resolve = (note: T, visiting: Set<string>): number => {
    const known = depth.get(note.id);
    if (known !== undefined) return known;
    let effective: string | null = null;
    let level = 1;
    const raw = note.parentId ? byId.get(note.parentId) : undefined;
    if (raw && raw.bookId === note.bookId && !visiting.has(raw.id)) {
      visiting.add(note.id);
      const parentDepth = resolve(raw, visiting);
      visiting.delete(note.id);
      // A cycle found below may have settled this note already.
      const settled = depth.get(note.id);
      if (settled !== undefined) return settled;
      if (parentDepth < MAX_NOTE_DEPTH) {
        effective = raw.id;
        level = parentDepth + 1;
      }
    }
    parent.set(note.id, effective);
    depth.set(note.id, level);
    return level;
  };

  for (const note of notes) resolve(note, new Set());
  const index = { byId, parent };
  indexCache.set(notes, index);
  return index;
}

export function effectiveParentId(noteId: string, notes: TreeLink[]) {
  return indexOf(notes).parent.get(noteId) ?? null;
}

/** Roots and children each sorted like the Notes column (pinned first, then `sort`). */
export function buildNoteTree(notes: Note[], sort: NoteSort): TreeNode[] {
  const { parent } = indexOf(notes);
  const children = new Map<string | null, Note[]>();
  for (const note of notes) {
    const key = parent.get(note.id) ?? null;
    children.set(key, [...(children.get(key) ?? []), note]);
  }
  const build = (key: string | null, depth: number): TreeNode[] =>
    sortNotes(children.get(key) ?? [], sort).map((note) => ({
      note,
      depth,
      children: build(note.id, depth + 1),
    }));
  return build(null, 1);
}

/** Visible rows in order; children of collapsed notes are skipped. */
export function flattenTree(
  roots: TreeNode[],
  collapsed: ReadonlySet<string>,
): TreeNode[] {
  const rows: TreeNode[] = [];
  const walk = (nodes: TreeNode[]) => {
    for (const node of nodes) {
      rows.push(node);
      if (!collapsed.has(node.note.id)) walk(node.children);
    }
  };
  walk(roots);
  return rows;
}

/** Effective descendants, any depth. */
export function descendantsOf(noteId: string, notes: Note[]): Note[] {
  const { parent } = indexOf(notes);
  const result: Note[] = [];
  let frontier = new Set([noteId]);
  while (frontier.size > 0) {
    const next = new Set<string>();
    for (const note of notes) {
      const p = parent.get(note.id);
      if (p && frontier.has(p)) {
        result.push(note);
        next.add(note.id);
      }
    }
    frontier = next;
  }
  return result;
}

/** Effective ancestors, root first, not including the note. */
export function pathOf(noteId: string, notes: Note[]): Note[] {
  const { byId, parent } = indexOf(notes);
  const path: Note[] = [];
  let current = parent.get(noteId) ?? null;
  while (current && path.length < MAX_NOTE_DEPTH) {
    const note = byId.get(current);
    if (!note) break;
    path.unshift(note);
    current = parent.get(current) ?? null;
  }
  return path;
}

function depthOf(noteId: string, notes: Note[]) {
  return pathOf(noteId, notes).length + 1;
}

/** Levels in the note's subtree, counting itself: 1 for a note without sub-pages. */
export function subtreeHeight(noteId: string, notes: Note[]): number {
  const { parent } = indexOf(notes);
  let height = 1;
  for (const note of descendantsOf(noteId, notes)) {
    let level = 1;
    let current: string | null = note.id;
    while (current && current !== noteId) {
      level += 1;
      current = parent.get(current) ?? null;
    }
    height = Math.max(height, level);
  }
  return height;
}

/** Can the note (with its sub-pages) become a sub-page of the target? */
export function canMoveInto(
  noteId: string,
  targetId: string,
  notes: Note[],
): boolean {
  const { byId } = indexOf(notes);
  const note = byId.get(noteId);
  const target = byId.get(targetId);
  if (!note || !target || noteId === targetId) return false;
  if (note.bookId !== target.bookId) return false;
  if (effectiveParentId(noteId, notes) === targetId) return false;
  if (descendantsOf(noteId, notes).some((d) => d.id === targetId)) return false;
  return (
    depthOf(targetId, notes) + subtreeHeight(noteId, notes) <= MAX_NOTE_DEPTH
  );
}

/** Can a new sub-page be added under the note? */
export function canAddChild(noteId: string, notes: Note[]): boolean {
  return depthOf(noteId, notes) < MAX_NOTE_DEPTH;
}

/**
 * Rows of the note's book where it can be moved (`canMoveInto` for each), in
 * tree order. Computes the note's sub-pages once, so it stays cheap for a long list.
 */
export function moveIntoTargets(
  noteId: string,
  notes: Note[],
  sort: NoteSort,
): TreeNode[] {
  const { byId, parent } = indexOf(notes);
  const note = byId.get(noteId);
  if (!note) return [];
  const blocked = new Set([
    noteId,
    ...descendantsOf(noteId, notes).map((d) => d.id),
  ]);
  const room = MAX_NOTE_DEPTH - subtreeHeight(noteId, notes);
  const current = parent.get(noteId) ?? null;
  return flattenTree(
    buildNoteTree(
      notes.filter((n) => n.bookId === note.bookId),
      sort,
    ),
    new Set(),
  ).filter(
    (row) =>
      !blocked.has(row.note.id) && row.note.id !== current && row.depth <= room,
  );
}
