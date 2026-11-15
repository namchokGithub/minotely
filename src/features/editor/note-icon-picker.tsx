import { useState } from "react";
import { SmilePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { setNoteIcon } from "@/features/notes/api";
import { toNoteIcon } from "@/features/notes/note-icon";

/** A short starter set; any emoji can be typed or pasted below it (D46). */
const SUGGESTED_ICONS = [
  "📝",
  "📒",
  "📓",
  "📚",
  "📌",
  "📎",
  "🗂️",
  "🗒️",
  "💡",
  "✅",
  "⭐",
  "🔥",
  "🎯",
  "🚀",
  "🧠",
  "🧪",
  "💻",
  "🛠️",
  "📈",
  "💰",
  "🗓️",
  "⏰",
  "✈️",
  "🏠",
  "❤️",
  "🎨",
  "🎵",
  "📷",
  "🍳",
  "🌱",
  "☕",
  "🐾",
];

function logError(error: unknown) {
  console.error("Note icon failed", error);
}

/** Icon button before the note title: shows the icon, or "Add icon" when there is none (D46). */
export function NoteIconPicker({
  uid,
  noteId,
  icon,
  readOnly,
}: {
  uid: string;
  noteId: string;
  icon: string;
  readOnly: boolean;
}) {
  const [custom, setCustom] = useState("");
  const save = (next: string) => setNoteIcon(uid, noteId, next).catch(logError);

  if (readOnly && !icon) return null;

  return (
    <DropdownMenu onOpenChange={(open) => open && setCustom("")}>
      <DropdownMenuTrigger asChild disabled={readOnly}>
        <Button
          variant="ghost"
          size={icon ? "icon" : "icon-sm"}
          aria-label={icon ? `Note icon ${icon}, change` : "Add icon"}
          title={icon ? "Change icon" : "Add icon"}
          className={cn(
            "shrink-0 self-center disabled:opacity-100",
            icon
              ? "size-10 text-2xl sm:text-3xl"
              : "text-muted-foreground/60 hover:text-muted-foreground",
          )}
        >
          {icon || <SmilePlus />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>Icon</DropdownMenuLabel>
        <div className="grid grid-cols-8 gap-0.5 px-1">
          {SUGGESTED_ICONS.map((emoji) => (
            <DropdownMenuItem
              key={emoji}
              aria-label={emoji}
              className={cn(
                "justify-center p-0 text-lg leading-8",
                emoji === icon && "bg-accent",
              )}
              onSelect={() => void save(emoji)}
            >
              {emoji}
            </DropdownMenuItem>
          ))}
        </div>
        <DropdownMenuSeparator />
        <form
          className="px-1 py-1"
          onSubmit={(event) => {
            event.preventDefault();
            const next = toNoteIcon(custom);
            if (next) void save(next);
          }}
        >
          <Input
            value={custom}
            placeholder="Type or paste an emoji, then Enter"
            aria-label="Custom icon"
            maxLength={32}
            // Keep the menu's type-ahead and arrow keys out of the field.
            onKeyDown={(event) => event.stopPropagation()}
            onChange={(event) => setCustom(event.target.value)}
          />
        </form>
        {icon && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void save("")}>
              Remove icon
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
