# minotely

A private, modern notebook web app for organizing books and notes, featuring rich-text Markdown editing, customizable paper styles, and seamless cross-device access.

## Getting started

1. `pnpm install`
2. Copy `.env.example` to `.env.local` and fill in the Firebase web app config and `VITE_OWNER_EMAIL`.
3. In Firebase Console → Authentication → Sign-in method, enable Google.
4. `pnpm dev`

## Deploy (GitHub Pages)

Pushing to branch `production` runs `.github/workflows/deploy.yml`. One-time setup:

1. Repository Settings → Pages → Source: **GitHub Actions**.
2. Repository Settings → Secrets and variables → Actions → **Variables**: add every key from `.env.example`.
3. Firebase Console → Authentication → Settings → Authorized domains: add `<user>.github.io`.

## Roadmap

See `docs/PLAN.md` (milestones) and `docs/PROGRESS.md` (status).
