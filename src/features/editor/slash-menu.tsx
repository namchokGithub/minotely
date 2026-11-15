import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import type { SlashMenuStore } from "./slash-command";

const MENU_WIDTH = 240;
const MENU_MAX_HEIGHT = 320;

/** The `/` block menu (D48), drawn below the typed `/` (above it near the bottom of the screen). */
export function SlashMenu({ store }: { store: SlashMenuStore }) {
  const state = useSyncExternalStore(store.subscribe, store.get);
  const listRef = useRef<HTMLDivElement>(null);
  const selected = state?.selected ?? 0;

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${selected}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  if (!state?.rect) return null;
  const { rect, items } = state;
  const below = rect.bottom + 6 + MENU_MAX_HEIGHT < window.innerHeight;
  const left = Math.max(
    8,
    Math.min(rect.left, window.innerWidth - MENU_WIDTH - 8),
  );

  return createPortal(
    <div
      ref={listRef}
      role="listbox"
      aria-label="Blocks"
      // Keep focus in the editor so typing keeps filtering.
      onMouseDown={(event) => event.preventDefault()}
      className="fixed z-50 overflow-y-auto rounded-lg border bg-popover p-1 text-sm text-popover-foreground shadow-md"
      style={{
        left,
        width: MENU_WIDTH,
        maxHeight: MENU_MAX_HEIGHT,
        ...(below
          ? { top: rect.bottom + 6 }
          : { bottom: window.innerHeight - rect.top + 6 }),
      }}
    >
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            role="option"
            data-index={index}
            aria-selected={index === selected}
            tabIndex={-1}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left outline-none",
              index === selected ? "bg-muted" : "hover:bg-muted/60",
            )}
            onClick={() => state.pick(item)}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-background">
              <Icon className="size-4" />
            </span>
            {item.label}
          </button>
        );
      })}
    </div>,
    document.body,
  );
}
