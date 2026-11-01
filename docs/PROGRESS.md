# Progress

Plan: `docs/PLAN.md`. Statuses: `Todo`, `In progress`, `Blocked`, `Done`.

## Open work index

Every item not `Done`. Keep in sync with the sections below.

| ID   | Item                                     | Status      |
| ---- | ---------------------------------------- | ----------- |
| M1.5 | Google Sign-in + owner allowlist + guard | In progress |
| M1.6 | GitHub Actions deploy on `production`    | In progress |
| M2.1 | Firestore data layer                     | In progress |
| M2.2 | Security Rules (real project)            | In progress |
| M2.3 | Book management                          | In progress |
| M2.4 | Note management + Pin                    | In progress |
| M2.5 | Sorting (Updated, Created, A–Z)          | In progress |
| M2.6 | Tiptap editor                            | In progress |
| M2.7 | Auto Save + status + Dexie drafts        | In progress |
| M3.1 | Paper Styles                             | In progress |
| M3.2 | Typography                               | In progress |
| M3.3 | Search                                   | In progress |
| M3.4 | Tags                                     | In progress |
| M3.5 | Motion                                   | In progress |
| M3.6 | Mobile polish                            | In progress |
| M3.7 | Trash                                    | In progress |
| M3.8 | Import/Export                            | In progress |
| M3.9 | Custom sort                              | In progress |
| M4.1 | Performance                              | In progress |
| M4.2 | Accessibility                            | In progress |
| M4.3 | Security Rules review                    | In progress |
| M4.4 | Release                                  | Todo        |

## Notes

- M1.5: code done; needs a manual check with the owner account and a non-owner account after `.env.local` is filled in.
- M1.6: workflow added; needs GitHub Pages source set to GitHub Actions, repository variables, and a first push to `production`.

- M2: code done for M2.1–M2.7; needs manual testing with the real project after publishing `firestore.rules` (replace `OWNER_EMAIL` first).
- M3: code done for M3.1–M3.9; needs manual testing. Custom sort uses Move up / Move down, not drag (D14).
- M4.1–M4.3: code done; needs manual checks (rules playground cases in `docs/SECURITY.md`, keyboard and screen-reader pass).
- M4.4: deferred by the owner; not releasing yet.

## Done

| ID   | Item                                                         | Status |
| ---- | ------------------------------------------------------------ | ------ |
| M0.1 | Vite + React + TS + Tailwind v4 + ESLint + Prettier baseline | Done   |
| M0.2 | MVP plan and project docs                                    | Done   |
| M0.3 | Firebase SDK + env config (`src/lib/firebase.ts`)            | Done   |
| M1.1 | Install remaining dependencies + Vitest                      | Done   |
| M1.2 | Theme tokens, Light/Dark                                     | Done   |
| M1.3 | Responsive shell                                             | Done   |
| M1.4 | Routing + Pages 404 fallback                                 | Done   |
