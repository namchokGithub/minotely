import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Loading indicator announced to screen readers. */
export function Spinner({
  className,
  label = "Loading…",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span role="status" className="inline-flex">
      <Loader2 className={cn("size-4 animate-spin", className)} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}
