const SAFE_PROTOCOL = /^(https?:|mailto:|tel:)/i;

/** "example.com" → "https://example.com"; keeps http(s), mailto and tel links; "" stays "". */
export function normalizeHref(input: string): string {
  const value = input.trim();
  if (!value) return "";
  if (SAFE_PROTOCOL.test(value)) return value;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return value; // other scheme: Link's validator decides
  return `https://${value}`;
}

/** Opens a link in a new tab. Only http(s), mailto and tel; never javascript: or data:. */
export function openLink(href: unknown) {
  if (typeof href !== "string" || !SAFE_PROTOCOL.test(href)) return;
  window.open(href, "_blank", "noopener,noreferrer");
}
