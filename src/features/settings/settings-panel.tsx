import type { ReactNode } from "react";
import { Link } from "react-router";
import { ChevronRight, Monitor, Moon, Sun, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUid } from "@/features/auth/auth-context";
import { useUiStore, type ThemePreference } from "@/stores/ui-store";
import {
  updateSettings,
  useSettings,
  type FontFamily,
  type FontSize,
} from "./api";

const THEMES = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
] as const;
const FONTS: { value: FontFamily; label: string }[] = [
  { value: "sans", label: "Sans" },
  { value: "serif", label: "Serif" },
  { value: "mono", label: "Mono" },
];
const SIZES: { value: FontSize; label: string }[] = [
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
];

/** Mobile Settings screen (D30): theme, editor font and size, Trash. */
export function SettingsPanel() {
  const uid = useUid();
  const theme = useUiStore((state) => state.theme);
  const setTheme = useUiStore((state) => state.setTheme);
  const settings = useSettings();
  const save = (next: Parameters<typeof updateSettings>[1]) =>
    updateSettings(uid, next).catch((error) =>
      console.error("Saving settings failed", error),
    );

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center px-4">
        <h2 className="font-semibold">Settings</h2>
      </header>
      <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-6">
        <Segmented
          legend="Theme"
          name="theme"
          value={theme}
          options={THEMES.map((t) => ({
            value: t.value,
            label: (
              <>
                <t.icon className="size-4" aria-hidden /> {t.label}
              </>
            ),
          }))}
          onChange={(value) => setTheme(value as ThemePreference)}
        />
        <Segmented
          legend="Editor font"
          name="font"
          value={settings.fontFamily}
          options={FONTS}
          onChange={(value) => void save({ fontFamily: value as FontFamily })}
        />
        <Segmented
          legend="Text size"
          name="size"
          value={settings.fontSize}
          options={SIZES}
          onChange={(value) => void save({ fontSize: value as FontSize })}
        />
        <section aria-label="Data">
          <Link
            to="/trash"
            className="flex h-12 items-center gap-3 rounded-lg border px-3 text-sm transition-colors duration-150 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <Trash2 className="size-4" aria-hidden />
            <span className="flex-1">Trash</span>
            <ChevronRight
              className="size-4 text-muted-foreground"
              aria-hidden
            />
          </Link>
        </section>
      </div>
    </div>
  );
}

/** A labelled group of radio buttons styled as a segmented control. */
function Segmented({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: string;
  options: { value: string; label: ReactNode }[];
  onChange: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-lg bg-muted p-1">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-md text-sm transition-colors duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/50",
              value === option.value
                ? "bg-background font-medium shadow-sm"
                : "text-muted-foreground",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
