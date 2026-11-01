export type Book = {
  id: string;
  name: string;
  /** Key of BOOK_COLORS. */
  color: string;
  /** Key of BOOK_ICONS. */
  icon: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
};

export type BookInput = Pick<Book, "name" | "color" | "icon">;
