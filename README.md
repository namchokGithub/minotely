# minotely

A private, modern notebook web app for organizing books and notes, featuring rich-text Markdown editing, customizable paper styles, and seamless cross-device access.

## Getting started

1. `pnpm install`
2. Copy `.env.example` to `.env.local` and fill in the Firebase web app config.
3. In Firebase Console → Authentication → Sign-in method, enable Google.
4. `pnpm dev`

## Deploy (Firebase Hosting)

Deploys are manual from your machine. The build reads `.env.local`.

One-time setup:

1. `npm install -g firebase-tools`, then `firebase login`.
2. `firebase use --add` and pick the Firebase project (writes `.firebaserc`).
3. Firebase Console → Hosting → Get started (once per project).

Deploy:

```bash
firebase deploy --only hosting          # runs `pnpm build`, uploads dist/
```

Security Rules are deployed separately:

```bash
firebase deploy --only firestore:rules
```

Any Google account can sign in; each account sees only its own data (D22).

The site is served at `https://<project-id>.web.app` and `https://<project-id>.firebaseapp.com`; both are already
authorized domains for Firebase Auth.

## Roadmap

See `docs/PLAN.md` (milestones) and `docs/PROGRESS.md` (status).
