import { useSyncExternalStore, type CSSProperties } from "react";

/**
 * Background of the area around the page, one setting for all notes, kept in
 * this browser's localStorage per account (D43).
 */
export type PageBackground = {
  /** Hex color; null follows the theme. */
  color: string | null;
  /** https image URL, drawn over the color; "" for none. */
  imageUrl: string;
  /** 0–100: how strongly the color or image shows over the theme color. */
  opacity: number;
  /** -100 (black) to 100 (white); 0 leaves the color or image as is. */
  brightness: number;
};

export const DEFAULT_PAGE_BACKGROUND: PageBackground = {
  color: null,
  imageUrl: "",
  opacity: 100,
  brightness: 0,
};

const storageKey = (uid: string) => `minotely:page-background:${uid}`;
const listeners = new Set<() => void>();
/** `useSyncExternalStore` needs the same object for the same stored text. */
let cached: { key: string; raw: string | null; value: PageBackground } | null =
  null;

const clamp = (value: unknown, min: number, max: number, fallback: number) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value)))
    : fallback;

/** Returns the normalized https URL, or null when the text is not one. */
export function httpsUrl(text: string): string | null {
  try {
    const url = new URL(text.trim());
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function parse(raw: string | null): PageBackground {
  if (!raw) return DEFAULT_PAGE_BACKGROUND;
  try {
    const stored = JSON.parse(raw) as Partial<PageBackground> | null;
    if (!stored || typeof stored !== "object") return DEFAULT_PAGE_BACKGROUND;
    return {
      color:
        typeof stored.color === "string" && /^#[0-9a-f]{6}$/i.test(stored.color)
          ? stored.color
          : null,
      imageUrl:
        typeof stored.imageUrl === "string"
          ? (httpsUrl(stored.imageUrl) ?? "")
          : "",
      opacity: clamp(stored.opacity, 0, 100, 100),
      brightness: clamp(stored.brightness, -100, 100, 0),
    };
  } catch {
    return DEFAULT_PAGE_BACKGROUND;
  }
}

function read(uid: string): PageBackground {
  const key = storageKey(uid);
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    // Storage blocked: behave as if nothing is saved.
  }
  if (cached?.key !== key || cached.raw !== raw) {
    cached = { key, raw, value: parse(raw) };
  }
  return cached.value;
}

/** Saves the setting; false when the browser refuses to store it. */
export function savePageBackground(
  uid: string,
  background: PageBackground,
): boolean {
  try {
    localStorage.setItem(storageKey(uid), JSON.stringify(background));
  } catch {
    return false;
  }
  listeners.forEach((notify) => notify());
  return true;
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  // Another tab changed it.
  window.addEventListener("storage", notify);
  return () => {
    listeners.delete(notify);
    window.removeEventListener("storage", notify);
  };
}

export function usePageBackground(uid: string): PageBackground {
  return useSyncExternalStore(subscribe, () => read(uid));
}

/** Style of the layer behind the page, or null when the theme color is used. */
export function pageBackgroundStyle(
  background: PageBackground,
): CSSProperties | null {
  const image = httpsUrl(background.imageUrl);
  if (!background.color && !image) return null;
  const layers: string[] = [];
  if (background.brightness !== 0) {
    const tone = background.brightness > 0 ? "255 255 255" : "0 0 0";
    const shade = `rgb(${tone} / ${Math.abs(background.brightness) / 100})`;
    layers.push(`linear-gradient(${shade}, ${shade})`);
  }
  // `URL.href` is percent-encoded, so it cannot close the quoted string.
  if (image) layers.push(`url(${JSON.stringify(image)})`);
  return {
    backgroundColor: background.color ?? undefined,
    backgroundImage: layers.length ? layers.join(", ") : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
    opacity: background.opacity / 100,
  };
}
