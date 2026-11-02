import { useState, type KeyboardEvent } from "react";
import { getMarkRange, useEditorState, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeHref, openLink } from "./links";

/** Placeholder href of a just-inserted link; the URL field gets focus. */
export const NEW_LINK_HREF = "https://";

const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * Floating bar above the link under the cursor (M5.7): Alias, Link, Open in new tab,
 * Remove (keeps the text), and the ⌥Enter hint.
 */
export function LinkBubble({ editor }: { editor: Editor }) {
  return (
    <BubbleMenu
      editor={editor}
      pluginKey="linkBubble"
      shouldShow={({ editor: e }) => e.isEditable && e.isActive("link")}
      options={{
        placement: "top-start",
        offset: 8,
        flip: true,
        shift: { padding: 8 },
      }}
      className="z-40"
    >
      <LinkBar editor={editor} />
    </BubbleMenu>
  );
}

function LinkBar({ editor }: { editor: Editor }) {
  const link = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e.isActive("link")) return null;
      const { state } = e;
      const range = getMarkRange(
        state.selection.$from,
        state.schema.marks.link,
      );
      if (!range) return null;
      return {
        from: range.from,
        to: range.to,
        href: String(e.getAttributes("link").href ?? ""),
        alias: state.doc.textBetween(range.from, range.to),
      };
    },
  });
  if (!link) return null;
  // Remount when another link is selected or the URL changes, so the fields reset.
  return (
    <LinkForm key={`${link.from}-${link.href}`} editor={editor} link={link} />
  );
}

type LinkInfo = { from: number; to: number; href: string; alias: string };

function LinkForm({ editor, link }: { editor: Editor; link: LinkInfo }) {
  const [alias, setAlias] = useState(link.alias);
  const [href, setHref] = useState(
    link.href === NEW_LINK_HREF ? "" : link.href,
  );
  const [invalid, setInvalid] = useState(false);
  const range = { from: link.from, to: link.to };

  const saveAlias = () => {
    const text = alias.trim() ? alias : link.alias;
    if (text === link.alias) return setAlias(link.alias);
    editor
      .chain()
      .insertContentAt(range, {
        type: "text",
        text,
        marks: [{ type: "link", attrs: { href: link.href } }],
      })
      .run();
  };

  const saveHref = () => {
    const next = normalizeHref(href);
    if (next === link.href) return;
    if (!next) {
      editor.chain().setTextSelection(range).unsetLink().run();
      return;
    }
    const ok = editor
      .chain()
      .setTextSelection(range)
      .setLink({ href: next })
      .run();
    setInvalid(!ok);
  };

  const remove = () => {
    editor.chain().focus().setTextSelection(range).unsetLink().run();
  };

  const onKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    save: () => void,
  ) => {
    if (event.key === "Enter" && event.altKey) {
      event.preventDefault();
      openLink(normalizeHref(href) || link.href);
    } else if (event.key === "Enter") {
      event.preventDefault();
      save();
      editor.commands.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      editor.commands.focus();
    }
  };

  return (
    <div
      role="group"
      aria-label="Edit link"
      className="flex max-w-[calc(100vw-1rem)] items-center gap-1.5 rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-lg"
    >
      <input
        value={alias}
        aria-label="Link text"
        placeholder="Text"
        className="h-8 w-28 min-w-0 rounded-md bg-muted px-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:w-36 sm:text-sm"
        onChange={(event) => setAlias(event.target.value)}
        onBlur={saveAlias}
        onKeyDown={(event) => onKeyDown(event, saveAlias)}
      />
      <input
        value={href}
        autoFocus={link.href === NEW_LINK_HREF}
        aria-label="Link URL"
        aria-invalid={invalid}
        placeholder="https://"
        inputMode="url"
        className="h-8 w-36 min-w-0 rounded-md bg-muted px-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring/50 aria-invalid:ring-2 aria-invalid:ring-destructive/50 sm:w-56 sm:text-sm"
        onChange={(event) => {
          setHref(event.target.value);
          setInvalid(false);
        }}
        onBlur={saveHref}
        onKeyDown={(event) => onKeyDown(event, saveHref)}
      />
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Open link in new tab"
        title="Open in new tab"
        onClick={() => openLink(normalizeHref(href) || link.href)}
      >
        <ExternalLink />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Remove link, keep text"
        title="Remove link"
        className="text-destructive"
        onClick={remove}
      >
        <Trash2 />
      </Button>
      <kbd className="hidden px-1 text-xs text-muted-foreground sm:inline">
        {isMac ? "⌥Enter" : "Alt+Enter"}
      </kbd>
    </div>
  );
}
