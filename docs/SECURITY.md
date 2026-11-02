# Security

Minotely is a static site; all access control lives in Firebase. Decisions: D2, D6, D17 in `docs/DECISIONS.md`.

## Model

- Only the owner's Google account (verified email) can read or write, enforced by `firestore.rules`.
- Data is limited to `users/{uid}/books/*`, `users/{uid}/notes/*` and `users/{uid}/preferences/settings`.
  Every other path is denied.
- Writes are shape-checked: allowed fields only, types, `paperStyle`/font enums, title ≤ 200, book name ≤ 80,
  ≤ 20 tags, and `createdAt` cannot change on update.
- The client owner check (`VITE_OWNER_EMAIL`) is UX only.

## Manual rules check (Firebase Console → Firestore → Rules → Rules Playground)

Replace `OWNER_EMAIL` in `firestore.rules` and publish first. Use Authenticated requests with the provider
`google.com` and a custom `email` / `email_verified` token.

| Case                                               | Expected |
| -------------------------------------------------- | -------- |
| Owner uid + owner email, get `users/<uid>/notes/x` | Allow    |
| Owner email, different uid in the path             | Deny     |
| Other email, own uid in the path                   | Deny     |
| Owner, `email_verified: false`                     | Deny     |
| Unauthenticated read                               | Deny     |
| Owner, create note with an extra field             | Deny     |
| Owner, create note with `paperStyle: "wood"`       | Deny     |
| Owner, update note changing `createdAt`            | Deny     |
| Owner, write `users/<uid>/preferences/other`       | Deny     |
| Owner, write `users/<uid>/somethingElse/x`         | Deny     |

Then in the app: create, edit, pin, move, tag, delete, restore, empty Trash, change paper and font, and import a
backup — every action must succeed. A failure shows as an Auto Save error or a console `permission-denied`.

## Recommended project settings

- Google Cloud Console → APIs & Services → Credentials: restrict the browser API key to HTTP referrers
  `https://<project-id>.web.app/*`, `https://<project-id>.firebaseapp.com/*` and `http://localhost:*/*`.
- Firebase Console → Authentication → Settings → Authorized domains: only `localhost`, `<project-id>.web.app`
  and `<project-id>.firebaseapp.com`.
- Deploy rules only with `firebase deploy --only firestore:rules` after replacing `OWNER_EMAIL`.
- Optional: Firebase App Check (reCAPTCHA Enterprise) to block scripted traffic to Firestore.

## Known limits

- Any Google account can still create a Firebase Auth user by signing in; it gets no data access. Blocking
  sign-up itself needs Identity Platform blocking functions (Blaze plan).
- Unsaved drafts are stored unencrypted in the browser's IndexedDB until they sync. Sign out and clear site
  data on shared devices.
