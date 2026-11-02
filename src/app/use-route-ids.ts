import { useMatch } from "react-router";

/** Book and note ids from the URL, readable from any component in the layout. */
export function useRouteIds() {
  const noteMatch = useMatch("/books/:bookId/notes/:noteId");
  const bookMatch = useMatch("/books/:bookId");
  const trashMatch = useMatch("/trash");
  const notesHomeMatch = useMatch("/notes");
  const settingsMatch = useMatch("/settings");
  return {
    bookId: noteMatch?.params.bookId ?? bookMatch?.params.bookId,
    noteId: noteMatch?.params.noteId,
    isTrash: Boolean(trashMatch),
    /** Mobile Notes tab with no book chosen yet (D30). */
    isNotesHome: Boolean(notesHomeMatch),
    /** Mobile-only Settings screen (D30). */
    isSettings: Boolean(settingsMatch),
  };
}
