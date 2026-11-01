import { BookOpen, LogOut, Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-context";
import { useUiStore, type ThemePreference } from "@/stores/ui-store";

const NEXT_THEME: Record<ThemePreference, ThemePreference> = {
  system: "light",
  light: "dark",
  dark: "system",
};
const THEME_ICON = { system: Monitor, light: Sun, dark: Moon };

export function BooksPanel() {
  const { user, signOut } = useAuth();
  const theme = useUiStore((state) => state.theme);
  const setTheme = useUiStore((state) => state.setTheme);
  const ThemeIcon = THEME_ICON[theme];

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <header className="flex h-14 items-center gap-2 px-4">
        <BookOpen className="size-5" />
        <h2 className="font-semibold">My Library</h2>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-muted-foreground">
        No books yet.
      </div>

      <footer className="flex items-center gap-1 border-t px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          {user?.email}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Theme: ${theme}`}
          title={`Theme: ${theme}`}
          onClick={() => setTheme(NEXT_THEME[theme])}
        >
          <ThemeIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Sign out"
          title="Sign out"
          onClick={() => void signOut()}
        >
          <LogOut />
        </Button>
      </footer>
    </div>
  );
}
