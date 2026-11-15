import { useEffect, useRef, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";
import { FileText } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { takePageLinkFocus } from "./page-link-focus";
import { useUid } from "@/features/auth/auth-context";
import {
  NoteConflictError,
  renameNote,
  useAllNotes,
} from "@/features/notes/api";

const RENAME_DELAY_MS = 600;

/**
 * One Page line (D50): icon (opens the page) and the page's title as an
 * editable field. Typing renames the page after a short pause or on leaving
 * the field; Enter moves below the line; Ctrl/⌘+Enter opens the page;
 * Backspace in an empty field removes the line (the page stays).
 */
export function PageLinkView({ node, editor, getPos }: NodeViewProps) {
  const uid = useUid();
  const navigate = useNavigate();
  const { data: allNotes } = useAllNotes();
  const pageId = String(node.attrs.pageId ?? "");
  const page = allNotes?.find((note) => note.id === pageId);
  const liveTitle = page?.title ?? String(node.attrs.title ?? "");
  const [draft, setDraft] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const input = useRef<HTMLInputElement>(null);
  const editable = editor.isEditable && Boolean(page);

  useEffect(() => {
    if (takePageLinkFocus(pageId)) input.current?.focus();
  }, [pageId]);

  useEffect(() => () => clearTimeout(timer.current), []);

  // Keep the stored snapshot in step with the live title (Markdown, search
  // text). Not an edit of this note: saved with its next real change.
  useEffect(() => {
    if (!page || !editor.isEditable) return;
    if (page.title === node.attrs.title && page.bookId === node.attrs.bookId) {
      return;
    }
    const pos = getPos();
    if (typeof pos !== "number") return;
    editor.view.dispatch(
      editor.state.tr
        .setNodeMarkup(pos, undefined, {
          ...node.attrs,
          title: page.title,
          bookId: page.bookId,
        })
        .setMeta("addToHistory", false),
    );
  }, [page, node.attrs, editor, getPos]);

  const save = (title: string) => {
    clearTimeout(timer.current);
    if (!page || title === page.title) {
      setDraft(null);
      return;
    }
    if (!navigator.onLine) {
      toast.error("You are offline. The page name was not changed.");
      setDraft(null);
      return;
    }
    renameNote(uid, page, title)
      .then(() => setDraft(null))
      .catch((error: unknown) => {
        console.error("Rename page failed", error);
        toast.error(
          error instanceof NoteConflictError
            ? "That page changed elsewhere. The name was not changed."
            : "Could not rename the page.",
        );
        setDraft(null);
      });
  };

  const open = () => {
    if (page) navigate(`/books/${page.bookId}/notes/${page.id}`);
  };

  /** Puts the cursor in the block after this line, adding an empty one at the end. */
  const moveBelow = () => {
    const pos = getPos();
    if (typeof pos !== "number") return;
    const after = pos + node.nodeSize;
    const { state, view } = editor;
    let tr = state.tr;
    if (
      after >= state.doc.content.size ||
      !state.doc.nodeAt(after)?.isTextblock
    ) {
      tr = tr.insert(after, state.schema.nodes.paragraph.create());
    }
    tr.setSelection(TextSelection.near(tr.doc.resolve(after + 1)));
    view.dispatch(tr);
    view.focus();
  };

  const removeLine = () => {
    const pos = getPos();
    if (typeof pos !== "number") return;
    editor.view.dispatch(editor.state.tr.delete(pos, pos + node.nodeSize));
    editor.view.focus();
  };

  return (
    <NodeViewWrapper
      className="page-link-line flex items-center gap-1.5"
      data-type="page-link"
    >
      <button
        type="button"
        contentEditable={false}
        aria-label={page ? `Open ${liveTitle || "Untitled"}` : "Page not found"}
        title={page ? "Open page (Ctrl/⌘+Enter)" : "Page not found"}
        disabled={!page}
        className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground disabled:opacity-50"
        onClick={open}
      >
        {page?.icon ? (
          <span aria-hidden="true">{page.icon}</span>
        ) : (
          <FileText className="size-4" />
        )}
      </button>
      {page ? (
        <input
          ref={input}
          value={draft ?? liveTitle}
          placeholder="Untitled"
          aria-label="Page name"
          maxLength={200}
          readOnly={!editable}
          className="min-w-0 flex-1 bg-transparent font-medium underline decoration-muted-foreground/40 underline-offset-4 outline-none placeholder:text-muted-foreground/60"
          onChange={(event) => {
            const value = event.target.value;
            setDraft(value);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => save(value), RENAME_DELAY_MS);
          }}
          onBlur={() => {
            if (draft !== null) save(draft);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              if (draft !== null) save(draft);
              open();
            } else if (event.key === "Enter") {
              event.preventDefault();
              if (draft !== null) save(draft);
              moveBelow();
            } else if (
              event.key === "Backspace" &&
              (draft ?? liveTitle) === "" &&
              editable
            ) {
              event.preventDefault();
              removeLine();
            }
          }}
        />
      ) : (
        <span className="text-muted-foreground line-through">
          {String(node.attrs.title || "Untitled")} — page not found
        </span>
      )}
    </NodeViewWrapper>
  );
}
