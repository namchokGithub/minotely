import { useMatch } from "react-router";

/** Book and note ids from the URL, readable from any component in the layout. */
export function useRouteIds() {
  const noteMatch = useMatch("/books/:bookId/notes/:noteId");
  const bookMatch = useMatch("/books/:bookId");
  return {
    bookId: noteMatch?.params.bookId ?? bookMatch?.params.bookId,
    noteId: noteMatch?.params.noteId,
  };
}
