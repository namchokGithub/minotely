# minotely

A private, modern notebook web app for organizing books and notes, featuring rich-text Markdown editing, customizable paper styles, and seamless cross-device access.

Sign in with any Google account; each account sees only its own books and notes.

![sample](public/sample-minotely-beautified.png)

## Features

- **Library → Books → Notes** — books with color (preset or custom) and icon, drag to reorder, live note count.
- **Editor** — inline WYSIWYG (Tiptap) with live Markdown shortcuts, a `/` block menu, callouts, block controls
  (`+` to add, `⠿` to drag or open block actions), a floating toolbar on selections, code block color presets, and
  a Raw Markdown toggle; headings, lists,
  checklists, tables, code blocks, bold/italic, text color, highlight, and links with an edit bar. Editing Raw
  Markdown can remove text colors and custom highlights that Markdown cannot represent. Ctrl/⌘+C copies a
  rich-text selection as Markdown; the right-click menu or Ctrl/⌘+Alt+Shift+C copies plain text. English and
  Thai spelling suggestions appear in the WYSIWYG right-click menu, where spell check can be turned on or off;
  personal words and the spell check setting are saved on this device.
- **Reliable Auto Save** — every edit saved on the device at once (IndexedDB), synced 30 s after typing stops
  (at least every 5 min), keeps working offline, asks before overwriting a version changed elsewhere; Ctrl/⌘+S
  syncs now.
- **Organize** — sub-pages up to 3 levels (tree in the Notes column), note icons (emoji), pin, lock (read-only), tags with filter, sort (updated, created, A–Z, custom), move notes by drag
  and drop, Trash with restore.
- **Find** — search titles, content and `#tags` across all books (Ctrl/⌘+K); a Table of Contents of the open
  note’s headings.
- **Reading** — paper styles (plain, margin, lined, grid, dotted), page width (Default, A5, A4, Letter, A3,
  Full), editor font and size, light/dark theme, and a custom background around the page (color or image, per
  device).
- **Data** — JSON backup export/import, Markdown export/import per note.
- **Version history** — Auto and Manual versions of each note, kept on this device, with a read-only preview.
- **Responsive** — 3 resizable columns on desktop and tablet, each side column collapsible to a narrow rail from
  its title, one screen at a time with a bottom menu on mobile.
- **Keyboard and accessibility** — shortcuts with hints, app right-click menus (a second right-click opens the
  browser menu), reduced-motion support.

## Tech stack

| Area          | Technology                                                  |
| ------------- | ----------------------------------------------------------- |
| App           | React 19, Vite 8, TypeScript 6, React Router                |
| UI            | Tailwind CSS v4, shadcn/ui + Radix UI, Lucide React, sonner |
| Editor        | Tiptap 3 (+ `@tiptap/markdown`, task lists), nspell         |
| Drag and drop | `@dnd-kit`                                                  |
| State         | TanStack Query (server data), Zustand (UI state)            |
| Backend       | Firebase Authentication (Google), Cloud Firestore           |
| Local storage | Dexie (IndexedDB drafts)                                    |
| Hosting       | Firebase Hosting, deployed by GitHub Actions                |
| Tooling       | pnpm, ESLint, Prettier, Vitest                              |

## Dictionary credits

- English: [`dictionary-en`](https://github.com/wooorm/dictionaries/tree/main/dictionaries/en) from
  wooorm/dictionaries. The bundled dictionary and affix files are MIT AND BSD licensed; their license text is
  in [`public/dictionaries/LICENSE`](public/dictionaries/LICENSE).
- Thai: [`hunspell-th`](https://github.com/syafiqhadzir/hunspell-th/tree/a23b0521438f2735dc73efaee61391c6106ae196)
  by Syafiq Hadzir, using sources credited in its README. The bundled `th.aff` and `th.dic` come from that
  pinned revision and are GPLv3 licensed; the license text is in
  [`public/dictionaries/TH-LICENSE`](public/dictionaries/TH-LICENSE).

Thai word boundaries come from `Intl.Segmenter`. Some misspellings split into valid smaller words and may not
be underlined; the dictionary alone cannot resolve every such case.

## Project structure

```
src/
  app/            app root, router, layout (columns, bottom menu, resize, drag and drop)
  components/     shared components; ui/ holds shadcn/ui
  features/
    auth/         Google sign-in, route guard
    books/        Library, book dialog, colors and icons
    notes/        note list, sort, tags
    editor/       Tiptap editor, toolbar, link bar, Auto Save
    search/       search dialog
    trash/        Trash
    settings/     synced editor settings, mobile Settings screen
    data/         JSON backup, Markdown import/export
    versions/     local version history
  lib/            Firebase, Firestore, Dexie, shared hooks
  stores/         Zustand UI store
docs/             requirements, plan, progress, decisions, security
firestore.rules   per-user access and field validation
firebase.json     Hosting and rules config
```

Architecture rules and working conventions: `AGENTS.md`. Design decisions: `docs/DECISIONS.md`.

## Getting started

1. `pnpm install`
2. Copy `.env.example` to `.env.local` and fill in the Firebase web app config.
3. In Firebase Console → Authentication → Sign-in method, enable Google.
4. `pnpm dev`

| Command      | What it does                    |
| ------------ | ------------------------------- |
| `pnpm dev`   | run the app locally             |
| `pnpm build` | type-check and production build |
| `pnpm lint`  | run ESLint                      |
| `pnpm test`  | run Vitest                      |

## Deploy (Firebase Hosting)

Pushing to the `production` branch deploys the site (`.github/workflows/deploy-production.yml`): install, lint,
build, deploy to the live channel.

One-time setup:

1. `npm install -g firebase-tools`, `firebase login`, then `firebase use --add` (pick `minotely`).
2. Firebase Console → Hosting → Get started (once per project).
3. Deploy service account, in Google Cloud Console with **Project ID `minotely`** selected (another project may
   share the display name "minotely" — check the ID):
   - IAM & Admin → Service Accounts → use or create the deploy account; its email must end in
     `@minotely.iam.gserviceaccount.com`.
   - IAM & Admin → **IAM** (project level, not the service account's Permissions tab) → grant it Firebase Hosting
     Admin, Firebase Authentication Admin, API Keys Viewer, Cloud Run Viewer and Service Usage Consumer.
   - Service account → Keys → Add key → JSON. Paste the whole file into the GitHub secret
     `FIREBASE_SERVICE_ACCOUNT_MINOTELY`, then delete the file. Never commit it.
4. GitHub → Settings → Secrets and variables → Actions → **Variables**: add the six `VITE_FIREBASE_*` keys from
   `.env.example` with your values.

Release:

```bash
git switch production
git merge develop
git push origin production              # starts the deploy
```

Security Rules are not deployed by the workflow; publish them by hand when `firestore.rules` changes:

```bash
firebase deploy --only firestore:rules
```

The site is served at `https://minotely.web.app` and `https://minotely.firebaseapp.com`; both are already authorized
domains for Firebase Auth. Security notes: `docs/SECURITY.md`.

## Roadmap

- **Post-MVP:** version history synced across devices (today it is kept on each device only).

Status details: `docs/PROGRESS.md`.

---

© _2026 Namchok Singhachai_. Minotely is released under the [MIT License](LICENSE).
