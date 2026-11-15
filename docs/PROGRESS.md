lu

# Progress

Plan: `docs/PLAN.md`. Statuses: `Todo`, `In progress`, `Blocked`, `Done`.

## Open work index

Every item not `Done`. Keep in sync with the sections below.

| ID    | Item                                                                   | Status      |
| ----- | ---------------------------------------------------------------------- | ----------- |
| M6.1  | Fewer Firestore writes, keep editing offline, conflict check on sync   | In progress |
| M6.2  | Fewer Firestore reads: one notes listener, persistent cache            | In progress |
| M6.3  | Raw Markdown editor toggle                                             | In progress |
| M6.4  | Copy WYSIWYG selections as Markdown                                    | In progress |
| M6.5  | English spellcheck in WYSIWYG with custom suggestions                  | In progress |
| M6.6  | Thai dictionary and bilingual spellcheck in WYSIWYG                    | In progress |
| M6.7  | Copy plain text from the editor menu or keyboard shortcut              | In progress |
| M6.8  | Toggle spell check from the editor context menu                        | In progress |
| M6.9  | Margin paper style; Lined paper text sits on the lines                 | In progress |
| M6.10 | Pasted Markdown becomes rich text                                      | In progress |
| M6.11 | Local version history (Auto and Manual, this device only)              | In progress |
| M6.12 | Background around the page (color, image URL, opacity, darker/lighter) | In progress |
| M6.13 | Collapse Library and Notes columns to a rail from their titles         | In progress |
| M6.14 | Page width presets (Default, A5, A4, Letter, A3, Full 90%)             | In progress |
| M7.1  | Note icon (one emoji before the title) — publish rules                 | In progress |
| M7.2  | Table of Contents (Document Outline) at the right of the note          | In progress |

## Notes

- No open work. M4.4: first release deployed from GitHub Actions on push to `production` (2026-11-02, D31).
- M1–M4.3 were verified manually by the owner against the real Firebase project (2026-11-02).

### M7 — Notion-like editing (2026-11-15)

Owner's list, split into three projects (not images for now): (1) note icon and Table of Contents, (2) blocks in
the editor (`/` menu, callout, code block color, floating toolbar, block `+` and `⠿` controls, block drag and
drop, block actions), (3) nested pages. Markdown shortcuts already exist (input rules).

- M7.1 (approved, done in code, D46; publish rules; owner to test): an icon button before the note title picks
  one emoji (32 suggestions, or type/paste any) or removes it; shown in the note list, search, Trash and the
  phone header. New optional note field `icon` in types, rules, backup and the requirement schema.
- M7.2 (approved, done in code, D47; owner to test): headings (H1–H3) as short bars at the right edge of the
  editor on 768px and up; hover or focus shows the list, click on the bars pins it, a heading scrolls to it.

### M6 — Sync cost and offline editing (2026-11-03)

- M6.1 (approved, done in code, D32; owner to test): sync a note 30 s after typing stops or at most every 5 min
  instead of 800 ms; nothing is sent while offline; each sync checks Firestore still holds the version the edit
  started from and asks "Keep mine / Use other version" if not. Status shows Saved on this device / Syncing /
  Synced / Offline / Changed elsewhere. Out of scope: opening the app offline (service worker); persistent cache
  followed in M6.2.
- M6.2 (approved, done in code, D33; owner to test): `useNotes(bookId)` filters the all-notes listener instead of
  its own query; Firestore uses a persistent IndexedDB cache shared by tabs.
- M6.3 (approved, done in code, D34; owner to test): switch a note body between WYSIWYG and editable Raw Markdown.
  Viewing Raw without edits preserves the original rich formatting. Raw edits use the existing local draft and
  Auto Save flow; unsupported colors and custom highlights may be lost after a Raw edit.
- M6.4 (approved, done in code, D35; owner to test): Ctrl/⌘+C puts selected WYSIWYG content on the clipboard as
  plain Markdown rather than rich HTML. Raw Markdown and title inputs keep native copy. The editor context menu
  now copies plain text (M6.7).
- M6.5 (approved, done in code, D36; owner to test): English spelling errors are underlined in WYSIWYG; the
  right-click menu offers corrections, Add to dictionary (per account on this device), and Ignore word (until
  the note closes). Raw Markdown and Thai are outside this first pass.
- M6.6 (approved, done in code, D37; owner to test): add the Thai Hunspell dictionary and use Thai word
  segmentation alongside English checking. Personal words are separate by language. The public repo credits
  both dictionary sources and includes the Thai GPLv3 license. Segmentation may miss typos that split into
  valid smaller words.
- M6.7 (approved, done in code, D38; owner to test): the editor context menu's Copy as text and
  Ctrl/⌘+Alt+Shift+C copy only selected characters with line breaks between blocks. Ctrl/⌘+C keeps copying
  Markdown. The alternate shortcut avoids Chrome's Ctrl/⌘+Shift+C Inspect Element shortcut.
- M6.8 (approved, done in code, D39; owner to test): a checked Spell check item in the editor's right-click
  menu turns English and Thai checking on or off for all notes of that account on this device. Off removes
  underlines and suggestions immediately and pauses checking; on rechecks the open note.

- M6.9 (approved, done in code, D13/D40; publish rules for Margin; owner to test): Margin paper = plain page with
  the red margin line; on Lined paper every block is a whole number of 2rem rows so text sits on the lines.
- M6.10 (approved, done in code, D41; owner to test): plain text that looks like Markdown is converted on paste
  (Ctrl/⌘+V and the context menu); Ctrl/⌘+Shift+V and code blocks paste raw text.
- M6.11 (approved, done in code, D42; owner to test): History button in the note header opens a dialog with
  versions kept in IndexedDB only: Auto (content before the first edit, then at most one per 10 min after a
  successful sync) and Manual (Save version: syncs first, refuses when offline, on a sync error or a conflict);
  read-only preview; 10 Auto + 10 Manual per note. Not in Firestore, Security Rules or JSON backup.

- M6.12 (approved, done in code, D13/D43; owner to test): paper lines are drawn on the page column only; the
  area around the page can get a color, an https image, an opacity and a darker/lighter level from Page
  appearance → Background…, saved in localStorage per account on this device.

- M6.13 (approved, done in code, D44; owner to test): on 768px and up, clicking the Library title ("Minotely")
  or the Notes/Trash title collapses that column to a 48px rail with one icon button that expands it again;
  state saved per device. The tablet-only Library toggle button in the Notes header is removed. The Library
  rail lists each book's icon (hover shows the name; click opens the book) and Trash.

- M6.14 (approved, done in code, D45; owner to test): Page appearance → Page width (this device) sets the page
  column's maximum width: Default 768px, A5, A4, Letter, A3, Full (90% of the editor). Length unlimited;
  per device, not synced.

### M5 — Owner feedback (2026-11-02) — all done

- M5.1: cause found for Markdown import — the file input was cleared before the async handler read the live
  `FileList`, so zero files were imported silently. Fixed; both imports now report a result or the Firestore
  error in a dialog. JSON import had no known defect: owner to retest both.
- M5.2 (approved, done in code): `My Note` → `my-note.md`; any run of non-letter/digit characters becomes `-`;
  Thai and other scripts are kept; empty → `untitled.md`. Backup name unchanged.
- M5.3 (approved, done in code — publish rules): keep the preset swatches and add a free color picker; `color` then also accepts a hex value (rules,
  backup clamping and `bookColorClass` must follow).
- M5.4 (done in code, D25): drag the borders between Library, Notes and Editor on desktop/tablet; remember widths per device.
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

- M5.8 (approved: `@dnd-kit`, done in code, D24): replaces Move up / Move down (D14) for books, and adds dropping a note onto a
  book to move it. Must work with mouse, touch and keyboard.
- M5.9 (done in code, D26): Ctrl/⌘+S flushes Auto Save instead of the browser's Save Page. First right-click opens the app menu
  (note/book actions, editor formatting); a second right-click on the open menu falls through to the browser
  menu. Then a keyboard/screen-reader pass over all buttons.

## Done

| ID   | Item                                                                                           | Status |
| ---- | ---------------------------------------------------------------------------------------------- | ------ |
| M0.1 | Vite + React + TS + Tailwind v4 + ESLint + Prettier baseline                                   | Done   |
| M0.2 | MVP plan and project docs                                                                      | Done   |
| M0.3 | Firebase SDK + env config (`src/lib/firebase.ts`)                                              | Done   |
| M1.1 | Install remaining dependencies + Vitest                                                        | Done   |
| M1.2 | Theme tokens, Light/Dark                                                                       | Done   |
| M1.3 | Responsive shell                                                                               | Done   |
| M1.4 | Routing (SPA rewrite since D19)                                                                | Done   |
| M1.5 | Google Sign-in + guard (any account since D22)                                                 | Done   |
| M1.6 | Firebase Hosting (manual deploy, D19)                                                          | Done   |
| M2.1 | Firestore data layer                                                                           | Done   |
| M2.2 | Security Rules (real project)                                                                  | Done   |
| M2.3 | Book management                                                                                | Done   |
| M2.4 | Note management + Pin                                                                          | Done   |
| M2.5 | Sorting (Updated, Created, A–Z)                                                                | Done   |
| M2.6 | Tiptap editor                                                                                  | Done   |
| M2.7 | Auto Save + status + Dexie drafts                                                              | Done   |
| M3.1 | Paper Styles                                                                                   | Done   |
| M3.2 | Typography                                                                                     | Done   |
| M3.3 | Search                                                                                         | Done   |
| M3.4 | Tags                                                                                           | Done   |
| M3.5 | Motion (CSS, D15)                                                                              | Done   |
| M3.6 | Mobile polish                                                                                  | Done   |
| M3.7 | Trash                                                                                          | Done   |
| M3.8 | Import/Export                                                                                  | Done   |
| M3.9 | Custom sort (Move up / Move down, D14)                                                         | Done   |
| M4.1 | Performance                                                                                    | Done   |
| M4.2 | Accessibility                                                                                  | Done   |
| M4.3 | Security Rules review                                                                          | Done   |
| M5.1 | Bug: import (JSON / Markdown) does nothing, no error shown                                     | Done   |
| M5.2 | Export file names lowercase, no spaces                                                         | Done   |
| M5.3 | Book color: custom color picker (any color)                                                    | Done   |
| M5.4 | Resizable panels: Library / Notes / Editor                                                     | Done   |
| M5.5 | Editor: checklist (task list) tool                                                             | Done   |
| M5.6 | Note Pin + Lock (read-only) from the note itself                                               | Done   |
| M5.7 | Links: hyperlink insert/edit UI + light-yellow `#fff200` link style                            | Done   |
| M5.8 | Drag and drop: reorder books, move note to another book                                        | Done   |
| M5.9 | Keyboard and context menu: Ctrl/⌘+S saves the note, app right-click menu, a11y pass on buttons | Done   |
| M4.4 | Release (GitHub Actions → Firebase Hosting)                                                    | Done   |
