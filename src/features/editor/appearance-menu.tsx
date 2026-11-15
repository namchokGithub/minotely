import { Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { dropdownKit, type MenuKit } from "@/components/menu-kit";
import { useUid } from "@/features/auth/auth-context";
import { setNotePaperStyle } from "@/features/notes/api";
import type { Note, PaperStyle } from "@/features/notes/types";
import {
  updateSettings,
  useSettings,
  type FontFamily,
  type FontSize,
} from "@/features/settings/api";
import { useUiStore } from "@/stores/ui-store";
import { PAGE_WIDTHS, type PageWidth } from "./page-width";
import { CODE_THEMES, type CodeTheme } from "./code-theme";

const PAPER: Record<PaperStyle, string> = {
  plain: "Plain",
  margin: "Margin",
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

type AppearanceItemsProps = {
  kit: MenuKit;
  note: Note;
  /** "Background…" was chosen; the dialog opens once the menu has closed (D43). */
  onBackground: () => void;
};

/**
 * Paper style (per note), page width (this device, D45), typography (synced
 * setting for all notes) and the background around the page (this device, D43). One list for the header
 * button and the right-click menu on the background (D26).
 */
export function AppearanceItems({
  kit: k,
  note,
  onBackground,
}: AppearanceItemsProps) {
  const uid = useUid();
  const settings = useSettings();
  const pageWidth = useUiStore((state) => state.pageWidth);
  const setPageWidth = useUiStore((state) => state.setPageWidth);
  const codeTheme = useUiStore((state) => state.codeTheme);
  const setCodeTheme = useUiStore((state) => state.setCodeTheme);

  return (
    <>
      <k.Label>Paper (this note)</k.Label>
      <k.RadioGroup
        value={note.paperStyle}
        onValueChange={(value) =>
          setNotePaperStyle(uid, note.id, value as PaperStyle).catch(
            logError("Paper style"),
          )
        }
      >
        {(Object.keys(PAPER) as PaperStyle[]).map((key) => (
          <k.RadioItem key={key} value={key}>
            {PAPER[key]}
          </k.RadioItem>
        ))}
      </k.RadioGroup>
      <k.Separator />
      <k.Label>Page width (this device)</k.Label>
      <k.RadioGroup
        value={pageWidth}
        onValueChange={(value) => setPageWidth(value as PageWidth)}
      >
        {(Object.keys(PAGE_WIDTHS) as PageWidth[]).map((key) => (
          <k.RadioItem key={key} value={key}>
            {PAGE_WIDTHS[key].label}
          </k.RadioItem>
        ))}
      </k.RadioGroup>
      <k.Separator />
      <k.Label>Font (all notes)</k.Label>
      <k.RadioGroup
        value={settings.fontFamily}
        onValueChange={(value) =>
          updateSettings(uid, { fontFamily: value as FontFamily }).catch(
            logError("Font"),
          )
        }
      >
        {(Object.keys(FONTS) as FontFamily[]).map((key) => (
          <k.RadioItem key={key} value={key}>
            {FONTS[key]}
          </k.RadioItem>
        ))}
      </k.RadioGroup>
      <k.Separator />
      <k.Label>Size (all notes)</k.Label>
      <k.RadioGroup
        value={settings.fontSize}
        onValueChange={(value) =>
          updateSettings(uid, { fontSize: value as FontSize }).catch(
            logError("Font size"),
          )
        }
      >
        {(Object.keys(SIZES) as FontSize[]).map((key) => (
          <k.RadioItem key={key} value={key}>
            {SIZES[key]}
          </k.RadioItem>
        ))}
      </k.RadioGroup>
      <k.Separator />
      <k.Sub>
        <k.SubTrigger>Code block color</k.SubTrigger>
        <k.SubContent>
          <k.RadioGroup
            value={codeTheme}
            onValueChange={(value) => setCodeTheme(value as CodeTheme)}
          >
            {(Object.keys(CODE_THEMES) as CodeTheme[]).map((key) => (
              <k.RadioItem key={key} value={key}>
                {CODE_THEMES[key]}
              </k.RadioItem>
            ))}
          </k.RadioGroup>
        </k.SubContent>
      </k.Sub>
      <k.Item onSelect={onBackground}>Background…</k.Item>
    </>
  );
}

type AppearanceMenuProps = Omit<AppearanceItemsProps, "kit"> & {
  /** Runs when the menu has closed, before focus returns to the button. */
  onCloseAutoFocus: (event: Event) => void;
};

/** Header button for the appearance menu. */
export function AppearanceMenu({
  note,
  onBackground,
  onCloseAutoFocus,
}: AppearanceMenuProps) {
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
      <DropdownMenuContent
        align="end"
        className="w-44"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <AppearanceItems
          kit={dropdownKit}
          note={note}
          onBackground={onBackground}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
