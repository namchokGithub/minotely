import { Link } from "react-router";
import { Library, NotebookText, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBooks } from "@/features/books/api";
import { useUiStore } from "@/stores/ui-store";

type Tab = "books" | "notes" | "settings";

/** Mobile bottom menu (< 768 px, not shown in the editor): Books, Notes, Settings (D30). */
export function BottomNav({ active }: { active: Tab | null }) {
  const lastBookId = useUiStore((state) => state.lastBookId);
  const { data: books } = useBooks();
  const lastBookExists = books?.some((b) => b.id === lastBookId);
  const notesHref =
    lastBookId && lastBookExists ? `/books/${lastBookId}` : "/notes";

  const tabs = [
    { id: "books", label: "Books", href: "/", icon: Library },
    { id: "notes", label: "Notes", href: notesHref, icon: NotebookText },
    { id: "settings", label: "Settings", href: "/settings", icon: Settings },
  ] as const;

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 flex h-14 border-t bg-background/95 backdrop-blur md:hidden"
    >
      {tabs.map(({ id, label, href, icon: Icon }) => (
        <Link
          key={id}
          to={href}
          aria-current={active === id ? "page" : undefined}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] text-muted-foreground transition-colors duration-150 outline-none focus-visible:bg-muted",
            active === id && "font-medium text-foreground",
          )}
        >
          <Icon className="size-5" aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}
