export function downloadFile(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Lowercase file name without spaces: "My Golang Notes!" → "my-golang-notes.md".
 * Letters and digits of any script (e.g. Thai) are kept.
 */
export function toFileName(name: string, extension: string) {
  const base = name
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
  return `${base || "untitled"}.${extension}`;
}
