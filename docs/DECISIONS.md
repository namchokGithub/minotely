# Decisions

Non-obvious architectural choices. Newest last.

## D1 — No Edit/Preview toggle (2026-11-01) — raw editing added by D34

The editor is inline WYSIWYG and always editable. The roadmap's "Edit/Preview" item is removed because it
contradicts the editor requirement. Raw Markdown source editing was added later by D34.

## D2 — Owner-only sign-in (2026-11-01) — superseded by D22

Only the owner's Google account may use the app. Enforced in Firestore Security Rules
(`request.auth.token.email == <owner email>` and `email_verified == true`, plus `request.auth.uid == uid`).
The client also checks `VITE_OWNER_EMAIL` to sign out other accounts with a clear message; this is UX only,
the rules are the security boundary.

## D3 — BrowserRouter with 404.html fallback (2026-11-01) — superseded by D19

GitHub Pages has no SPA rewrites. Use `BrowserRouter` (`basename` = `import.meta.env.BASE_URL`) and copy `index.html` to `404.html` at deploy time,
so Pages serves the app for any path and the router resolves it. Clean URLs instead of `HashRouter`. The build
reads `BASE_PATH` (`/<repo>/` in CI, `/` locally).

## D4 — Client-side search (2026-11-01)

Firestore has no full-text search. One owner means a small data set, so search runs in the browser over each
note's `title` and derived `plainText`. No external search service.

## D5 — Merged roadmap (2026-11-01)

The six requirement phases are merged into four milestones (see `docs/PLAN.md`). Tags (P1, missing from the
original roadmap) go to M3.

## D6 — Real Firebase only, no emulator or mocks (2026-11-01)

The app connects to the owner's real Firebase project, configured through `.env.local` (template:
`.env.example`). No Firebase Emulator, mock server, or mocked Firebase SDK. Security Rules are verified against
the real project (Firebase Console Rules Playground and manual checks with the owner and a non-owner account).
All verification is manual by the owner; agents do not write automated tests (see Testing policy in `AGENTS.md`).

## D7 — Popup sign-in (2026-11-01)

Use `signInWithPopup`, not `signInWithRedirect`. Redirect sign-in on a domain other than the Firebase Hosting
`authDomain` breaks in browsers that block third-party storage. Since D19 the app is served from the same
Firebase Hosting domain, so redirect would also work; popup stays because it keeps the editor state intact.

## D8 — shadcn/ui generated code (2026-11-01)

shadcn/ui is initialised with the `radix-nova` style and the `cn` package (shadcn's clsx + tailwind-merge
replacement). Files in `src/components/ui/` are generated: ESLint's `react-refresh/only-export-components` is
off there because they export variant helpers next to components.

## D9 — Deleting a book moves its notes to Trash (2026-11-01)

Deleting a book removes the book document and soft-deletes (`deletedAt`) its notes in one batch, so nothing is
lost. Restoring a note whose book no longer exists is handled with Trash in M3.

## D10 — Note content stored as a JSON string (2026-11-01)

`content` holds Tiptap JSON serialized with `JSON.stringify`. Firestore limits nested maps/arrays to 20 levels,
and nested lists or tables in Tiptap JSON exceed that quickly. The string keeps the format Tiptap JSON while
avoiding the depth limit.

## D11 — Realtime listeners into TanStack Query, sorting in the client (2026-11-01)

Books and notes are read with Firestore `onSnapshot` listeners that update the TanStack Query cache
(`src/lib/use-snapshot-query.ts`), so other devices' edits appear live. Note queries use only equality filters
(`bookId`, `deletedAt == null`), which need no composite index; sorting and pinned-first ordering run in the
client. New books and notes get a client-generated id so the UI can navigate before the write is acknowledged.

## D12 — Auto Save and local drafts (2026-11-01)

Each edit is written to a Dexie draft immediately and to Firestore after an 800 ms debounce; failed writes retry
every 5 s and on `online`. The draft is deleted only after Firestore acknowledges a write containing the latest
edit. When a note opens and a draft exists, the draft wins and is saved again (unsaved local text is never
dropped; a newer edit from another device is overwritten in that case). Pending edits flush when the tab is
hidden or the note is closed. Timing, offline behaviour and the overwrite rule are replaced by D32.

## D13 — Paper style per note, typography per user (2026-11-01)

`paperStyle` is stored on each note and drawn as a CSS background on the editor scroll area
(`background-attachment: local`), not aligned to text lines. Lined paper also has a red margin line left of
the text, inside the content column, with extra left padding so the line never crosses text. Font family and size are one setting for all notes,
stored in `users/{uid}/preferences/settings` so they follow the owner across devices.

## D14 — Custom sort with Move up / Move down (2026-11-01) — books: drag added by D24

Books and notes have a numeric `order` (notes created before M3 fall back to `createdAt` in ms). Reordering swaps
the `order` of two neighbors in one batch, from the item menu. It works with mouse, keyboard and touch without a
drag-and-drop dependency; drag can be added later if wanted.

## D15 — Motion with CSS, not the Motion library (2026-11-01)

The required motion (sidebar width, note fade-in, hover colors) is done with Tailwind transitions and
`tw-animate-css` at 150–250 ms, plus a global `prefers-reduced-motion` override. The Motion library is not
installed; add it only if an interaction needs more than CSS.

## D16 — Import/Export formats (2026-11-01)

- JSON backup: all books and all notes outside Trash, with an `app`/`version` header. Import always adds new
  documents with new ids (never overwrites); notes whose book is not in the file are skipped.
- Markdown: per-note export and multi-file import into the current book through `@tiptap/markdown`. A leading
  `# Heading` becomes the title. Text colors have no Markdown form and are dropped; highlights use `==text==`.
- Export file names are lowercase with `-` instead of spaces and symbols (Thai letters kept), e.g. `my-note.md`.
- Imports wait for the Firestore write and always end with a result dialog (count, unreadable files, or the
  error), never silently.

## D17 — Security Rules check paths and shapes (2026-11-01)

Rules allow only `books`, `notes` and `preferences/settings` under `users/{uid}`, and validate field names, types,
enums and size limits on create/update; `createdAt` is immutable. Import code clamps values to the same limits
(title 200, book name 80, 20 tags, known paper styles). Review steps: `docs/SECURITY.md`.

## D18 — Code splitting by route and feature (2026-11-01)

Firestore is initialised in `src/lib/firestore.ts`, apart from Auth in `src/lib/firebase.ts`. The signed-in app
(`AppLayout`), the editor (Tiptap) and the Markdown converter load with `React.lazy` / dynamic `import()`, so
the sign-in screen loads React, the router and Firebase Auth only (~480 kB, ~153 kB gzip; was 1.72 MB).
Manual vendor chunk groups were tried and dropped: Rolldown pulled shared dependencies into them, so the entry
chunk imported them again.

## D19 — Firebase Hosting with manual deploy (2026-11-02) — deploy trigger replaced by D31

Replaces GitHub Pages + GitHub Actions (D3, M1.6). The site is hosted on Firebase Hosting and deployed by the
owner with `firebase deploy --only hosting` from a local machine; the build reads `.env.local`, so no secrets
live in GitHub. `firebase.json` rewrites every path to `index.html` (clean `BrowserRouter` URLs at `/`, no
`basename`, no `404.html` copy) and caches hashed files under `/assets/` for a year; every other path (`index.html` and SPA routes) is
`no-cache`, so a new deploy is picked up on the next load. Rules deploy separately with
`firebase deploy --only firestore:rules`. The GitHub Actions workflow and the
`BASE_PATH` build option were removed.

## D20 — Custom book colors (2026-11-02)

`books.color` is a preset key (`gray` … `pink`) or a custom `#rrggbb` chosen with the native color input.
Presets render with Tailwind classes, custom colors with an inline `color` style (`bookColorStyle`). Rules and
backup import accept only those two forms; anything else falls back to `gray` on import.

## D21 — Note lock is read-only editing, not security (2026-11-02)

`notes.isLocked` makes the editor, title, tags and formatting toolbar read-only until the owner unlocks it, to
prevent accidental edits. Paper style, pin, move and delete stay available. Rules only check it is a boolean
(missing on older notes); they do not block edits to locked notes, because only the owner can write anyway.
Toggling lock does not change `updatedAt`.

## D22 — Any Google account, private data per user (2026-11-02)

Replaces D2. Any Google account can sign in; there is no owner email in the rules, the app or `.env`. Rules
allow a request only when `request.auth.uid` matches the `users/{uid}` path and the sign-in provider is
`google.com`, so each account sees only its own books, notes and settings. Trade-off: strangers who find the URL
can create their own data and use the project's quota. `src/features/auth/owner.ts` and its test are unused and
kept until the owner decides to remove them.

## D23 — Link editing bar and link style (2026-11-02)

Links use Tiptap's Link (from StarterKit) with autolink and link-on-paste. A Tiptap `BubbleMenu`
(`src/features/editor/link-bubble.tsx`) appears above the link under the cursor with Alias, URL, Open in new tab,
Remove (unlink, keep text) and the `⌥Enter` / `Alt+Enter` hint; the same shortcut works in the editor. Only
`http(s):`, `mailto:` and `tel:` links are opened. Links are styled with a `#fff200` tint and underline while the
text keeps the body color (owner chose this over yellow text, which is ~1.1:1 on white). Locked notes are not
editable, so links there open as normal anchors.

Checklists use `TaskList` / `TaskItem` from `@tiptap/extension-list` (nested allowed); `[ ] ` starts one, and
Markdown import/export uses `- [ ]` / `- [x]`.

## D24 — Drag and drop with @dnd-kit (2026-11-02)

One `DndContext` (`src/app/library-dnd.tsx`) spans the Library and Notes columns. Books are sortable; a dropped
book gets the midpoint `order` of its new neighbours (one write, no renumbering; float precision allows many
moves before ties, and ties only fall back to list order). Notes are draggable and drop onto a book under the
pointer to move there. Mouse drags start after 6 px and touch drags after a 250 ms press, so clicks, links and
scrolling keep working. Move up / Move down (books) and Move to (notes) stay in the ⋯ menus as the keyboard and
screen-reader path, so the rows keep their link semantics instead of becoming drag buttons. On mobile the two
columns are separate screens, so moving a note between books uses Move to.

## D25 — Resizable columns without a library (2026-11-02)

Library and Notes widths are set by two splitters (`src/app/resize-handle.tsx`, `role="separator"`): drag, or
←/→ by 16 px, Home/End for min/max, Enter or double-click to reset. Saved widths live in the persisted UI store
(per device, `localStorage`). Limits: Library 180–400 px, Notes 220–520 px. At render, `fitWidths` shrinks
Notes then Library so the editor keeps at least 320 px; saved values stay unchanged. Mobile has no splitters.
`react-resizable-panels` (shadcn Resizable) was not added: two fixed-side columns plus a flexible editor need
only this much.

## D26 — Keyboard save, app right-click menus, shared menu items (2026-11-02)

- Ctrl/⌘+S never triggers the browser's "Save page". With a note open it writes the pending edit at once
  (`saveNow`); with nothing pending the status shows "Saved".
- Right-click on a book row, a note row or the note body opens the app's menu (`AppContextMenu`, Radix Context
  Menu). Right-clicking again while it is open, or within 600 ms after it closed, lets the browser's own menu open
  (spell-check, inspect, etc.). The keyboard Menu key / Shift+F10 opens the app menu too.
- Row actions are written once as a function of a `MenuKit` (`src/components/menu-kit.ts`) and rendered in both
  the ⋯ dropdown and the right-click menu, so the two never drift.
- Note-body menu: Cut, Copy (rich, via the editor's own copy), Paste as text (Clipboard API; needs permission),
  Bold, Italic, Highlight, Link, Checklist, Code block, Select all. Locked notes show Copy and Select all only.
- Accessibility: toolbar and search buttons expose `aria-keyshortcuts` and show the shortcut in their tooltip;
  checklist checkboxes are labelled "To do / Done: <text>".

## D27 — Ctrl/⌘+K is the link shortcut inside the editor (2026-11-02)

Inside the note body Ctrl/⌘+K inserts a link (selection → link, no selection → "link" placeholder) or, when the
cursor is on a link, moves focus to the link bar's URL field; Enter/Esc return to the text. This matches common
editors (Google Docs, Notion). Everywhere else, and in locked notes, Ctrl/⌘+K still opens search: the editor
handles the key first and the global search listener ignores already-handled events. Toolbar Link, right-click
Link / Edit link and the shortcut share `insertOrEditLink` (`src/features/editor/links.ts`). Trash rows also get
the right-click menu (same `MenuKit` items as their ⋯ menu).

## D28 — Toasts with sonner (2026-11-02)

Short, non-blocking feedback uses `sonner` through shadcn's `Toaster` (`src/components/ui/sonner.tsx`). The
generated component used `next-themes`; it now reads the theme from the UI store and `next-themes` was removed.
The `Toaster` is mounted in `AppLayout`, not the app root, so the sign-in bundle stays small (D18). First use:
drag and drop (D24) shows "Moved … to …" with an Undo action, and failures show an error toast. Result dialogs
(`MessageDialog`) stay for imports, where the user should read the outcome.

## D29 — Note count per book, counted in the client (2026-11-02)

The Library shows how many notes (outside Trash) each book has. Counts come from the live `useAllNotes`
listener (the same query search uses), grouped by `bookId`, so they update immediately on create, move, delete
and restore, and need no stored counter, extra writes or rule changes. Trade-off: the signed-in app reads every
non-deleted note once per session (one Firestore read per note, then only changes). If libraries grow large,
switch to a stored `noteCount` or Firestore count aggregation.

## D30 — Mobile bottom menu and Settings screen (2026-11-02)

Below 768 px a fixed bottom menu has Books (`/`), Notes and Settings (`/settings`); it is hidden in the editor to
leave room for writing and the keyboard. Notes opens the last opened book (`lastBookId`, persisted per device)
or, if there is none or it was deleted, `/notes` ("Select a book" + Browse books). Settings is phone-only:
Theme, editor font and size (the synced setting from D13), and a link to Trash; on 768 px and up `/settings`
redirects to `/`, where the sidebar footer and the Aa menu cover the same controls. Account, sign out and backup
stay in the Library footer on every size. Toasts sit above the bottom menu on phones.

## D31 — Deploy from GitHub Actions on push to `production` (2026-11-02)

Replaces D19's manual-only deploy (hosting choice, rewrites and caching from D19 stay). Pushing to `production`
runs `.github/workflows/deploy-production.yml`: install, `pnpm lint`, then `FirebaseExtended/action-hosting-deploy`
to the live channel; `firebase.json`'s `predeploy` does the single `pnpm build`. Build config comes from repository
**variables** (`VITE_FIREBASE_*`, public web config); deploy access comes from the **secret**
`FIREBASE_SERVICE_ACCOUNT_MINOTELY` (JSON key of a service account in project `minotely` with Firebase Hosting
Admin, Firebase Authentication Admin, API Keys Viewer, Cloud Run Viewer and Service Usage Consumer; setup in
`README.md`). Security Rules are still deployed by
hand (`firebase deploy --only firestore:rules`) so a merge cannot change access rules unnoticed. No PR preview
channels. Manual `firebase deploy --only hosting` still works for emergencies.

## D32 — Slower sync, offline editing and a conflict check (2026-11-03)

Replaces D12's timing and "draft wins" rule; drafts stay as in D12. To cut Firestore writes for a writer who
pauses often, a note syncs 30 s after typing stops, at most 5 min after its first unsynced change, and at once on
Ctrl/⌘+S, tab hide, note close and `online`. Every keystroke still goes to the Dexie draft immediately, so the
longer delay does not risk text. While `navigator.onLine` is false nothing is sent (no SDK write queue), so the
check below runs once the network is back. Each sync is a transaction that reads the note and refuses the write if
its title/content match neither the edit's base (last version known to be in Firestore; stored in the draft as
`baseTitle`/`baseContent`, local only) nor the edit itself; content is compared, not `updatedAt`, so tag changes
and our own writes are not conflicts. On a conflict syncing stops and a dialog asks Keep mine (overwrite) or Use
other version (drop the draft). Cost: one read per sync. Out of scope: opening the app offline (needs a service
worker); Firestore persistent cache came later in D33.

## D33 — One notes listener and a persistent Firestore cache (2026-11-03)

Reduces reads from D29's all-notes listener. `useNotes(bookId)` no longer opens its own query; it filters the
`useAllNotes` result in the client, so opening a book costs no reads and each note change is read once, not
once per listener. Firestore uses `persistentLocalCache` with `persistentMultipleTabManager` (IndexedDB, shared
by tabs): listeners show cached data first and a reload re-reads only changed documents while the resume token
is valid (about 30 minutes; after that the query is read again in full). Trade-off: note data stays in this
browser's IndexedDB after sign-out, like Dexie drafts (D12), so the app suits personal devices. The note count
remains client-side; a stored `noteCount` is the next step only if libraries grow to thousands of notes.

## D34 — Raw Markdown editing alongside WYSIWYG (2026-11-06)

The note editor defaults to WYSIWYG and has a Raw Markdown toggle. Both modes edit the same note body; the
title remains a separate field, and content remains a Tiptap JSON string (D10). Opening Raw and returning
without editing preserves the original JSON, including colors and highlights. Once Raw is edited, each change
is parsed into Tiptap JSON and sent through the existing local draft and Auto Save path (D32); switching back
shows the parsed content. Markdown cannot represent text colors or every custom highlight, so editing Raw may
remove those styles. Locked notes are read-only in both modes. The existing import/export converter supplies
the body conversion, with no new stored field or Firestore rule change.

## D35 — Copy rich-text selections as Markdown (2026-11-06)

Inside the WYSIWYG note body, Ctrl/⌘+C and the right-click Copy action serialize the selected Tiptap fragment
to Markdown and write only `text/plain` to the clipboard. This keeps the selected block structure (headings,
lists, links, code blocks) when pasting into a text editor. Copy from the Raw Markdown textarea or note title
uses the browser's native selection. Cut keeps its existing behavior. Markdown cannot represent text colors and
every custom highlight, so those styles are omitted from the copied text.

## D36 — Local English spellcheck in WYSIWYG (2026-11-07)

The WYSIWYG editor uses nspell with the packaged English dictionary. Tiptap Decorations draw spelling errors
without changing the note JSON or triggering Auto Save. The browser's own spellcheck is disabled in WYSIWYG to
avoid duplicate underlines. A right-click on an error offers up to five corrections, Add to dictionary, and
Ignore word above the existing actions. Corrections use a Tiptap transaction and reject a stale word range.
Personal words are kept in localStorage under a key containing the signed-in UID, so they persist across notes
and reloads on this device but do not sync. Ignored words last only until the current note closes. The checker
loads with the editor after sign-in, skips code and URLs/email addresses, and checks only English words. Raw
Markdown and Thai remain outside this first pass; the second right-click still opens the browser menu (D26).

## D37 — Thai dictionary alongside English (2026-11-07)

Extends D36: the WYSIWYG checker now loads separate English and Thai nspell instances because their Hunspell
affix files cannot be combined. `Intl.Segmenter` with Thai word granularity identifies Thai ranges in mixed
text; English tokenization stays as in D36. The Thai `.aff` and `.dic` files are pinned to hunspell-th commit
`a23b0521438f2735dc73efaee61391c6106ae196`. The repository README credits both dictionaries, and the
Thai GPLv3 license is bundled with its files. Personal words remain per account and device, now in separate
language keys; existing English personal words retain their key. Thai segmentation can split a misspelling
into valid smaller words, leaving that typo unmarked. Raw Markdown remains outside the checker.

## D38 — Plain-text Copy in the editor context menu (2026-11-07)

The editor's right-click Copy action now writes selected text with block line breaks to the clipboard, without
Markdown syntax or HTML. The menu label is "Copy as text" and does not show Ctrl/⌘+C as its shortcut because
that keyboard shortcut still copies Markdown (D35). Ctrl/⌘+Alt+Shift+C invokes the same plain-text action
while the WYSIWYG editor has focus; this avoids Chrome's Ctrl/⌘+Shift+C Inspect Element shortcut. The menu
shows the alternate shortcut.

## D39 — Device-local spell check toggle (2026-11-07)

The editor context menu has a checked Spell check item, including for locked notes. It applies to all notes of
the current account on this device and is stored in localStorage under a UID-specific key, defaulting to on.
Turning it off clears Tiptap spelling decorations and suppresses suggestions and background checks; turning it
on checks the open note again. It does not change note content, Firestore settings, or personal dictionary words.
