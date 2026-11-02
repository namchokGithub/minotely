import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { cn } from "@/lib/utils";

const KEY_STEP = 16;

type ResizeHandleProps = {
  /** Accessible name, e.g. "Resize Library". */
  label: string;
  controls: string;
  value: number;
  min: number;
  max: number;
  defaultValue: number;
  onChange: (width: number) => void;
  onResizingChange?: (resizing: boolean) => void;
};

/**
 * Vertical splitter between two columns (M5.4). Drag with mouse/touch, or focus and use ←/→ (16 px),
 * Home/End (min/max) and Enter or double-click (reset).
 */
export function ResizeHandle({
  label,
  controls,
  value,
  min,
  max,
  defaultValue,
  onChange,
  onResizingChange,
}: ResizeHandleProps) {
  const start = useRef<{ x: number; width: number } | null>(null);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    start.current = { x: event.clientX, width: value };
    onResizingChange?.(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!start.current) return;
    onChange(start.current.width + event.clientX - start.current.x);
  };

  const onPointerEnd = () => {
    if (!start.current) return;
    start.current = null;
    onResizingChange?.(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = {
      ArrowLeft: value - KEY_STEP,
      ArrowRight: value + KEY_STEP,
      Home: min,
      End: max,
      Enter: defaultValue,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    onChange(next);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-controls={controls}
      aria-valuenow={Math.round(value)}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      title={`${label} (double-click to reset)`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onDoubleClick={() => onChange(defaultValue)}
      onKeyDown={onKeyDown}
      className={cn(
        "relative z-10 -mx-1 hidden w-2 shrink-0 cursor-col-resize touch-none outline-none md:block",
        "after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 after:-translate-x-1/2 after:transition-colors after:duration-150",
        "hover:after:bg-ring/50 focus-visible:after:bg-ring active:after:bg-ring",
      )}
    />
  );
}
