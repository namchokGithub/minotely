# Nested Pages — design

Status: draft for owner approval (2026-11-15). Milestone M7.4. Decision record to add on build: D49.

## Intent

The owner wants notes to hold sub-notes, like folders of pages in Notion, so a large topic (for example the
"Minotely" note with "Optimize" and "New feature") can be split into pages under one parent instead of one long
note or many flat notes in a book. Pages stay inside their book; books stay the top level of the Library.

## Goals

- A note can have one parent note in the same book; parents can have many children; up to 3 levels deep.
- The Notes column shows each book's notes as a tree with expand/collapse.
- Create a sub-page, move a note under another note or back to the top level, from menus.
- Moving, deleting and restoring act on a whole branch where that is what the owner would expect.
- The note shows where it sits (breadcrumb) and what is under it (sub-page list).

## Non-goals

- Page blocks inside note content (Notion's in-content page links). The tree lives in note data, not content.
- Drag and drop to nest or un-nest (later; menus only now). Existing drag of a note onto a book stays.
- Nested books, or pages that span books.
- Sharing, permissions per page, or page templates.

## Anti-goals (a failure even if it works)

- Losing or hiding a note: every note must stay reachable, even with broken or cyclic parent data.
- Extra Firestore reads: the tree is built from the notes already loaded (D33 all-notes listener).
- Changing existing notes on upgrade: old notes simply have no parent and appear at the top level.

## Approaches considered

- **A. `parentId` on the note, tree in the Notes column — chosen by the owner.** One optional field; content
  untouched; no extra reads; rules, backup and schema gain one field.
- B. Page blocks in the parent's content (Notion's model). Rejected: the tree would be derived from content and
  must stay in step with the notes collection across devices and offline edits (D32), which is fragile.
- C. Nested books instead of nested notes. Rejected: not what was asked; notes still could not hold notes.

## Data model

- New optional field on `users/{uid}/notes/{noteId}`: `parentId` — a note id string, or `null`/missing for a
  top-level note. Same book as the parent is an app rule (not enforceable in Security Rules).
- `Note` type gains `parentId: string | null`; `toNote` maps missing to `null`.
- `firestore.rules` `validNote`: allow key `parentId`; `d.get("parentId", null) == null || (d.parentId is string
  && d.parentId.size() > 0 && d.parentId.size() <= 128 && d.parentId != noteId)`. The self-check needs the
  document id, so `validNote` takes `noteId` as a second argument. Rules cannot detect longer cycles.
- Backup (`src/features/data/backup.ts`): export `parentId`. `importBackup` gives every imported note a new id
  (it already maps book ids old→new, but not note ids). Import becomes two passes: first allocate a new ref for
  every importable note and record old→new note ids, then write each note with `parentId` remapped through that
  map. A `parentId` whose target is not imported, is in another book, or would create a cycle or exceed 3 levels
  is written as `null` (the note becomes top level). Markdown import (`importNotes`) creates top-level notes.
- `docs/REQUIREMENT-V1.md` schema: add `parentId`.

## Tree rules (client)

A single pure module, `src/features/notes/tree.ts`, builds and checks the tree from a flat note list:

- **Effective parent:** a note's parent counts only if the parent exists in the same list (same book, not in
  Trash) and following parents does not loop and stays within 3 levels. Otherwise the note is shown at the top
  level. This is what keeps every note reachable with bad data.
- **Depth limit:** 3 levels (top level = level 1). "Add sub-page" and "Move into…" are disabled where the result
  would exceed it, counting the moved note's own subtree depth.
- **Order within a level:** the Notes column sort (updated, created, A–Z, custom) applied per level; pinned first
  per level. Custom order (`order`, Move up/down) swaps only among siblings.
- **Tag filter on:** the tree is replaced by a flat list of matching notes, each with its path (Parent / Child),
  because a match's ancestors may not match.

## Behaviors

| Action | Result |
| --- | --- |
| Add sub-page (note ⋯ menu, right-click menu, and a button in the note) | New empty note with `parentId` = that note, same book; it opens. Disabled at depth 3. |
| Move into… (note menus) | Pick a note in the same book (not itself or its descendants, within depth). Sets `parentId`. |
| Move to top level (note menus, only when nested) | `parentId` = null. |
| Move to another book (existing menu, and drag onto a book) | The note and all its descendants change `bookId` in one batch; the moved note becomes top level there; descendants keep their parents. |
| Delete (to Trash) | The note and all its non-deleted descendants get the same `deletedAt` in one batch. |
| Restore a note | Restores it, plus descendants deleted in the same action (same `deletedAt` value, see below). If its parent is still in Trash or gone, it shows at the top level (effective-parent rule; `parentId` is kept, so restoring the parent later re-nests it). |
| Restore to another book (Trash "Restore to", the only way back when the book was deleted) | *Builder's call:* like Move to another book: the note and the descendants deleted with it get the new `bookId` and are restored in one batch; the restored note's `parentId` is cleared (it becomes top level there); descendants keep their parents. |
| Delete forever / Empty Trash | Unchanged per note. A child left alive whose parent is deleted forever shows at the top level. |
| Delete a book | Unchanged: all its notes go to Trash. |
| Copy / Markdown export | Unchanged; one note at a time. |

Batches larger than `BATCH_LIMIT` are split like `emptyTrash`.

**Same `deletedAt` for a branch** (*builder's call*): a branch delete that fits one batch writes
`serverTimestamp()`, which gives every note in the batch the same value, as today. A branch larger than one batch
(over 400 notes, not expected with 3 levels) writes one client `Timestamp.now()` to all of them, so restore can
still find the whole branch; clock skew only affects its place in the Trash order. Restore matches `deletedAt`
exactly (millisecond value).

## Rollout and compatibility (*builder's call*)

Hosting deploys on push to `production` and Rules are published by hand, so either can go live first. The code
therefore never writes `parentId: null`: top-level notes are created and imported without the key, and "Move to
top level" (and clearing on Restore to another book) removes it with `deleteField()`. Until the new Rules are
published, only writes that set a `parentId` (Add sub-page, Move into…) are refused; everything else keeps working.
The owner publishes Rules before or right after the release.

## Interface

- **Notes column:** tree rows indented 16px per level; a ▸/▾ toggle before notes with children (with a child
  count when collapsed). Expanded state per note in the persisted UI store (this device); default expanded.
  The toggle does not open the note. Keyboard: the toggle is a button (`aria-expanded`); rows keep current
  behavior. On phones the same tree shows, indentation 12px.
- **Note menus (⋯ and right-click via MenuKit, D26):** Add sub-page, Move into…, Move to top level.
- **Editor:** a breadcrumb above the title with ancestors (icon + title, each a link) when the note is nested;
  a "Sub-pages" list after the content (icon + title links, plus "Add sub-page") when it has children or always
  as a small button. Lined paper: these sit outside the ruled text rows or follow D40's row sizes.
- **Search:** results show the path, `Parent / Child`, under the title.
- **Trash:** rows show the path they had; restoring follows the table above.
- **Library rail and counts:** book note counts include nested notes (unchanged count logic).

## Constraints

- No Firestore Emulator or mocks (D6); owner tests against the real project. Rules publish is manual.
- No automated tests (project rule); `tree.ts` stays pure so it is easy to reason about.
- Components do not call Firestore directly; new writes live in `src/features/notes/api.ts` (D11).
- Motion 150–250 ms for expand/collapse; respect reduced motion.

## Left to the builder (also decided during the builder check)

- A note moved under a new parent keeps its `order`; custom order among the new siblings follows it.
- Undo of a drag-move to another book (existing toast) restores the branch's `bookId`; `parentId` of the moved
  note is restored too.
- The collapsed count shows direct children.
- When bad data makes a chain deeper than 3, notes below level 3 show at the top level.

- Exact styling of tree rows, toggle, breadcrumb and sub-page list within the existing look.
- Whether the in-note "Add sub-page" is in the Sub-pages list, the header, or both.
- Batch helpers' names and how descendants are collected (from the all-notes cache).
- How to show depth-limit reasons (disabled item with a hint is enough).
