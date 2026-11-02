lu

# Progress

Plan: `docs/PLAN.md`. Statuses: `Todo`, `In progress`, `Blocked`, `Done`.

## Open work index

Every item not `Done`. Keep in sync with the sections below.

| ID   | Item                                                                                           | Status      |
| ---- | ---------------------------------------------------------------------------------------------- | ----------- |
| M4.4 | Release                                                                                        | Todo        |
| M5.1 | Bug: import (JSON / Markdown) does nothing, no error shown                                     | In progress |
| M5.2 | Export file names lowercase, no spaces                                                         | In progress |
| M5.3 | Book color: custom color picker (any color)                                                    | In progress |
| M5.4 | Resizable panels: Library / Notes / Editor                                                     | Todo        |
| M5.5 | Editor: checklist (task list) tool                                                             | In progress |
| M5.6 | Note Pin + Lock (read-only) from the note itself                                               | In progress |
| M5.7 | Links: hyperlink insert/edit UI + light-yellow `#fff200` link style                            | In progress |
| M5.8 | Drag and drop: reorder books, move note to another book                                        | Todo        |
| M5.9 | Keyboard and context menu: Ctrl/⌘+S saves the note, app right-click menu, a11y pass on buttons | Todo        |

## Notes

- M4.4: deferred by the owner; not releasing yet. Release = `firebase deploy --only hosting` (and rules), see `README.md`.
- M1–M4.3 were verified manually by the owner against the real Firebase project (2026-11-02).

### M5 — Owner feedback (2026-11-02)

- M5.1: cause found for Markdown import — the file input was cleared before the async handler read the live
  `FileList`, so zero files were imported silently. Fixed; both imports now report a result or the Firestore
  error in a dialog. JSON import had no known defect: owner to retest both.
- M5.2 (approved, done in code): `My Note` → `my-note.md`; any run of non-letter/digit characters becomes `-`;
  Thai and other scripts are kept; empty → `untitled.md`. Backup name unchanged.
- M5.3 (approved, done in code — publish rules): keep the preset swatches and add a free color picker; `color` then also accepts a hex value (rules,
  backup clamping and `bookColorClass` must follow).
- M5.4: drag the borders between Library, Notes and Editor on desktop/tablet; remember widths per device.
- M5.5 (done in code): Markdown shortcut `[ ]` plus a toolbar button; Markdown import/export as `- [ ]` / `- [x]`.
- M5.6 (approved, done in code — publish rules): Pin already exists in the note list menu; add Pin and Lock to the note header. Lock = read-only editor
  until unlocked; new stored field `isLocked` (rules, types, backup, requirement schema).
- M5.7 (done in code, D23; spec from the owner's reference image): clicking or placing the cursor in a link shows a
  floating bar above it with, left to right:

  1. **Alias** field — the link text shown in the note (editable).
  2. **Link** field — the URL (editable).
  3. **Open in new tab** button (replaces the reference image's Copy button).
  4. **Remove** button — removes the link and keeps its text as plain text.
  5. Hint `⌥Enter` — keyboard shortcut to open the link in a new tab.

  Link color (owner chose option ก): `#fff200` as a light background tint/underline on links in both themes;
  link text keeps the normal readable text color (`#fff200` text on white is about 1.1:1).

- M5.8 (approved: `@dnd-kit`): replaces Move up / Move down (D14) for books, and adds dropping a note onto a
  book to move it. Must work with mouse, touch and keyboard.
- M5.9: Ctrl/⌘+S flushes Auto Save instead of the browser's Save Page. First right-click opens the app menu
  (note/book actions, editor formatting); a second right-click on the open menu falls through to the browser
  menu. Then a keyboard/screen-reader pass over all buttons.

## Done

| ID   | Item                                                         | Status |
| ---- | ------------------------------------------------------------ | ------ |
| M0.1 | Vite + React + TS + Tailwind v4 + ESLint + Prettier baseline | Done   |
| M0.2 | MVP plan and project docs                                    | Done   |
| M0.3 | Firebase SDK + env config (`src/lib/firebase.ts`)            | Done   |
| M1.1 | Install remaining dependencies + Vitest                      | Done   |
| M1.2 | Theme tokens, Light/Dark                                     | Done   |
| M1.3 | Responsive shell                                             | Done   |
| M1.4 | Routing (SPA rewrite since D19)                              | Done   |
| M1.5 | Google Sign-in + guard (any account since D22)               | Done   |
| M1.6 | Firebase Hosting (manual deploy, D19)                        | Done   |
| M2.1 | Firestore data layer                                         | Done   |
| M2.2 | Security Rules (real project)                                | Done   |
| M2.3 | Book management                                              | Done   |
| M2.4 | Note management + Pin                                        | Done   |
| M2.5 | Sorting (Updated, Created, A–Z)                              | Done   |
| M2.6 | Tiptap editor                                                | Done   |
| M2.7 | Auto Save + status + Dexie drafts                            | Done   |
| M3.1 | Paper Styles                                                 | Done   |
| M3.2 | Typography                                                   | Done   |
| M3.3 | Search                                                       | Done   |
| M3.4 | Tags                                                         | Done   |
| M3.5 | Motion (CSS, D15)                                            | Done   |
| M3.6 | Mobile polish                                                | Done   |
| M3.7 | Trash                                                        | Done   |
| M3.8 | Import/Export                                                | Done   |
| M3.9 | Custom sort (Move up / Move down, D14)                       | Done   |
| M4.1 | Performance                                                  | Done   |
| M4.2 | Accessibility                                                | Done   |
| M4.3 | Security Rules review                                        | Done   |
