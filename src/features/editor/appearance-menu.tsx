import { Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUid } from "@/features/auth/auth-context";
import { setNotePaperStyle } from "@/features/notes/api";
import type { Note, PaperStyle } from "@/features/notes/types";
import {
  updateSettings,
  useSettings,
  type FontFamily,
  type FontSize,
} from "@/features/settings/api";

const PAPER: Record<PaperStyle, string> = {
  plain: "Plain",
  lined: "Lined",
  grid: "Grid",
  dotted: "Dotted",
};
const FONTS: Record<FontFamily, string> = {
  sans: "Sans",
  serif: "Serif",
  mono: "Mono",
};
const SIZES: Record<FontSize, string> = {
  sm: "Small",
  md: "Medium",
  lg: "Large",
};

function logError(action: string) {
  return (error: unknown) => console.error(`${action} failed`, error);
}

/** Paper style (per note) and typography (synced setting for all notes). */
export function AppearanceMenu({ note }: { note: Note }) {
  const uid = useUid();
  const settings = useSettings();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Page appearance"
          title="Page appearance"
          className="shrink-0"
        >
          <Type />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>Paper (this note)</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={note.paperStyle}
          onValueChange={(value) =>
            setNotePaperStyle(uid, note.id, value as PaperStyle).catch(
              logError("Paper style"),
            )
          }
        >
          {(Object.keys(PAPER) as PaperStyle[]).map((key) => (
            <DropdownMenuRadioItem key={key} value={key}>
              {PAPER[key]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Font (all notes)</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={settings.fontFamily}
          onValueChange={(value) =>
            updateSettings(uid, { fontFamily: value as FontFamily }).catch(
              logError("Font"),
            )
          }
        >
          {(Object.keys(FONTS) as FontFamily[]).map((key) => (
            <DropdownMenuRadioItem key={key} value={key}>
              {FONTS[key]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Size (all notes)</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={settings.fontSize}
          onValueChange={(value) =>
            updateSettings(uid, { fontSize: value as FontSize }).catch(
              logError("Font size"),
            )
          }
        >
          {(Object.keys(SIZES) as FontSize[]).map((key) => (
            <DropdownMenuRadioItem key={key} value={key}>
              {SIZES[key]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
