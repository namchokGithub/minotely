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

## D3 — BrowserRouter with 404.html fallback (2026-11-01)

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
`authDomain` (here GitHub Pages) breaks in browsers that block third-party storage.

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
