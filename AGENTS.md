# AGENTS.md

Instructions for AI coding agents working in the Minotely repository. Applies to any agent/tool (Claude Code, Codex, Cursor, etc.). Claude Code additionally reads `CLAUDE.md`, which only points back to this file.

## Project Summary

Minotely is a private notebook web app for one owner: `Library → Books → Notes`, an inline WYSIWYG editor with live Markdown shortcuts, paper-style backgrounds, reliable Auto Save, and cross-device sync. Requirements: `docs/REQUIREMENT-V1.md`. Plan: `docs/PLAN.md`.

## Tech Stack

React + Vite + TypeScript, Tailwind CSS v4, shadcn/ui + Radix UI, Tiptap, Motion, Lucide React, React Router, TanStack Query (server state), Zustand (UI state), Firebase Authentication (Google), Cloud Firestore, Dexie (IndexedDB), Vitest, GitHub Pages + GitHub Actions. Package manager: `pnpm`.

Libraries beyond the Vite/Tailwind baseline are added per milestone (see `docs/PROGRESS.md`); do not assume one is installed until it is in `package.json`.

## Commands

```bash
pnpm install       # install dependencies
pnpm dev           # run the app locally
pnpm build         # type-check and production build
pnpm test          # run Vitest (available once M1 adds it)
pnpm lint          # run ESLint
pnpm exec prettier --write <files>
```

## Project Structure

Target layout (create folders when first needed):

```
src/
  app/              # router, providers, layout shell
  components/ui/    # shadcn/ui components
  features/
    auth/  books/  notes/  editor/  search/  trash/  settings/
  lib/
    firebase.ts     # Firebase app, auth, firestore init (real project via .env.local)
    db.ts           # Dexie (drafts, cache)
  stores/           # Zustand UI stores
firestore.rules
.github/workflows/  # deploy on branch `production`
```

## Architecture Rules

- All user data lives under `users/{uid}/…` in Firestore (schema in `docs/REQUIREMENT-V1.md`).
- Firestore Security Rules are the security boundary: owner email allowlist + `request.auth.uid == uid`. Client checks are UX only (D2 in `docs/DECISIONS.md`).
- Firebase connects to the real project only. Do not add the Firebase Emulator, mock servers, or mocked Firebase SDKs (D6). Config comes from `.env.local` (template: `.env.example`).
- Components do not call Firestore directly. Each feature exposes data access through its own module and TanStack Query hooks.
- Server data lives in TanStack Query; Zustand holds UI state only (sidebar, selection, filters).
- Note content is stored as Tiptap JSON. `plainText` is derived from it on save and used for search.
- The editor is always-editable inline WYSIWYG. No Edit/Preview toggle, no raw Markdown source editor (D1).
- Notes are soft-deleted with `deletedAt`; Trash restores or permanently deletes.
- Auto Save debounces writes, shows Saving / Saved / Error, and keeps a local draft in Dexie until the write succeeds.
- Paper Style is an editor background only; text is not snapped to lines.
- Motion stays at 150–250 ms and respects `prefers-reduced-motion`.
- Routing uses `BrowserRouter` with `basename` from `import.meta.env.BASE_URL` and a `404.html` fallback for GitHub Pages (D3).

## Working Conventions

- **Agent collaboration and approval:** Think independently to understand the task, identify risks, and prepare a recommendation, but present that recommendation and wait for explicit approval before making changes, executing a plan, or taking an external action. Do not decide and act beyond the user's explicit scope.
- If work cannot be completed safely or clearly—because requirements, authority, access, consequences, or a technical constraint are unclear—ask first. Do not force a workaround that changes scope or assumptions.
- Ask for help, request clarification, or use available collaboration when it would improve confidence; do not carry uncertainty alone.
- State the relevant fact and ask the next useful question rather than repeatedly apologizing. Confirmation is more useful than an apology.
- Don't add features, refactors, or abstractions beyond what's asked. This project favors small, focused, calm implementations.
- When adding a new stored field or document type, update the TypeScript type and data module in `src/features/<feature>/`, `firestore.rules`, and the schema in `docs/REQUIREMENT-V1.md` — don't skip layers.
- **Testing policy:** Do not create or update automated tests for UI-only work (visual styling, layout, presentation components, or page appearance); the user performs that verification manually. Add automated tests for non-visual logic that runs without Firebase: Auto Save/debounce, draft recovery, `plainText` derivation, search, sorting, trash, and import/export. Only change a UI test when the user explicitly asks for it or a UI change also changes non-visual behavior.
- **UI-only changes — verification checklist:**
  1. Do not write or update tests.
  2. Do not run `pnpm test` (full or focused), `pnpm build`, or `tsc -b`.
  3. Do not start the dev server or drive a browser (Playwright, Chrome automation) unless the user asks.
  4. Run only Prettier and ESLint on the touched files, e.g. `pnpm exec prettier --write <files>` and `pnpm exec eslint <files>`.
  5. Hand off: tell the user what to check by eye (pages, widths such as 360px and 1280px, states), and name any existing test that may break because visible text or markup changed.
- For logic, data, rules, or save changes, run the focused test command(s) that cover the changed behavior. Do not run the full `pnpm test` suite by default; remind the user to run `pnpm test` locally instead.
- **Build verification:** Do not run `pnpm build` by default for small, isolated work that touches only a few files, and never for UI-only changes. Run it only when the change's risk warrants it, the user requests it, or it materially validates the work; otherwise, tell the user that they can build locally.
- For a multi-step implementation plan, when a build is warranted, run `pnpm build` once during final verification—not after each step.
- Record non-obvious architectural choices in `docs/DECISIONS.md`, not as scattered code comments. Update the authoritative topic document when a decision changes its model or policy.
- Track detailed implementation status in `docs/PROGRESS.md`. Read its
  **Open work index** (every item not `Done`) first and open only the section
  you need; when a status changes, update the item's row and keep the index in
  sync. `README.md` carries the high-level MVP/post-MVP overview; keep its
  summary and roadmap aligned with material status changes.
- Log completed non-UI units of work by appending a short entry to the current month's file, `docs/log/YYYY-MM.md` (rules in `docs/COMPLETE-LOG.md`). Do not update the completion log for UI-only visual, layout, or presentation changes. Do not read earlier months to add an entry.

## Git Commit Message

- Before making any change, present the proposed scope and wait for explicit user approval. This applies even to clear, small, low-risk, or cosmetic changes.
- Ask before proceeding whenever scope is ambiguous, an action is destructive or irreversible, adds dependencies, changes external services, affects data outside the workspace, or cannot be completed as requested.
- After completing code changes:
  - Summarize what changed.
  - List important files changed.
  - Mention any remaining concerns or follow-up work.
  - Suggest a concise Git commit message based on the actual changes.
  - Use Conventional Commits format when appropriate.
  - Never run `git commit` unless explicitly requested.
- Never add AI/agent attribution to commits, tags, pull requests, or release notes (for example `Co-Authored-By: Claude …` or "Generated with …"). GitHub counts co-author trailers as repository contributors, and a pushed trailer cannot be removed without rewriting history.
- Never run `git push` (branches, tags, or `--force`) or create a GitHub Release. Prepare the commit or tag locally, then hand the user the exact push/release command to run.

```
You are a senior software engineer reviewing git changes.

Your task:
Generate a high-quality commit message based ONLY on the relevant git changes.

Rules:

1. If staged changes exist (git diff --cached), use ONLY staged changes.
2. If no staged changes exist, use the regular git diff.
3. Never mix staged and unstaged changes.
4. Use Conventional Commit format.
5. Include scope if identifiable (e.g., auth, books, notes, editor, sync, search, ui, deploy, docs).
6. If Jira keys appear in the diff, include them after the scope.
7. Keep subject line concise (<= 100 chars).
8. Focus on business impact, not syntax noise.
9. Ignore whitespace-only or formatting-only changes.

Output format: feat(feature_name): short summary

Example:
fix(sync): keep local draft until Firestore write succeeds so typed text is never lost
```
