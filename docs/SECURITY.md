# Security

Minotely is a static site; all access control lives in Firebase. Decisions: D22, D6, D17 in `docs/DECISIONS.md`.

## Model

- Any Google account can sign in. Each user can read and write only `users/{their uid}/…`, enforced by
  `firestore.rules` (sign-in provider must be `google.com`).
- Data is limited to `users/{uid}/books/*`, `users/{uid}/notes/*` and `users/{uid}/preferences/settings`.
  Every other path is denied.
- Writes are shape-checked: allowed fields only, types, `paperStyle`/font enums, title ≤ 200, book name ≤ 80,
  ≤ 20 tags, and `createdAt` cannot change on update.

## Manual rules check (Firebase Console → Firestore → Rules → Rules Playground)

Publish `firestore.rules` first. Use Authenticated requests with the provider `google.com`.

| Case                                              | Expected |
| ------------------------------------------------- | -------- |
| Google user, get `users/<own uid>/notes/x`        | Allow    |
| Google user, get `users/<other uid>/notes/x`      | Deny     |
| Signed in with a provider other than `google.com` | Deny     |
| Unauthenticated read                              | Deny     |
| Create note with an extra field                   | Deny     |
| Create note with `paperStyle: "wood"`             | Deny     |
| Create book with `color: "red; x"`                | Deny     |
| Update note changing `createdAt`                  | Deny     |
| Write `users/<own uid>/preferences/other`         | Deny     |
| Write `users/<own uid>/somethingElse/x`           | Deny     |

Then in the app: create, edit, pin, move, tag, delete, restore, empty Trash, change paper and font, and import a
backup — every action must succeed. A failure shows as an Auto Save error or a console `permission-denied`.

## Recommended project settings

- Google Cloud Console → APIs & Services → Credentials: restrict the browser API key to HTTP referrers
  `https://<project-id>.web.app/*`, `https://<project-id>.firebaseapp.com/*` and `http://localhost:*/*`.
- Firebase Console → Authentication → Settings → Authorized domains: only `localhost`, `<project-id>.web.app`
  and `<project-id>.firebaseapp.com`.
- Deploy rules with `firebase deploy --only firestore:rules`.
- Watch usage in Firebase Console → Usage and billing; set a budget alert if the project is on the Blaze plan,
  since anyone with a Google account can create data.
- Optional: Firebase App Check (reCAPTCHA Enterprise) to block scripted traffic to Firestore.

## Known limits

- Anyone with a Google account can sign up and store data, which counts against the project's quota. Limiting
  sign-up needs Identity Platform blocking functions (Blaze plan) or going back to an allowlist.
- Unsaved drafts are stored unencrypted in the browser's IndexedDB until they sync. Sign out and clear site
  data on shared devices.
