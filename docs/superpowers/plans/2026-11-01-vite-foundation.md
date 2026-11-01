# Vite Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a minimal, runnable React + TypeScript application foundation for Minotely without implementing any product roadmap features.

**Architecture:** Use Vite's React TypeScript SWC template as the application shell. Add Tailwind CSS v4 through its Vite integration, retain ESLint supplied by the template, and provide Prettier as the repository formatter. The starter screen stays intentionally generic; it must not introduce layout, routing, data, or application behavior.

**Tech Stack:** pnpm, Vite, React, TypeScript, SWC, Tailwind CSS v4, ESLint, Prettier.

**Spec:** `docs/REQUIREMENT-V1.md` and the approved foundation design in this conversation.

## Global Constraints

- Install only Vite/React/TypeScript/SWC, Tailwind CSS v4, ESLint, and Prettier tooling.
- Do not add routing, Firebase, authentication, Tiptap, shadcn/ui, TanStack Query, Zustand, or product UI.
- Do not write automated tests, run `pnpm test`, run `pnpm build`, or start a development server for this UI/foundation-only task.
- Format and lint only the files created or changed by this work.
- Keep the existing `.gitignore` entries and add standard Node/Vite generated artifacts.

## Review Focus

- A new clone can run `pnpm install` without manually choosing a package manager or resolving missing project files.
- `pnpm dev` starts the Vite application from the repository root.
- Tailwind utility classes compile through the Vite plugin rather than a deprecated PostCSS-only setup.
- ESLint and Prettier can run without conflicting configuration or ignoring source files unintentionally.
- No roadmap dependency or feature is installed as part of this baseline.

---

### Task 1: Scaffold the Vite React application

**Files:**

- Create: `package.json`
- Create: `pnpm-lock.yaml`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/index.css`
- Create: `src/assets/react.svg`
- Create: `public/vite.svg`
- Modify: `.gitignore`

**Interfaces:**

- Produces: the root-level `dev`, `build`, `lint`, and `preview` scripts expected by `AGENTS.md`.

- [ ] **Step 1: Generate the `react-swc-ts` Vite template in the repository root using pnpm**

Use the official Vite template without installing any Roadmap dependencies.

- [ ] **Step 2: Preserve the template's TypeScript, Vite, and ESLint configuration and extend `.gitignore`**

Keep `.vscode/settings.json` and `.DS_Store`; add `node_modules`, Vite build output, local environment files, and cache artifacts.

- [ ] **Step 3: Install the generated dependencies with pnpm**

Run: `pnpm install`

Expected: a `pnpm-lock.yaml` is created and dependencies resolve successfully.

### Task 2: Configure Tailwind v4 and Prettier

**Files:**

- Modify: `package.json`
- Modify: `vite.config.ts`
- Modify: `src/index.css`
- Modify: `src/App.tsx`
- Create: `.prettierrc.json`
- Modify: `.gitignore`
- Modify: `pnpm-lock.yaml`

**Interfaces:**

- Consumes: Vite's React configuration from Task 1.
- Produces: Tailwind CSS v4 utilities available from `src/index.css`, and `pnpm exec prettier --write <files>` formatting behavior.

- [ ] **Step 1: Install Tailwind CSS v4 and its Vite plugin, plus Prettier**

Add `tailwindcss`, `@tailwindcss/vite`, and `prettier`; do not install component libraries or application dependencies.

- [ ] **Step 2: Register `@tailwindcss/vite` in `vite.config.ts` and import Tailwind in `src/index.css`**

Use the Tailwind v4 Vite integration and the CSS import form `@import "tailwindcss";`.

- [ ] **Step 3: Replace the Vite demo visual treatment with a minimal neutral shell in `src/App.tsx` and `src/index.css`**

Keep this as a static foundation marker only: no app layout, navigation, domain copy, state, or route behavior.

- [ ] **Step 4: Add `.prettierrc.json` with repository-neutral formatting defaults**

Use Prettier defaults unless a value is necessary to avoid ambiguity; do not add a Prettier lint integration.

### Task 3: Validate the installed foundation

**Files:**

- Modify: only formatter changes to files listed in Tasks 1–2, if required.

**Interfaces:**

- Consumes: the Vite, Tailwind, ESLint, and Prettier configuration from Tasks 1–2.
- Produces: a formatted, lint-clean repository foundation.

- [ ] **Step 1: Format all files created or changed by this plan**

Run: `pnpm exec prettier --write package.json vite.config.ts src/main.tsx src/App.tsx src/index.css .prettierrc.json .gitignore`

Expected: Prettier reports each target as written or unchanged.

- [ ] **Step 2: Lint the application source files**

Run: `pnpm exec eslint src/main.tsx src/App.tsx`

Expected: exit status 0 with no lint errors.

- [ ] **Step 3: Confirm the dependency boundary and report status**

Review `package.json` to confirm no routing, backend, editor, state-management, or UI component library dependency was added. Do not run tests, build, or the dev server.

## Self-Review

- Spec coverage: this plan creates only the approved Phase-0 tooling baseline; all roadmap features remain intentionally unimplemented.
- Step scan: each command and configuration outcome is specified without prescribing generated template internals unnecessarily.
- Type consistency: the Vite template owns the React entry-point types; no new application interfaces are introduced.
- Review focus: Tasks 1–3 cover installability, start-script availability, Tailwind integration, formatter/linter compatibility, and the dependency boundary.
- Proportion: the plan contains three reviewable tasks and does not duplicate Vite-generated source.
