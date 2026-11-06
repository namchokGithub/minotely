import type { Editor } from "@tiptap/react";
import { toast } from "sonner";
import {
  Bold,
  BookPlus,
  Check,
  ClipboardPaste,
  Code2,
  Copy,
  Highlighter,
  EyeOff,
  Italic,
  Link2,
  ListTodo,
  Scissors,
  TextSelect,
} from "lucide-react";
import {
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";
import { shortcut } from "@/lib/shortcuts";
import { insertOrEditLink } from "./links";
import { copySelectionAsText } from "./copy-text";
import type { NoteSpellcheckController, SpellingTarget } from "./spellcheck";

/**
 * Right-click menu inside the note (M5.9): clipboard, the most used formatting, Select all. A locked note
 * offers only Copy and Select all.
 */
export function EditorContextItems({
  editor,
  spellingTarget,
  spellcheck,
  onSpellingAction,
}: {
  editor: Editor;
  spellingTarget: SpellingTarget | null;
  spellcheck: NoteSpellcheckController | null;
  onSpellingAction: () => void;
}) {
  const editable = editor.isEditable;
  const { empty } = editor.state.selection;
  // Cut uses the editor's DOM selection and its existing clipboard behavior.
  const cut = () => {
    editor.commands.focus();
    document.execCommand("cut");
  };
  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      editor.chain().focus().insertContent(text).run();
    } catch (error) {
      // Clipboard read needs permission; Ctrl/⌘+V always works.
      console.error("Paste failed", error);
    }
  };
  const chain = () => editor.chain().focus();
  const hint = (keys: string) => (
    <ContextMenuShortcut>{shortcut(keys).label}</ContextMenuShortcut>
  );

  return (
    <>
      {editable && spellingTarget && spellcheck && (
        <>
          <ContextMenuLabel>Spelling suggestions</ContextMenuLabel>
          {spellingTarget.suggestions.length ? (
            spellingTarget.suggestions.map((suggestion) => (
              <ContextMenuItem
                key={suggestion}
                onSelect={() => {
                  spellcheck.replace(spellingTarget, suggestion);
                  onSpellingAction();
                }}
              >
                <Check /> {suggestion}
              </ContextMenuItem>
            ))
          ) : (
            <ContextMenuItem disabled>No suggestions</ContextMenuItem>
          )}
          <ContextMenuItem
            onSelect={() => {
              if (!spellcheck.add(spellingTarget.error)) {
                toast.error("Could not add word to this device's dictionary");
              }
              onSpellingAction();
            }}
          >
            <BookPlus /> Add to dictionary
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() => {
              spellcheck.ignore(spellingTarget.error);
              onSpellingAction();
            }}
          >
            <EyeOff /> Ignore word
          </ContextMenuItem>
          <ContextMenuSeparator />
        </>
      )}
      {editable && (
        <ContextMenuItem disabled={empty} onSelect={cut}>
          <Scissors /> Cut {hint("Mod+X")}
        </ContextMenuItem>
      )}
      <ContextMenuItem
        disabled={empty}
        aria-keyshortcuts={shortcut("Mod+Alt+Shift+C").aria}
        onSelect={() => void copySelectionAsText(editor.view)}
      >
        <Copy /> Copy as text {hint("Mod+Alt+Shift+C")}
      </ContextMenuItem>
      {editable && (
        <ContextMenuItem onSelect={() => void paste()}>
          <ClipboardPaste /> Paste as text {hint("Mod+Shift+V")}
        </ContextMenuItem>
      )}
      {editable && (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={() => chain().toggleBold().run()}>
            <Bold /> Bold {hint("Mod+B")}
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => chain().toggleItalic().run()}>
            <Italic /> Italic {hint("Mod+I")}
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => chain().toggleHighlight().run()}>
            <Highlighter /> Highlight {hint("Mod+Shift+H")}
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => insertOrEditLink(editor)}>
            <Link2 /> {editor.isActive("link") ? "Edit link" : "Link"}{" "}
            {hint("Mod+K")}
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => chain().toggleTaskList().run()}>
            <ListTodo /> Checklist {hint("Mod+Shift+9")}
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => chain().toggleCodeBlock().run()}>
            <Code2 /> Code block {hint("Mod+Alt+C")}
          </ContextMenuItem>
        </>
      )}
      <ContextMenuSeparator />
      <ContextMenuItem onSelect={() => chain().selectAll().run()}>
        <TextSelect /> Select all {hint("Mod+A")}
      </ContextMenuItem>
    </>
  );
}
