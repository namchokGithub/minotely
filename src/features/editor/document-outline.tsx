import { useEffect, useRef, useState } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";

type OutlineHeading = { level: number; text: string; pos: number };

const BAR_WIDTH: Record<number, string> = { 1: "w-4", 2: "w-3", 3: "w-2" };
const INDENT: Record<number, string> = { 1: "pl-2", 2: "pl-5", 3: "pl-8" };

function sameHeadings(a: OutlineHeading[], b: OutlineHeading[] | null) {
  return (
    b !== null &&
    a.length === b.length &&
    a.every(
      (h, i) =>
        h.level === b[i].level && h.text === b[i].text && h.pos === b[i].pos,
    )
  );
}

/**
 * Document Outline, shown as "Table of Contents" (D47): headings of the open
 * note as short bars at the right edge; hovering or focusing shows their text,
 * clicking the bars keeps the list open, and a heading scrolls to it.
 */
export function DocumentOutline({ editor }: { editor: Editor }) {
  const [pinned, setPinned] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // A pinned list closes on a click outside it or on Escape.
  useEffect(() => {
    if (!pinned) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!navRef.current?.contains(event.target as Node)) setPinned(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPinned(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [pinned]);
  const headings = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const found: OutlineHeading[] = [];
      e.state.doc.descendants((node, pos) => {
        if (node.type.name !== "heading") return true;
        const text = node.textContent.trim();
        if (text) found.push({ level: node.attrs.level as number, text, pos });
        return false;
      });
      return found;
    },
    equalityFn: sameHeadings,
  });

  if (headings.length === 0) return null;

  const goTo = (pos: number) => {
    const target = editor.view.nodeDOM(pos);
    if (target instanceof HTMLElement) {
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      target.scrollIntoView({
        behavior: reduce ? "auto" : "smooth",
        block: "start",
      });
    }
    editor
      .chain()
      .setTextSelection(pos + 1)
      .focus(undefined, { scrollIntoView: false })
      .run();
  };

  return (
    <nav
      ref={navRef}
      aria-label="Table of Contents"
      className="group absolute top-6 right-5 z-10 hidden md:block"
    >
      <button
        type="button"
        aria-expanded={pinned}
        aria-controls="document-outline-list"
        title="Table of Contents"
        className="flex flex-col items-end gap-1.5 rounded-md p-1.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        onClick={() => setPinned((open) => !open)}
      >
        <span className="sr-only">Table of Contents</span>
        {headings.slice(0, 40).map((heading) => (
          <span
            key={heading.pos}
            aria-hidden="true"
            className={cn(
              "h-0.5 rounded-full bg-muted-foreground/40",
              BAR_WIDTH[heading.level] ?? "w-2",
            )}
          />
        ))}
      </button>

      <ol
        id="document-outline-list"
        className={cn(
          "absolute top-0 right-0 max-h-[70vh] w-64 overflow-y-auto rounded-lg border bg-popover p-1 text-sm text-popover-foreground shadow-md transition-opacity duration-150",
          pinned
            ? "visible opacity-100"
            : "invisible opacity-0 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100",
        )}
      >
        {headings.map((heading) => (
          <li key={heading.pos}>
            <button
              type="button"
              className={cn(
                "block w-full truncate rounded-md py-1 pr-2 text-left transition-colors duration-150 outline-none hover:bg-muted focus-visible:bg-muted",
                INDENT[heading.level] ?? "pl-8",
                heading.level === 1 && "font-medium",
              )}
              onClick={() => {
                setPinned(false);
                goTo(heading.pos);
              }}
            >
              {heading.text}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
