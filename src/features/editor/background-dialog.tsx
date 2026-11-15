import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_PAGE_BACKGROUND,
  httpsUrl,
  savePageBackground,
  usePageBackground,
  type PageBackground,
} from "./page-background";

type BackgroundDialogProps = {
  uid: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Settings for the area around the page (D43). Not modal, so there is no dark
 * overlay and every change shows behind the dialog at once.
 */
export function BackgroundDialog({
  uid,
  open,
  onOpenChange,
}: BackgroundDialogProps) {
  const background = usePageBackground(uid);
  const [urlText, setUrlText] = useState(background.imageUrl);
  const id = useId();
  const urlInvalid = urlText.trim() !== "" && httpsUrl(urlText) === null;
  const hasBackground = Boolean(background.color || background.imageUrl);

  const update = (changes: Partial<PageBackground>) => {
    if (!savePageBackground(uid, { ...background, ...changes })) {
      toast.error("Could not save the background on this device");
    }
  };

  const editUrl = (text: string) => {
    setUrlText(text);
    if (!text.trim()) update({ imageUrl: "" });
    else {
      const url = httpsUrl(text);
      if (url) update({ imageUrl: url });
    }
  };

  const reset = () => {
    setUrlText("");
    update(DEFAULT_PAGE_BACKGROUND);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      {/* Not modal: focus moving elsewhere (the menu returning focus to its button,
          the color picker) must not close it. A click outside still does. */}
      <DialogContent
        className="shadow-lg"
        onFocusOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Background</DialogTitle>
          <DialogDescription>
            The area around the page, for all notes on this device. Shown on
            screens wider than the page.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor={`${id}-color`}>Color</label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {background.color ?? "Theme"}
              </span>
              <input
                id={`${id}-color`}
                type="color"
                value={background.color ?? "#ffffff"}
                className="h-8 w-10 cursor-pointer rounded-lg border border-input bg-transparent p-0.5"
                onChange={(event) => update({ color: event.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-1">
            <label htmlFor={`${id}-url`}>Image URL</label>
            <Input
              id={`${id}-url`}
              type="url"
              inputMode="url"
              value={urlText}
              placeholder="https://…"
              maxLength={2000}
              aria-invalid={urlInvalid}
              aria-describedby={`${id}-url-hint`}
              onChange={(event) => editUrl(event.target.value)}
            />
            <p
              id={`${id}-url-hint`}
              className="text-xs text-muted-foreground"
              role={urlInvalid ? "alert" : undefined}
            >
              {urlInvalid
                ? "Use a link that starts with https://"
                : "The image loads from that site each time a note opens."}
            </p>
          </div>

          <div className="grid gap-1">
            <label
              htmlFor={`${id}-opacity`}
              className="flex justify-between gap-3"
            >
              Opacity
              <span className="text-xs text-muted-foreground">
                {background.opacity}%
              </span>
            </label>
            <input
              id={`${id}-opacity`}
              type="range"
              min={0}
              max={100}
              value={background.opacity}
              disabled={!hasBackground}
              className="w-full accent-primary disabled:opacity-50"
              onChange={(event) =>
                update({ opacity: Number(event.target.value) })
              }
            />
          </div>

          <div className="grid gap-1">
            <label
              htmlFor={`${id}-brightness`}
              className="flex justify-between gap-3"
            >
              Darker / Lighter
              <span className="text-xs text-muted-foreground">
                {background.brightness > 0 ? "+" : ""}
                {background.brightness}
              </span>
            </label>
            <input
              id={`${id}-brightness`}
              type="range"
              min={-100}
              max={100}
              value={background.brightness}
              disabled={!hasBackground}
              className="w-full accent-primary disabled:opacity-50"
              onChange={(event) =>
                update({ brightness: Number(event.target.value) })
              }
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            className="justify-self-start"
            onClick={reset}
          >
            Reset to theme
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
