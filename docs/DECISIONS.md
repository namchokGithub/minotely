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
Automated tests cover only logic that runs without Firebase (debounce, drafts, `plainText`, search, sorting,
import/export).

## D7 — Popup sign-in (2026-11-01)

Use `signInWithPopup`, not `signInWithRedirect`. Redirect sign-in on a domain other than the Firebase Hosting
`authDomain` (here GitHub Pages) breaks in browsers that block third-party storage.

## D8 — shadcn/ui generated code (2026-11-01)

shadcn/ui is initialised with the `radix-nova` style and the `cn` package (shadcn's clsx + tailwind-merge
replacement). Files in `src/components/ui/` are generated: ESLint's `react-refresh/only-export-components` is
off there because they export variant helpers next to components.
