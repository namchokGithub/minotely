/**
 * Asks the open editor of `parentId`, if any, to add a Page line for `childId`
 * at the end of its content (D50). True when an open editor took it; then the
 * line is saved by that editor's Auto Save instead of a direct write, so the
 * open note does not see its own change as a conflict (D32).
 */
export type PageLinkRequest = {
  parentId: string;
  childId: string;
  handled: boolean;
};

export const PAGE_LINK_EVENT = "minotely:add-page-link";

export function requestPageLink(parentId: string, childId: string): boolean {
  const detail: PageLinkRequest = { parentId, childId, handled: false };
  window.dispatchEvent(new CustomEvent(PAGE_LINK_EVENT, { detail }));
  return detail.handled;
}
