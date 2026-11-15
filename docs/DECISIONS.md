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

`paperStyle` is stored on each note and drawn as a CSS background on the page column (the centred block, 768px wide by default and set by D45, that
holds the text; since 2026-11-15, before that on the whole editor scroll area), so lines stop at
the page edges; not aligned to text lines. Lined paper also has a red margin line left of
the text (Margin paper, added 2026-11-15, is that line on a plain background), inside the content column, with extra left padding so the line never crosses text. Font family and size are one setting for all notes,
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

## D40 — Lined paper: text sits on the ruled lines (2026-11-15)

Changes D13 for Lined paper only; other paper styles stay a background that text does not follow. Under
`.paper-lined` one row is `--paper-row` (2rem) and every block is a whole number of rows: body, lists, checklists,
headings and the Raw Markdown textarea use a 2rem line height; gaps between blocks are zero, with one empty row
above headings and below the tags; the title takes two rows; code blocks add one row of padding; `hr` is centred
in one row; table borders are drawn as box shadows so they add no height. Inline code gets `line-height: 1`,
because its smaller monospace box otherwise makes a row 1px taller and everything below drifts. The ruled lines
are shifted up 5px so they sit just under the text baseline. Small, Medium and Large text share the 2rem row.
These rules are unlayered CSS in `src/index.css` so they override the utility classes on the title, tags and
textarea.

## D41 — Pasted Markdown becomes rich text (2026-11-15)

Pasting plain text that looks like Markdown into the WYSIWYG editor converts it with the same `MarkdownManager`
as import and Raw mode, through ProseMirror's `clipboardTextParser`. This also closes the loop with D35: text
copied from a note (Markdown on the clipboard) pastes back with its formatting. "Looks like Markdown" is a list
of patterns in `paste-markdown.ts` (heading, list, quote, code fence, table separator, rule, bold, strike,
highlight, inline code, link); plain prose without them pastes as before, because parsing everything as Markdown
would join multi-line text into one paragraph. Not converted: clipboard content with HTML (normal rich paste),
Ctrl/⌘+Shift+V, pastes inside a code block, and a bare URL (still becomes a link). The context menu's Paste calls
the same parser (`view.pasteText` alone is always plain), so it follows the same rules. The detection is a heuristic; Undo or Ctrl/⌘+Shift+V gives the
raw text.

## D42 — Version history kept on the device (2026-11-15)

First step of Version History, deliberately local: versions live in the Dexie table `versions` (title, Tiptap
JSON, kind `auto` | `manual`, created time, per `uid`), not in Firestore, so there are no reads, writes, rules or
backup changes. Consequences: history is per browser, is lost when site data is cleared, stays after sign-out
like drafts (D12), and is not in the JSON backup.

- **Auto:** on the first edit after a note opens, the content it had before the edit is kept if the newest
  version does not already hold it; after that, a successful sync is kept at most once per 10 minutes. Only
  synced content is stored, never an unsynced draft.
- **Manual:** Save version (in the dialog) syncs pending edits first and stores what Firestore now holds; it
  refuses and says why when offline, on a sync error, or while a conflict (D32) is open.
- **No duplicates:** nothing is stored when the newest version has the same title and content (a Manual version
  of content that only an Auto version holds is still stored), or when the note is empty.
- **Retention:** 10 Auto and 10 Manual per note; the oldest of the same kind is dropped.
- **Timeline:** History button in the note header opens a dialog, newest first, with a read-only Tiptap preview.
  There is no restore; the owner copies from the preview.
- **Cleanup:** deleting a note forever or emptying Trash deletes its versions. Versions of notes deleted forever
  on another device are removed when the Trash page opens, where the live and trashed note lists together name
  every existing note; skipped offline or when both lists are empty, because a cold cache could look like that.

Moving history to `users/{uid}/notes/{noteId}/versions` (rules, backup, cross-device) is the later step.

## D43 — Custom background around the page, per device (2026-11-15)

The page column (D13) keeps the theme color; the area around it can be customised: a color, an image by `https`
URL (drawn over the color, `cover`, fixed while the page scrolls), an opacity (0–100%) and a darker/lighter level
(-100 black to +100 white, drawn as a flat overlay so it works for colors and images alike). Default is nothing
set: the theme color, as before. It is one setting for all notes, stored in `localStorage` under
`minotely:page-background:{uid}`, so there is no Firestore field, rule or backup change and it does not follow
the owner to other devices. The controls are a non-modal dialog opened from Page appearance → Background…, with
no overlay, so changes show at once. The Page appearance items (paper, font, size, Background…) are one list
(`AppearanceItems`, D26) shown by the header button and by a right-click on the background around the page;
right-clicks on the page itself keep the editor menu or the browser menu. The dialog opens only after the menu
has closed, because a closing menu moves focus and a non-modal dialog closes when focus leaves it. Only `https:` URLs that parse are accepted and the stored value is
re-validated on read; the image is loaded from that site on every open, which tells the site the visitor's IP.
The app has no file storage, so there is no upload. Below 768px the page fills the width and the background is
not visible.

## D44 — Side columns collapse to a rail (2026-11-15)

On 768px and up the Library and Notes columns each collapse on their own, so the editor can take the width. The
control is the column's own title: clicking "Minotely" (logo and name) collapses Library; clicking the book
name (or "Trash") collapses Notes. A collapsed column is not hidden but becomes a 48px rail with one icon
button (the logo, or the open book's icon) that expands it again; a fully hidden column would take its own
control away with it. The Library rail also lists every book as its icon, in Library order, then Trash: a click
opens that book without expanding the column, and the native `title` tooltip shows the name (the accessible name
adds the note count). Notes cannot be dropped on rail icons; expand the Library to move a note by drag and drop. State is in the persisted UI
store (`booksSidebarOpen`, `notesPanelOpen`), per device. The panel stays mounted while collapsed (`md:hidden`)
so dialogs, drag and drop and listeners keep their state, and phones, which show one screen at a time, always
show the full panel. `fitWidths` (D25) counts a collapsed column as the rail width and hides its splitter.
Tablet still folds Library automatically while a note is open, now to the rail; the tablet-only toggle button
in the Notes header is gone because the title does the same. No keyboard shortcut.

## D45 — Page width presets, a per-device preview (2026-11-15)

The page column's maximum width can be set like a paper size: Default (768px, as before), A5 (148mm), A4
(210mm), Letter (8.5in), A3 (297mm) and Full (90% of the editor area). Sizes are CSS physical units, so they
match a word processor at 100% zoom (96px per inch); the width includes the page's own side padding and the
Lined/Margin red line. Length is never limited and there are no page breaks. When the editor area is narrower
than the preset, the page shrinks to fit instead of scrolling sideways. It is a preview, not a note property:
one value for all notes, `pageWidth` in the persisted UI store on this device, so no Firestore field, rule or
backup change. The menu group is "Page width (this device)" in Page appearance (header button and the
right-click menu on the background, D43/D44).

## D46 — Note icon (2026-11-15)

A note can have one icon, shown before its title in the editor, the note list, search, Trash and the phone
header. It is an emoji or symbol, not a Lucide icon like books, so it reads as the note's own mark (Notion-like)
and needs no color. Stored as optional `icon` (string, "" for none) on the note; notes and backups made before
this have none. `toNoteIcon` keeps only the first grapheme when it is not a letter, digit or space, at most 16
UTF-16 units; rules accept a string up to 16 characters. Setting it does not bump `updatedAt` (like paper style)
and is not part of the content conflict check (D32) or version history (D42). The picker is a dropdown with 32
suggested emojis, a field to type or paste any emoji, and Remove. No emoji library was added. On Lined paper the
icon and title share the two-row title band (`.note-title-row`, D40).

## D47 — Table of Contents (Document Outline) (2026-11-15)

Called `DocumentOutline` in code and "Table of Contents" in the UI. It lists the open note's H1–H3 headings (empty
headings skipped), read from the editor state, so it follows edits at once and costs no reads. Collapsed it is a
column of short bars (width by level, at most 40) fixed at the top right of the editor area, outside the page so
it does not scroll or take page width. Hover or keyboard focus shows the list; clicking the bars pins it open
until a click outside, Escape or choosing a heading. Choosing a heading scrolls to it (smooth unless reduced
motion) and puts the cursor there. Shown on 768px and up in rich-text mode only; hover does not exist on touch
and phones have no room. No current-heading highlight yet.

## D48 — Notion-like blocks in the editor (2026-11-15)

Blocks are still Tiptap/ProseMirror nodes; there is no separate block model. One list of block types
(`block-types.ts`: Text, Heading 1–3, Bulleted, Numbered, Checklist, Quote, Callout, Code block, Table, Divider;
no Image until there is file storage) feeds every entry point:

- **`/` menu:** `@tiptap/suggestion` with a small store and a React list; `/` at a line start or after a space,
  not in code blocks; type to filter, arrows, Enter/Tab, Escape.
- **Callout:** a `callout` node (`content: block+`) drawn with a 💡 mark in CSS. Markdown is Tiptap's Pandoc-style
  `:::callout` … `:::`, so Raw mode, copy, paste (D41 sign added) and export keep it; `!> ` at a line start makes
  one. On Lined paper its padding adds one row (D40).
- **Floating toolbar:** a BubbleMenu on a non-empty text selection with the top toolbar's text controls (Bold,
  Italic, Color, Highlight, Link); hidden on links (link bar, D23), in code blocks and on a selected block.
- **Block Controls:** beside the top-level block under the pointer (by vertical position, so the gutter counts),
  `+` inserts an empty paragraph below (Alt/⌥ above) with `/` typed, which opens the `/` menu; `⠿` drags the block
  (`block-drag.ts`, below), or on click opens the Block Action Menu:
  Duplicate, Turn into (unwraps, then applies the type), Move to (appends the block to another note through the
  checked transaction of D32, then removes it here; refused offline or on a conflict), Copy link to block, Delete.
  Each line of a list (bullet, numbered or checklist item, at any depth) is its own block: the controls sit
  left of its marker, dragging moves the line with the lines nested under it, `+` adds an empty line to the same
  list, Turn into converts only that line (splitting the list), Delete of a list's last line removes the list,
  Move to sends it as a one-line list of the same kind, and its link uses its first paragraph's id. Other blocks
  are handled whole. While dragging, the block stays in place at 40% opacity, the pointer carries a copy on the
  page color with a shadow, and Dropcursor draws a 3px blue line where it will land (`.block-drop-cursor`).
  Handle drags do not use ProseMirror's own drop: it deletes whatever is selected at drop time (so a moved
  selection duplicated the block) and drops a list line between paragraphs by splitting the paragraph (empty
  rows). `BlockDragDrop` instead lands every drop on a block or list-line boundary (before or after by the
  pointer's half), deletes exactly the dragged node (its list too when it was the last line), converts a line to
  the kind of list it lands in, wraps a line dropped between other blocks in a one-line list of its old kind,
  ignores drops onto itself, and keeps block ids. It draws its own blue line; the editor's drop cursor stays for
  text drags only.
  768px and up with a fine pointer only. `@tiptap/extension-drag-handle` was not used: its
  peer dependencies bring in Yjs collaboration packages.
- **Block ids:** `@tiptap/extension-unique-id` gives every block type a `data-id`. Ids generated when an older note
  opens are not treated as an edit (no write); they are saved with the next change, or at once by Copy link to
  block. A link is `/books/{bookId}/notes/{noteId}#block-{id}`; opening it scrolls to the block and flashes it.
- **Code block color:** presets Default, Dark, Sepia, Blue, Green (light and dark variants) in Page appearance,
  per device in the UI store, like page width (D45).
- Markdown shortcuts already existed as input rules; none were added besides `!> `.

## D49 — Nested pages (sub-pages) (2026-11-15)

Design: `docs/superpowers/specs/2026-11-15-nested-pages-design.md`. A note can have one parent note in the same
book, stored as optional `parentId`; top-level notes have no key (it is removed with `deleteField()`, never
written as null, so the app keeps working before the Rules that allow it are published). The tree is built in
the client from the live notes already loaded (D33) by `src/features/notes/tree.ts`; no extra reads. Only an
**effective** parent counts: it must exist among the same list, be in the same book, not form a cycle, and keep
the note within 3 levels; otherwise the note shows at the top level, so bad data never hides a note. Rules check
the type, size and that a note is not its own parent; cycles and depth are app rules.

- Notes column: a tree with ▸/▾ per note that has sub-pages (collapsed state per device in the UI store); a tag
  filter shows a flat list with paths. Custom order (Move up/down) works among siblings.
- Menus (⋯ and right-click, D26): Add sub-page (up to level 3), Move into… (same book, not into itself or its
  sub-pages, within depth), Move to top level.
- Branches: moving to another book (menu or drag onto a book, with Undo) moves the note and its sub-pages; the
  note becomes top level there. Delete sends the branch to Trash with one shared `deletedAt` (`serverTimestamp()`
  in one batch; a client time when over one batch). Restore brings back the sub-pages deleted with it; Restore
  to another book also clears the note's parent. A restored note whose parent is still in Trash shows at the top
  level and re-nests when the parent comes back.
- Editor: a breadcrumb above the title. Sub-pages appear in the content as Page lines (D50). Lined paper keeps both on the rows (D40).
- Search and Trash show the page path. JSON backup exports `parentId` and import remaps it to the new ids in two
  passes, dropping parents that would break the rules above. Markdown import creates top-level notes.

## D50 — Sub-pages as Page lines in the content (2026-11-15)

Replaces D49's Sub-pages section below the note. A sub-page appears in its parent's content as a `pageLink`
block: one line with the page's icon and its title in an editable field. The block stores the page id, plus its
book and a title snapshot used only for Markdown, search text and when the page is missing; the line always
shows the page's live title, and typing in it renames the page (after 600 ms or on leaving the field) through
the checked transaction of D32; refused offline or on a conflict. The snapshot is refreshed when the title
changes, as a non-edit transaction (saved with the next real change, like block ids). The tree is still
`parentId` (D49); a Page line is an entry point, not the structure.

- `/` → Sub-page creates the page, puts its line at the cursor and focuses its name. Add sub-page and Move into…
  in the Notes column add a line at the end of the parent: through the parent's open editor when it is open
  (`requestPageLink`, so Auto Save writes it and no conflict appears), otherwise as a direct checked write;
  not for locked parents.
- Deleting a line leaves the page (it stays in the Notes column); Backspace in an empty name removes the line.
  Pages without a line are shown only in the Notes column. Copying or moving a line elsewhere keeps it a link to
  the same page; it does not change the page's parent. A line whose page is gone shows its last title crossed out.
- Icon click or Ctrl/⌘+Enter opens the page; Enter moves below the line.
- Markdown: `[Title](<origin>/books/{bookId}/notes/{pageId})` on its own line; a tokenizer turns such a line back
  into a Page line, so Raw mode, copy and paste keep it. Lined paper: one row.
