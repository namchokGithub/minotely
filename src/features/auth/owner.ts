/**
 * Client-side owner check (UX only). Firestore Security Rules are the real
 * access boundary — see D2 in docs/DECISIONS.md.
 */
export function isOwnerEmail(
  email: string | null | undefined,
  ownerEmail: string | null | undefined,
): boolean {
  const a = email?.trim().toLowerCase();
  const b = ownerEmail?.trim().toLowerCase();
  return Boolean(a && b && a === b);
}
