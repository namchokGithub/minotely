# Minotely MVP Plan

Source: `docs/REQUIREMENT-V1.md`. The six roadmap phases are merged into four
milestones. Status lives in `docs/PROGRESS.md`; architectural choices live in
`docs/DECISIONS.md`.

| Milestone              | Merged from                        | Why merged                                                       |
| ---------------------- | ---------------------------------- | ---------------------------------------------------------------- |
| M1 Foundation & Deploy | Phase 1 + deploy part of Phase 6   | Ship the pipeline first; catch Pages / SPA routing issues early. |
| M2 Core Notebook       | Phase 2 + 3 + sync part of Phase 5 | Auto Save needs the editor; drafts and sync status are its core. |
| M3 Reading & Data      | Phase 4 + rest of Phase 5 + Tags   | Features over the same data, no dependency between them.         |
| M4 Hardening & Release | Rest of Phase 6                    | Final verification before release.                               |

Baseline already done: Vite + React 19 + TypeScript + Tailwind CSS v4 + ESLint + Prettier.

## M1 — Foundation & Deploy

1. Dependencies: React Router, shadcn/ui + Radix UI, Lucide React, Zustand, TanStack Query, Vitest. (Firebase SDK + config already added.)
2. Theme tokens with Light/Dark support (CSS variables, Tailwind v4 `@theme`).
3. Responsive shell:
   - Desktop: 3 columns — Books / Notes / Editor.
   - Tablet: collapsible Books sidebar + Notes + Editor.
   - Mobile: one screen at a time, Books → Notes → Editor, clear Back button.
4. Routing: `BrowserRouter` with `basename` from `import.meta.env.BASE_URL`, `404.html` fallback for GitHub Pages.
   Routes: `/login`, `/books/:bookId`, `/books/:bookId/notes/:noteId`.
5. Firebase Authentication: Google Sign-in, owner-email allowlist, route guard, sign-out.
6. GitHub Actions: build and deploy to GitHub Pages on push to branch `production` only.

Done when: the owner signs in and sees the empty layout on the deployed URL; any other Google account is rejected.

## M2 — Core Notebook

1. Firestore data layer under `users/{uid}/…` (schema in requirement), TanStack Query hooks per feature.
2. Firestore Security Rules: `request.auth.uid == uid` and owner email verified. Verified against the real Firebase project (no emulator, no mocks) — see D6.
3. Books: Create, Rename, Delete (confirmation), Color + Icon picker, `order`.
4. Notes: Create, Delete (soft delete via `deletedAt`, confirmation), Move to another Book, Pin.
5. Sorting: Updated, Created, A–Z.
6. Tiptap editor (inline WYSIWYG, always editable, no Edit/Preview toggle): Markdown shortcuts, Heading, List,
   Table, Code Block, Bold, Italic, Highlight, Text Color. Store Tiptap JSON; derive `plainText` on save.
7. Auto Save: debounce, Saving / Saved / Error status, local draft in Dexie (IndexedDB), draft recovery after failed save or device switch.

Tests: save debounce, draft recovery, `plainText` derivation.

Done when: notes are usable day to day and typed text is never lost.

## M3 — Reading & Data

1. Paper Styles: Lined, Grid, Plain, Dotted — editor background only, text not snapped to lines.
2. Typography settings.
3. Search: Title and Content, client-side over cached `plainText`.
4. Tags: add/remove tags on a Note, filter by tag.
5. Motion: sidebar open/close, note switch, hover; 150–250 ms; respects `prefers-reduced-motion`.
6. Mobile polish.
7. Trash: restore, permanent delete.
8. Import/Export: Markdown and JSON.
9. Custom sort (drag to reorder).

Tests: search matching, tag filter, trash restore, import/export round-trip.

## M4 — Hardening & Release

1. Performance: code-split Tiptap, check bundle size.
2. Accessibility: full keyboard use, focus states, contrast.
3. Security Rules review against the real project.
4. Release to `production`.

## Post-MVP (P2)

Offline Mode (full), Version History, Keyboard Shortcuts.
