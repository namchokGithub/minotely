import { useState } from "react";
import { X } from "lucide-react";
import { useUid } from "@/features/auth/auth-context";
import { setNoteTags } from "@/features/notes/api";
import { normalizeTag } from "@/features/notes/tags";
import type { Note } from "@/features/notes/types";

const MAX_TAGS = 20;

export function TagEditor({ note }: { note: Note }) {
  const uid = useUid();
  const [input, setInput] = useState("");

  const save = (tags: string[]) =>
    setNoteTags(uid, note.id, tags).catch((error) =>
      console.error("Saving tags failed", error),
    );

  const add = () => {
    const tag = normalizeTag(input);
    setInput("");
    if (!tag || note.tags.includes(tag) || note.tags.length >= MAX_TAGS) return;
    void save([...note.tags, tag]);
  };

  return (
    <div className="mb-6 flex flex-wrap items-center gap-1.5">
      {note.tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-0.5 rounded-full bg-muted py-0.5 pr-1 pl-2 text-xs"
        >
          #{tag}
          <button
            type="button"
            aria-label={`Remove tag ${tag}`}
            className="rounded-full p-0.5 transition-colors duration-150 hover:bg-foreground/10"
            onClick={() => void save(note.tags.filter((t) => t !== tag))}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        value={input}
        placeholder={note.tags.length ? "Add tag" : "Add tags…"}
        aria-label="Add tag"
        maxLength={40}
        className="min-w-24 flex-1 bg-transparent py-0.5 text-base text-muted-foreground outline-none placeholder:text-muted-foreground/60 sm:text-xs"
        onChange={(event) => setInput(event.target.value)}
        onBlur={add}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            add();
          } else if (
            event.key === "Backspace" &&
            !input &&
            note.tags.length > 0
          ) {
            void save(note.tags.slice(0, -1));
          }
        }}
      />
    </div>
  );
}
