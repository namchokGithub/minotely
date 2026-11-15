import { Link } from "react-router";
import { buildNoteTree, pathOf } from "@/features/notes/tree";
import type { Note } from "@/features/notes/types";
import { useUiStore } from "@/stores/ui-store";

const titleOf = (note: Note) => note.title.trim() || "Untitled";

function PageLink({ note }: { note: Note }) {
  return (
    <Link
      to={`/books/${note.bookId}/notes/${note.id}`}
      className="inline-flex min-w-0 items-center gap-1 rounded-sm outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {note.icon && <span aria-hidden="true">{note.icon}</span>}
      <span className="truncate">{titleOf(note)}</span>
    </Link>
  );
}

/** Ancestors of a sub-page above its title (D49); nothing for a top-level note. */
export function PageBreadcrumb({ note, notes }: { note: Note; notes: Note[] }) {
  const path = pathOf(note.id, notes);
  if (path.length === 0) return null;
  return (
    <nav
      aria-label="Page path"
      className="note-breadcrumb mb-1 flex min-w-0 items-center gap-1 text-sm text-muted-foreground"
    >
      {path.map((ancestor, index) => (
        <span key={ancestor.id} className="flex min-w-0 items-center gap-1">
          {index > 0 && <span aria-hidden="true">/</span>}
          <PageLink note={ancestor} />
        </span>
      ))}
    </nav>
  );
}

/** Links to the open note's sub-pages after its content (D49). Not note content. */
export function SubPages({ note, notes }: { note: Note; notes: Note[] }) {
  const noteSort = useUiStore((state) => state.noteSort);
  const children = buildNoteTree(notes, noteSort).flatMap(
    function find(node): Note[] {
      return node.note.id === note.id
        ? node.children.map((child) => child.note)
        : node.children.flatMap(find);
    },
  );
  if (children.length === 0) return null;

  return (
    <section
      aria-label="Sub-pages"
      className="sub-pages mt-8 text-sm text-muted-foreground"
    >
      <h3 className="font-medium text-foreground">Sub-pages</h3>
      <ul>
        {children.map((child) => (
          <li key={child.id} className="flex min-w-0 py-0.5">
            <PageLink note={child} />
          </li>
        ))}
      </ul>
    </section>
  );
}
