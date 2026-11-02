# Decisions

Non-obvious architectural choices. Newest last.

## D1 — No Edit/Preview toggle (2026-11-01)

The editor is inline WYSIWYG and always editable. The roadmap's "Edit/Preview" item is removed because it
contradicts the editor requirement. No raw Markdown source editing.

## D2 — Owner-only sign-in (2026-11-01)

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
hidden or the note is closed.

## D13 — Paper style per note, typography per user (2026-11-01)

`paperStyle` is stored on each note and drawn as a CSS background on the editor scroll area
(`background-attachment: local`), not aligned to text lines. Font family and size are one setting for all notes,
stored in `users/{uid}/preferences/settings` so they follow the owner across devices.

## D14 — Custom sort with Move up / Move down (2026-11-01)

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

## D19 — Firebase Hosting with manual deploy (2026-11-02)

Replaces GitHub Pages + GitHub Actions (D3, M1.6). The site is hosted on Firebase Hosting and deployed by the
owner with `firebase deploy --only hosting` from a local machine; the build reads `.env.local`, so no secrets
live in GitHub. `firebase.json` rewrites every path to `index.html` (clean `BrowserRouter` URLs at `/`, no
`basename`, no `404.html` copy) and caches hashed files under `/assets/` for a year. Rules deploy separately with
`firebase deploy --only firestore:rules` after `OWNER_EMAIL` is replaced. The GitHub Actions workflow and the
`BASE_PATH` build option were removed.
