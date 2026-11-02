import { createElement } from "react";
import { cn } from "@/lib/utils";
import { bookColorClass, bookColorStyle, bookIcon } from "./appearance";

/** A book's icon in its color. */
export function BookGlyph({
  icon,
  color,
  className,
}: {
  icon: string;
  color: string;
  className?: string;
}) {
  return createElement(bookIcon(icon), {
    className: cn("size-4 shrink-0", bookColorClass(color), className),
    style: bookColorStyle(color),
    "aria-hidden": true,
  });
}
