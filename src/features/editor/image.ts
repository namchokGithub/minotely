import Image from "@tiptap/extension-image";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { toast } from "sonner";

/**
 * Images by URL (D55): an image block that can be resized from its corners
 * and sides (width and height are stored in the note), a pasted image URL that
 * becomes an image when it loads, a frame for images that cannot load, and
 * image heights rounded up to whole rows on Lined paper (D40). Files are not
 * stored: the image loads from its own site every time.
 */

const PROBE_TIMEOUT_MS = 3000;

/** A pasted https URL on its own, or null. */
function pastedUrl(text: string): string | null {
  const trimmed = text.trim();
  if (!/^https:\/\/\S+$/.test(trimmed) || trimmed.length > 2048) return null;
  try {
    return new URL(trimmed).href;
  } catch {
    return null;
  }
}

/** Discord attachment links carry `ex=` (expiry) and stop working after it. */
function expires(url: string) {
  const { hostname, searchParams } = new URL(url);
  return (
    /(^|\.)discord(app)?\.(com|net)$/.test(hostname) && searchParams.has("ex")
  );
}

/** Loads the URL as an image; true when it is one. */
function isImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = new window.Image();
    const timer = setTimeout(() => resolve(false), PROBE_TIMEOUT_MS);
    probe.referrerPolicy = "no-referrer";
    probe.onload = () => {
      clearTimeout(timer);
      resolve(probe.naturalWidth > 0);
    };
    probe.onerror = () => {
      clearTimeout(timer);
      resolve(false);
    };
    probe.src = url;
  });
}

type Pending = { id: number; from: number; to: number; url: string };

const pasteKey = new PluginKey<Pending[]>("imageUrlPaste");
let nextId = 1;

/**
 * Pasting an image URL: the URL goes in as text (a link) at once; when it
 * loads as an image, that text is replaced by an image block. Ctrl/⌘+Shift+V
 * and code blocks keep plain text.
 */
const imageUrlPaste = new Plugin<Pending[]>({
  key: pasteKey,
  state: {
    init: () => [],
    apply: (tr, pending) => {
      const meta = tr.getMeta(pasteKey) as
        { add?: Pending; remove?: number } | undefined;
      let next = pending.map((p) => ({
        ...p,
        from: tr.mapping.map(p.from, 1),
        to: tr.mapping.map(p.to, -1),
      }));
      if (meta?.add) next = [...next, meta.add];
      if (meta?.remove) next = next.filter((p) => p.id !== meta.remove);
      return next;
    },
  },
  props: {
    handlePaste: (view, event) => {
      const data = event.clipboardData;
      if (!data || data.files.length > 0) return false;
      // A plain-text paste (Ctrl/⌘+Shift+V) is never turned into an image.
      const input = (view as unknown as { input?: { shiftKey?: boolean } })
        .input;
      if (input?.shiftKey) return false;
      const url = pastedUrl(data.getData("text/plain"));
      if (!url || data.getData("text/html").includes("<img")) return false;
      if (view.state.selection.$from.parent.type.spec.code) return false;

      const id = nextId++;
      const from = view.state.selection.from;
      view.pasteText(url);
      const to = view.state.selection.from;
      view.dispatch(
        view.state.tr.setMeta(pasteKey, { add: { id, from, to, url } }),
      );
      void isImage(url).then((ok) => replaceWithImage(view, id, ok));
      return true;
    },
  },
});

function replaceWithImage(view: EditorView, id: number, ok: boolean) {
  if (view.isDestroyed) return;
  const pending = pasteKey.getState(view.state)?.find((p) => p.id === id);
  const tr = view.state.tr.setMeta(pasteKey, { remove: id });
  // Still the pasted URL, untouched since: replace it with the image.
  if (
    ok &&
    pending &&
    view.state.doc.textBetween(pending.from, pending.to) === pending.url
  ) {
    const image = view.state.schema.nodes.image.create({ src: pending.url });
    tr.replaceRangeWith(pending.from, pending.to, image);
    if (expires(pending.url)) {
      toast.warning(
        "This Discord link expires, usually within a day. The image will stop showing then.",
      );
    }
  }
  view.dispatch(tr);
}

/** Row height of Lined paper in px, or 0 when the note is not on Lined paper. */
function linedRow(view: EditorView) {
  const paper = view.dom.closest(".paper-lined");
  if (!paper) return 0;
  const value = getComputedStyle(paper).getPropertyValue("--paper-row").trim();
  const rem = Number.parseFloat(
    getComputedStyle(document.documentElement).fontSize,
  );
  return value.endsWith("rem")
    ? Number.parseFloat(value) * rem
    : Number.parseFloat(value) || 0;
}

/**
 * Marks images that cannot load ("Image unavailable") and, on Lined paper,
 * rounds each image block up to whole rows so the text after it stays on the lines.
 */
const imageFrames = new Plugin({
  key: new PluginKey("imageFrames"),
  view: (view) => {
    const containers = () =>
      view.dom.querySelectorAll<HTMLElement>(
        '[data-resize-container][data-node="image"]',
      );

    const fitRows = () => {
      const row = linedRow(view);
      for (const box of containers()) {
        if (!row) {
          box.style.minHeight = "";
          continue;
        }
        const img = box.querySelector("img");
        const height = img?.getBoundingClientRect().height ?? 0;
        box.style.minHeight = height
          ? `${Math.ceil(height / row) * row}px`
          : "";
      }
    };
    const sizes = new ResizeObserver(fitRows);
    const observeAll = () => {
      sizes.disconnect();
      for (const box of containers()) {
        const img = box.querySelector("img");
        if (img) sizes.observe(img);
      }
      fitRows();
    };

    const onError = (event: Event) => {
      const img = event.target;
      if (!(img instanceof HTMLImageElement) || !view.dom.contains(img)) return;
      const box = img.closest<HTMLElement>("[data-resize-container]");
      box?.classList.add("image-unavailable");
      box?.setAttribute("title", `Image unavailable: ${img.src}`);
    };
    const onLoad = (event: Event) => {
      const img = event.target;
      if (!(img instanceof HTMLImageElement) || !view.dom.contains(img)) return;
      const box = img.closest<HTMLElement>("[data-resize-container]");
      box?.classList.remove("image-unavailable");
      box?.removeAttribute("title");
      fitRows();
    };
    view.dom.addEventListener("error", onError, true);
    view.dom.addEventListener("load", onLoad, true);
    observeAll();

    return {
      update: observeAll,
      destroy: () => {
        sizes.disconnect();
        view.dom.removeEventListener("error", onError, true);
        view.dom.removeEventListener("load", onLoad, true);
      },
    };
  },
});

export const NoteImage = Image.extend({
  addProseMirrorPlugins() {
    return [...(this.parent?.() ?? []), imageUrlPaste, imageFrames];
  },
}).configure({
  // Hotlinked images: send no Referer, which some sites require.
  HTMLAttributes: { referrerpolicy: "no-referrer", loading: "lazy" },
  resize: {
    enabled: true,
    directions: ["left", "right", "bottom-left", "bottom-right"],
    minWidth: 80,
    minHeight: 40,
    alwaysPreserveAspectRatio: true,
  },
});
