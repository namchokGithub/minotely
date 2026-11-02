import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  BOOK_COLORS,
  BOOK_ICONS,
  DEFAULT_BOOK_COLOR,
  DEFAULT_BOOK_ICON,
  bookColorClass,
  bookColorStyle,
  isCustomColor,
  type BookColor,
  type BookIcon,
} from "./appearance";
import type { Book, BookInput } from "./types";

type BookDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit this book; omit to create a new one. */
  book?: Book;
  onSubmit: (input: BookInput) => void;
};

export function BookDialog({
  open,
  onOpenChange,
  book,
  onSubmit,
}: BookDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Remount the form on open so it starts from the book's current values. */}
        {open && (
          <BookForm
            book={book}
            onSubmit={(input) => {
              onSubmit(input);
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function BookForm({
  book,
  onSubmit,
}: {
  book?: Book;
  onSubmit: (input: BookInput) => void;
}) {
  const [name, setName] = useState(book?.name ?? "");
  const [color, setColor] = useState<string>(book?.color ?? DEFAULT_BOOK_COLOR);
  const [icon, setIcon] = useState<string>(book?.icon ?? DEFAULT_BOOK_ICON);
  const trimmed = name.trim();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (trimmed) onSubmit({ name: trimmed, color, icon });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <DialogHeader>
        <DialogTitle>{book ? "Edit book" : "New book"}</DialogTitle>
      </DialogHeader>

      <Input
        autoFocus
        aria-label="Book name"
        placeholder="Book name"
        value={name}
        maxLength={80}
        onChange={(event) => setName(event.target.value)}
      />

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Color</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(BOOK_COLORS) as BookColor[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-label={BOOK_COLORS[key].label}
              aria-pressed={color === key}
              onClick={() => setColor(key)}
              className={cn(
                "size-7 rounded-full ring-offset-2 ring-offset-background transition-shadow",
                BOOK_COLORS[key].swatch,
                color === key && "ring-2 ring-ring",
              )}
            />
          ))}
          <label
            title="Custom color"
            className={cn(
              "relative size-7 cursor-pointer overflow-hidden rounded-full ring-offset-2 ring-offset-background transition-shadow focus-within:ring-2 focus-within:ring-ring/50",
              isCustomColor(color) && "ring-2 ring-ring",
            )}
            style={{
              background: isCustomColor(color)
                ? color
                : "conic-gradient(#ef4444, #f59e0b, #22c55e, #3b82f6, #a855f7, #ef4444)",
            }}
          >
            <input
              type="color"
              aria-label="Custom color"
              value={isCustomColor(color) ? color : "#3b82f6"}
              onChange={(event) => setColor(event.target.value.toLowerCase())}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Icon</legend>
        <div className="grid grid-cols-8 gap-1">
          {(Object.keys(BOOK_ICONS) as BookIcon[]).map((key) => {
            const Icon = BOOK_ICONS[key];
            return (
              <button
                key={key}
                type="button"
                aria-label={`Icon: ${key.replace(/-/g, " ")}`}
                aria-pressed={icon === key}
                onClick={() => setIcon(key)}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-md hover:bg-muted",
                  icon === key && "bg-muted",
                )}
              >
                <Icon
                  className={cn("size-4", bookColorClass(color))}
                  style={bookColorStyle(color)}
                />
              </button>
            );
          })}
        </div>
      </fieldset>

      <DialogFooter>
        <Button type="submit" disabled={!trimmed}>
          {book ? "Save" : "Create"}
        </Button>
      </DialogFooter>
    </form>
  );
}
