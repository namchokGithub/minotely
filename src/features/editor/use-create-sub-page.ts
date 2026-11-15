import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useUid } from "@/features/auth/auth-context";
import { createSubPage } from "@/features/notes/api";
import type { Note } from "@/features/notes/types";

/**
 * Creates an empty sub-page of `note` and opens it (D49). Used by the `/` menu's
 * Sub-page entry; a refused write (Rules not published yet) shows a toast.
 */
export function useCreateSubPage() {
  const uid = useUid();
  const navigate = useNavigate();
  return (note: Note) => {
    const { id, written } = createSubPage(uid, note);
    written.catch((error: unknown) => {
      console.error("Add sub-page failed", error);
      toast.error(
        "Could not add a sub-page. If this keeps happening, the Security Rules may need publishing.",
      );
    });
    navigate(`/books/${note.bookId}/notes/${id}`);
  };
}
