import { useRef, type MouseEvent, type ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

/** A second right-click within this time after the app menu closes shows the browser menu. */
const SECOND_CLICK_MS = 600;

/**
 * Right-click menu (M5.9, D26): the first right-click opens the app menu; right-clicking again while it is
 * open (or just after it closed) falls through to the browser's own menu. Also opens with the keyboard
 * Menu key / Shift+F10, because browsers fire `contextmenu` for those.
 */
export function AppContextMenu({
  children,
  menu,
  label,
}: {
  /** One element; it becomes the trigger. */
  children: ReactNode;
  menu: ReactNode;
  label: string;
}) {
  const open = useRef(false);
  const closedAt = useRef(0);

  const onContextMenuCapture = (event: MouseEvent) => {
    if (open.current || Date.now() - closedAt.current < SECOND_CLICK_MS) {
      // Skip the app menu's handler (it would call preventDefault) so the browser menu opens.
      event.stopPropagation();
      closedAt.current = 0;
    }
  };

  return (
    <ContextMenu
      onOpenChange={(next) => {
        open.current = next;
        if (!next) closedAt.current = Date.now();
      }}
    >
      <ContextMenuTrigger asChild onContextMenuCapture={onContextMenuCapture}>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent aria-label={label} className="w-auto min-w-48">
        {menu}
      </ContextMenuContent>
    </ContextMenu>
  );
}
