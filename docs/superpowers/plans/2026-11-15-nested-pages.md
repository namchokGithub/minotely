# Nested Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a note have sub-pages (up to 3 levels) inside its book, shown as a tree in the Notes column, with branch-aware move, delete and restore.

**Architecture:** One optional field `parentId` on notes. A pure module `src/features/notes/tree.ts` turns the flat note list (already loaded by the all-notes listener, D33) into a tree and answers every structural question (effective parent, depth, descendants, path, eligible targets). Writes that touch a branch live in `src/features/notes/api.ts` and use batches. UI reads only `tree.ts`.

**Tech Stack:** React 19, TypeScript, Firestore (web SDK v13), TanStack Query via `useSnapshotQuery`, Zustand (persisted UI store), Radix menus via `MenuKit` (D26).

**Spec:** `docs/superpowers/specs/2026-11-15-nested-pages-design.md`

## Global Constraints

- Project rules (`AGENTS.md`) override the skill defaults: **no automated tests, no test files, do not run `pnpm test`; never `git commit` or `git push`** — each task ends with verification commands and a suggested commit message for the owner.
- Verification per task: `pnpm exec prettier --write <files>`, `pnpm exec eslint <files>`, `pnpm exec tsc -b`. `pnpm build` once, in the last task.
- Depth limit: **3 levels** (top level = level 1).
- Never write `parentId: null`. Top-level notes omit the key; clearing uses `deleteField()`.
- Components never call Firestore directly (D11); all writes in `src/features/notes/api.ts` (backup in `backup.ts`).
- Batches: at most `BATCH_LIMIT` (400) writes each; a branch over one batch uses one client `Timestamp.now()` for `deletedAt`, otherwise `serverTimestamp()`.
- Motion 150–250 ms, respects reduced motion. UI copy in English, as elsewhere in the app.
- Rules are published by the owner by hand (`firebase deploy --only firestore:rules`); agents never deploy.

## Review Focus

1. Cyclic or dangling `parentId` (A→B→A, parent in another book, parent deleted forever): every note must still appear exactly once, at the top level where its chain breaks. Owned by Task 1 (`buildNoteTree`) and checked manually in Task 8.
2. "Move into…" a target that would put the moved note's own subtree below level 3, or into its own descendant: the target must not be offered. Task 1 (`canMoveInto`), used in Task 5.
3. Restoring a child whose parent is still in Trash, then restoring the parent: the child must re-nest (its `parentId` was kept). Tasks 2 and 7.
4. Tag filter on while notes are nested: matches show as a flat list with paths; nothing hidden under a collapsed parent. Task 4.
5. Writes before the owner publishes Rules: creating, editing, deleting, importing must keep working; only Add sub-page and Move into… may fail, with a toast. Tasks 2, 3, 5.

---

### Task 1: Data field and the pure tree module

**Files:**
- Modify: `src/features/notes/types.ts` (add `parentId`)
- Modify: `src/features/notes/api.ts` (`toNote`)
- Modify: `firestore.rules` (`validNote`)
- Modify: `docs/REQUIREMENT-V1.md` (schema)
- Create: `src/features/notes/tree.ts`

**Interfaces:**
- Produces:
  - `Note.parentId: string | null`
  - `export const MAX_NOTE_DEPTH = 3`
  - `export type TreeNode = { note: Note; depth: number; children: TreeNode[] }` (depth 1 = top level)
  - `export function buildNoteTree(notes: Note[], sort: NoteSort): TreeNode[]` — roots sorted with `sortNotes`, children sorted per level the same way.
  - `export function effectiveParentId(note: Note, byId: Map<string, Note>): string | null`
  - `export function flattenTree(roots: TreeNode[], collapsed: ReadonlySet<string>): TreeNode[]` — visible rows in order, skipping children of collapsed nodes.
  - `export function descendantsOf(noteId: string, notes: Note[]): Note[]` — effective descendants, any depth.
  - `export function subtreeHeight(noteId: string, notes: Note[]): number` — 1 for a leaf.
  - `export function pathOf(noteId: string, notes: Note[]): Note[]` — effective ancestors, root first, not including the note.
  - `export function canMoveInto(noteId: string, targetId: string, notes: Note[]): boolean`
  - `export function canAddChild(noteId: string, notes: Note[]): boolean`

- [ ] **Step 1: Add the field.** `parentId: string | null` on `Note` with a doc comment (D49). In `toNote`: `parentId: typeof data.parentId === "string" && data.parentId ? data.parentId : null`.

- [ ] **Step 2: Rules.** Change `validNote(d)` to `validNote(d, noteId)`, add `"parentId"` to `hasOnly`, and add:
  ```
  // Notes created before D49 have no `parentId`; never null in practice (removed with deleteField).
  && (!d.keys().hasAny(["parentId"]) || (d.parentId is string
      && d.parentId.size() > 0 && d.parentId.size() <= 128 && d.parentId != noteId))
  ```
  Pass `noteId` from both `create` and `update` in `match /users/{uid}/notes/{noteId}`.

- [ ] **Step 3: Schema doc.** In `docs/REQUIREMENT-V1.md` add `parentId (parent note id in the same book; missing = top level — D49)` after `icon`.

- [ ] **Step 4: Implement `tree.ts`.** Effective parent: the raw `parentId` counts only if the parent is in the given list, has the same `bookId`, walking up does not revisit a note, and the note's depth would be ≤ `MAX_NOTE_DEPTH`; otherwise `null`. Compute depths with a memoized walk over `byId` (guard cycles with a visiting set). `canMoveInto` is false when `targetId === noteId`, the target is a descendant of the note, the target is in another book, or `depth(target) + subtreeHeight(note) > MAX_NOTE_DEPTH`. `canAddChild` is `depth(note) < MAX_NOTE_DEPTH`.

- [ ] **Step 5: Verify.**
  Run: `pnpm exec prettier --write src/features/notes/tree.ts src/features/notes/types.ts src/features/notes/api.ts && pnpm exec eslint src/features/notes/tree.ts src/features/notes/types.ts src/features/notes/api.ts && pnpm exec tsc -b`
  Expected: no output from eslint, tsc exits 0.

- [ ] **Step 6: Suggest commit** `feat(notes): add optional parentId and a pure note tree module` (owner commits).

### Task 2: Branch-aware writes

**Files:**
- Modify: `src/features/notes/api.ts`

**Interfaces:**
- Consumes: `descendantsOf` (Task 1).
- Produces:
  - `createNote(uid, bookId, fields?, parentId?: string): string` — adds `parentId` only when given.
  - `setNoteParent(uid: string, noteId: string, parentId: string | null): Promise<void>` — `null` writes `deleteField()`. Does not bump `updatedAt`.
  - `moveBranch(uid: string, note: Note, bookId: string, allNotes: Note[]): Promise<void>` — the note and its descendants get `bookId` and `updatedAt`; the note's `parentId` is removed (`deleteField()`), descendants keep theirs.
  - `undoMoveBranch(uid: string, note: Note, allNotesBefore: Note[]): Promise<void>` — puts `bookId` back on the same ids and restores the note's previous `parentId` (or removes it).
  - `deleteBranch(uid: string, note: Note, allNotes: Note[]): Promise<void>` — replaces callers of `deleteNote`; same `deletedAt` for all.
  - `restoreBranch(uid: string, note: Note, trashNotes: Note[], bookId?: string): Promise<void>` — restores the note plus trashed descendants whose `deletedAt` equals the note's (`getTime()` equality); with `bookId`, all get it and the note's `parentId` is removed.
- Keep `deleteNote` and `restoreNote` exported only if other callers remain; otherwise remove them.

- [ ] **Step 1: Implement the five functions.** One private helper `commitInBatches(updates: { ref: DocumentReference; data: UpdateData<DocumentData> }[])` splits by `BATCH_LIMIT`. `deleteBranch` picks `serverTimestamp()` when the branch fits one batch, else one `Timestamp.now()`.
- [ ] **Step 2: Verify** (same commands as Task 1 for `src/features/notes/api.ts`). Expected: clean.
- [ ] **Step 3: Suggest commit** `feat(notes): move, delete and restore whole note branches`.

### Task 3: Backup export and two-pass import

**Files:**
- Modify: `src/features/data/backup.ts`

**Interfaces:**
- Consumes: `MAX_NOTE_DEPTH` (Task 1).
- Produces: `BackupNote.parentId?: string` in exports; import remaps it.

- [ ] **Step 1: Export** `parentId: n.parentId ?? undefined` (omit when null).
- [ ] **Step 2: Import in two passes.** Pass 1: for each note whose book is imported, allocate `doc(notesCol(uid))` and record `noteIds: Map<oldId, newId>` plus `oldBook: Map<oldId, oldBookId>`. Pass 2: keep a parent only if `noteIds` has it, the parent's old book equals the note's, and walking up old parents within the file has no cycle and depth ≤ 3; write `parentId: noteIds.get(old)` only then, otherwise omit the key.
- [ ] **Step 3: Verify** (prettier, eslint, `tsc -b` on `backup.ts`). Expected: clean.
- [ ] **Step 4: Suggest commit** `feat(data): keep sub-page structure in JSON backup and import`.

### Task 4: Tree in the Notes column

**Files:**
- Modify: `src/stores/ui-store.ts` (collapsed set)
- Modify: `src/features/notes/notes-panel.tsx`
- Modify: `src/features/notes/note-item.tsx` (indent, toggle, count)

**Interfaces:**
- Consumes: `buildNoteTree`, `flattenTree`, `pathOf` (Task 1).
- Produces:
  - UI store: `collapsedNotes: string[]`, `toggleNoteCollapsed(noteId: string): void` (persisted).
  - `NoteItem` new props: `depth: number`, `childCount: number`, `collapsed: boolean`, `onToggle?: () => void`, `path?: Note[]` (shown under the title in tag-filter mode).

- [ ] **Step 1: Store.** Add the field, action and `partialize` entry; default `[]`.
- [ ] **Step 2: Panel.** Without a tag filter: `rows = flattenTree(buildNoteTree(notes, noteSort), new Set(collapsedNotes))`. With a tag filter: the current flat sorted list, each with `path = pathOf(note.id, notes)`. Custom-order Move up/down: `previous`/`next` only among rows with the same effective parent and the same `isPinned`.
- [ ] **Step 3: Row.** Indent `16px × (depth − 1)` (12px below 768px). Before the title, a toggle button (`aria-expanded`, `aria-label="Expand sub-pages"` / `"Collapse sub-pages"`, ▸/▾ via `ChevronRight` rotated 90° with a 150 ms transition) when `childCount > 0`, else an equal-width spacer; collapsed rows show `childCount` after the title. The toggle stops propagation so it never opens the note.
- [ ] **Step 4: Verify** (prettier, eslint, `tsc -b` on the three files). Expected: clean.
- [ ] **Step 5: Suggest commit** `feat(notes): show sub-pages as a collapsible tree in the Notes column`.

### Task 5: Note menus and drag to a book

**Files:**
- Modify: `src/features/notes/note-item.tsx` (`menuItems`)
- Modify: `src/app/library-dnd.tsx` (drop on book, Undo)

**Interfaces:**
- Consumes: `createNote(…, parentId)`, `setNoteParent`, `moveBranch`, `undoMoveBranch`, `deleteBranch` (Task 2); `canAddChild`, `canMoveInto` (Task 1); `useAllNotes` for the full list.

- [ ] **Step 1: Menu items** (shared ⋯ and right-click via `MenuKit`, D26), after Lock: `Add sub-page` (disabled when `!canAddChild`; creates and navigates to `/books/{bookId}/notes/{newId}`); `Move into…` sub-menu listing notes of the same book in tree order with indentation, only those where `canMoveInto`; `Move to top level` only when `note.parentId` is set. Failures toast "Could not … (Security Rules may need publishing)" for the two `parentId`-setting writes.
- [ ] **Step 2: Branch semantics.** Existing "Move to" (book) calls `moveBranch`; Delete calls `deleteBranch`; the confirm text adds "and its N sub-page(s)" when N > 0.
- [ ] **Step 3: Drag to book.** In `library-dnd.tsx` replace `moveNote` with `moveBranch`; Undo calls `undoMoveBranch` with the list captured at drop time.
- [ ] **Step 4: Verify** (prettier, eslint, `tsc -b` on both files). Expected: clean.
- [ ] **Step 5: Suggest commit** `feat(notes): add sub-page, move into, and branch-aware move and delete`.

### Task 6: Breadcrumb and sub-pages in the editor

**Files:**
- Create: `src/features/editor/page-trail.tsx` (`PageBreadcrumb`, `SubPages`)
- Modify: `src/features/editor/editor-panel.tsx`
- Modify: `src/index.css` (Lined rows for these, if needed)

**Interfaces:**
- Consumes: `pathOf`, `buildNoteTree`/children of the note, `canAddChild` (Task 1); `createNote(…, parentId)` (Task 2); `useNotes(bookId)` for the book's notes.
- Produces: `PageBreadcrumb({ note, notes }: { note: Note; notes: Note[] })`, `SubPages({ note, notes }: …)`.

- [ ] **Step 1: Breadcrumb** above the title row when `pathOf` is non-empty: ancestors as links (icon + title, `/` separators, truncate), small muted text. On Lined paper it takes exactly one row (`--paper-row`) and the title row keeps its two rows (D40).
- [ ] **Step 2: Sub-pages** after the content in WYSIWYG mode: heading "Sub-pages", child links (icon + title) and an "Add sub-page" button (hidden when locked or at depth 3). Outside `.minotely-editor`, so it is not note content; on Lined paper each link is one row.
- [ ] **Step 3: Verify** (prettier, eslint, `tsc -b`). Expected: clean.
- [ ] **Step 4: Suggest commit** `feat(editor): show a breadcrumb and a sub-pages list for nested notes`.

### Task 7: Search, Trash and restore

**Files:**
- Modify: `src/features/search/search-dialog.tsx`
- Modify: `src/features/trash/trash-panel.tsx`

**Interfaces:**
- Consumes: `pathOf` (Task 1), `restoreBranch` (Task 2), `useAllNotes`, `useTrashNotes`.

- [ ] **Step 1: Search results** show `Parent / Child` under the title when nested (`pathOf` over all live notes).
- [ ] **Step 2: Trash rows** show their path using live and trashed notes together. Restore calls `restoreBranch(uid, note, trashNotes)`; "Restore to <book>" calls `restoreBranch(uid, note, trashNotes, book.id)`. The row's restore label adds "with N sub-page(s)" when its same-`deletedAt` descendants exist.
- [ ] **Step 3: Verify** (prettier, eslint, `tsc -b`). Expected: clean.
- [ ] **Step 4: Suggest commit** `feat(notes): show page paths in search and Trash and restore whole branches`.

### Task 8: Docs, build and manual test list

**Files:**
- Modify: `docs/DECISIONS.md` (D49), `docs/PROGRESS.md` (M7.4 → In progress), `README.md` (Organize line), `docs/log/2026-11.md`

- [ ] **Step 1: D49** summarizing the spec's decisions (field, effective-parent rule, depth 3, branch semantics, rollout without `parentId: null`, Lined rows).
- [ ] **Step 2: Build once.** Run: `pnpm build`. Expected: `✓ built`; chunk-size warnings are pre-existing.
- [ ] **Step 3: Hand off** to the owner: publish Rules; manual cases — create sub-page at levels 1–3 (4th refused), move into / top level, collapse state after reload, custom order among siblings, move branch by menu and by drag with Undo, delete and restore (parent first, child first), Restore to another book, tag filter, search path, backup export → import, a second device, widths 360/768/1280px, Lined paper rows, and the Review Focus cases above.
- [ ] **Step 4: Suggest commit** `docs: record nested pages (D49) and update progress`.
