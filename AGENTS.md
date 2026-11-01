# AGENTS.md

Instructions for AI coding agents working in the 1-in-48000 ("1 ใน 48,000") repository. Applies to any agent/tool (Claude Code, Codex, Cursor, etc.). Claude Code additionally reads `CLAUDE.md`, which only points back to this file.

## Project Summary

## Tech Stack

## Commands

```bash
pnpm install       # install dependencies
pnpm dev           # run Player at / and BO at /content-manage locally
pnpm build         # production build (Player only)
pnpm test          # run Vitest
pnpm lint          # run ESLint
pnpm exec prettier --write <files>
```

## Project Structure

## Architecture Rules

## Working Conventions

- **Agent collaboration and approval:** Think independently to understand the task, identify risks, and prepare a recommendation, but present that recommendation and wait for explicit approval before making changes, executing a plan, or taking an external action. Do not decide and act beyond the user's explicit scope.
- If work cannot be completed safely or clearly—because requirements, authority, access, consequences, or a technical constraint are unclear—ask first. Do not force a workaround that changes scope or assumptions.
- Ask for help, request clarification, or use available collaboration when it would improve confidence; do not carry uncertainty alone.
- State the relevant fact and ask the next useful question rather than repeatedly apologizing. Confirmation is more useful than an apology.
- Don't add features, refactors, or abstractions beyond what's asked. This project favors small, focused, calm implementations (see README "Development Principles").
- When adding a new content concept (e.g. a new condition or effect type), add the Zod schema in `src/content/`, the engine handling in `src/engine/`, BO support in `src/features/bo/`, and tests — don't skip layers.
- **Testing policy:** Do not create or update automated tests for UI-only work (visual styling, layout, presentation components, or page appearance); the user performs that verification manually. Add automated tests for engine, content schema/validation, save/load, migration, and other non-visual logic. Focus on conditions, choices, delayed effects, saves, and endings. Only change a UI test when the user explicitly asks for it or a UI change also changes non-visual behavior.
- **UI-only changes — verification checklist:**
  1. Do not write or update tests.
  2. Do not run `pnpm test` (full or focused), `pnpm build`, or `tsc -b`.
  3. Do not start the dev server or drive a browser (Playwright, Chrome automation) unless the user asks.
  4. Run only Prettier and ESLint on the touched files, e.g. `pnpm exec prettier --write <files>` and `pnpm exec eslint <files>`.
  5. Hand off: tell the user what to check by eye (pages, widths such as 360px and 1280px, states), and name any existing test that may break because visible text or markup changed.
- For logic, content-schema, or save changes, run the focused test command(s) that cover the changed behavior. Do not run the full `pnpm test` suite by default; remind the user to run `pnpm test` locally instead.
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
5. Include scope if identifiable (e.g., engine, content, save, player, bo, audio).
6. If Jira keys appear in the diff, include them after the scope.
7. Keep subject line concise (<= 100 chars).
8. Focus on business impact, not syntax noise.
9. Ignore whitespace-only or formatting-only changes.

Output format: feat(feature_name): short summary

Example:
fix(save): keep RNG results in save so reloading never changes event outcomes
```
