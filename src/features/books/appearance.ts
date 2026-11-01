import {
  Book,
  BookOpen,
  Briefcase,
  Code,
  Coffee,
  Database,
  Folder,
  Gamepad2,
  GraduationCap,
  Heart,
  Leaf,
  Lightbulb,
  Music,
  Notebook,
  Sparkles,
  Star,
  type LucideIcon,
} from "lucide-react";

/** Stored as `color` on a book. Classes are static so Tailwind keeps them. */
export const BOOK_COLORS = {
  gray: { label: "Gray", text: "text-zinc-500", swatch: "bg-zinc-500" },
  red: { label: "Red", text: "text-red-500", swatch: "bg-red-500" },
  orange: { label: "Orange", text: "text-orange-500", swatch: "bg-orange-500" },
  amber: { label: "Amber", text: "text-amber-500", swatch: "bg-amber-500" },
  green: { label: "Green", text: "text-green-500", swatch: "bg-green-500" },
  teal: { label: "Teal", text: "text-teal-500", swatch: "bg-teal-500" },
  blue: { label: "Blue", text: "text-blue-500", swatch: "bg-blue-500" },
  indigo: { label: "Indigo", text: "text-indigo-500", swatch: "bg-indigo-500" },
  purple: { label: "Purple", text: "text-purple-500", swatch: "bg-purple-500" },
  pink: { label: "Pink", text: "text-pink-500", swatch: "bg-pink-500" },
} as const;

export type BookColor = keyof typeof BOOK_COLORS;

/** Stored as `icon` on a book. */
export const BOOK_ICONS = {
  book: Book,
  "book-open": BookOpen,
  notebook: Notebook,
  folder: Folder,
  code: Code,
  database: Database,
  lightbulb: Lightbulb,
  sparkles: Sparkles,
  briefcase: Briefcase,
  "graduation-cap": GraduationCap,
  gamepad: Gamepad2,
  music: Music,
  heart: Heart,
  star: Star,
  coffee: Coffee,
  leaf: Leaf,
} satisfies Record<string, LucideIcon>;

export type BookIcon = keyof typeof BOOK_ICONS;

export const DEFAULT_BOOK_COLOR: BookColor = "blue";
export const DEFAULT_BOOK_ICON: BookIcon = "book";

export function bookColorClass(color: string): string {
  return (BOOK_COLORS[color as BookColor] ?? BOOK_COLORS.gray).text;
}

export function bookIcon(icon: string): LucideIcon {
  return BOOK_ICONS[icon as BookIcon] ?? Book;
}
