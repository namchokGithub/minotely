import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Width of a collapsed column in px (D44). Keep in sync with the `md:w-12` classes in the layout. */
export const PANEL_RAIL_WIDTH = 48;

/**
 * What is left of a collapsed column on 768px and up: a narrow strip with one
 * button that expands it again (D44). Phones never show it.
 */
export function PanelRail({
  label,
  controls,
  onExpand,
  className,
  children,
  after,
  hint,
}: {
  label: string;
  /** Tooltip when it should say more than the label. */
  hint?: string;
  /** id of the column this expands. */
  controls: string;
  onExpand: () => void;
  className?: string;
  /** The icon shown on the button. */
  children: ReactNode;
  /** More of the column, shown under the button (Library: one icon per book). */
  after?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "hidden h-full w-12 flex-col items-center md:flex",
        className,
      )}
    >
      <div className="flex h-14 shrink-0 items-center">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          title={hint ?? label}
          aria-expanded={false}
          aria-controls={controls}
          onClick={onExpand}
        >
          {children}
        </Button>
      </div>
      {after}
    </div>
  );
}
