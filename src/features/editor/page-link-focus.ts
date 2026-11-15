/** Page id whose line takes focus when it mounts: just created from `/` (D50). */
let focusNext: string | null = null;

export function focusPageLinkOnMount(pageId: string) {
  focusNext = pageId;
}

/** True once for the page id that asked for focus. */
export function takePageLinkFocus(pageId: string) {
  if (focusNext !== pageId) return false;
  focusNext = null;
  return true;
}
